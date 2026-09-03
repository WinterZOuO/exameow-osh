//! 教材上傳同 ACL（W5）
//!
//! - 教材原文**只有上傳者本人同 admin 睇得到**。其他課程成員連「呢個課程有邊啲
//!   教材」都唔應該見到 —— `list` 對非 admin 淨係回自己上傳嗰啲，唔會漏出
//!   同課同學上傳咗啲乜（見 §6.2/§11 D11）
//! - 淨係接受 `.md` / `.markdown` —— 第一版嘅教材來源就係手打嘅 Markdown 筆記，
//!   縮窄接受格式好過重用 `/api/generate` 嗰種「乜格式都試下」嘅寬鬆處理。
//!   `parser` 已經支援 `.md`（當純文字讀），唔使改
//! - 兩層 ACL 要分開諗：唔係課程成員 → 當「唔存在」（同 courses.rs 一樣嘅
//!   404 統一處理）；係成員但唔係上傳者/admin → 403（明確話俾你知「呢樣嘢私有」，
//!   同課程存唔存在冇關，唔使再遮埋）

use axum::{
    extract::{Multipart, Path, State},
    http::StatusCode,
    Extension, Json,
};
use exameow_core::parser::parse_file;
use rusqlite::{params, Connection, OptionalExtension};
use serde::Serialize;
use sha2::{Digest, Sha256};
use std::io::Write;
use std::sync::{Arc, Mutex};

use crate::auth::CurrentUser;
use crate::courses::require_member;
use crate::routes::AppState;

type Err = (StatusCode, String);

fn err(status: StatusCode, code: &str) -> Err {
    (status, serde_json::json!({ "error": code }).to_string())
}

fn db_err<E: std::fmt::Display>(e: E) -> Err {
    err(StatusCode::INTERNAL_SERVER_ERROR, &format!("db error: {e}"))
}

fn now_ms() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

/// 課堂筆記,唔應該去到幾 MB —— 1c1g VPS + SQLite 單寫入者,大檔冇著數,
/// 仲要諗埋 W6 生成題目會成份塞入 LLM prompt
const MAX_CONTENT_LEN: usize = 300_000;

fn is_markdown_filename(name: &str) -> bool {
    let lower = name.to_lowercase();
    lower.ends_with(".md") || lower.ends_with(".markdown")
}

// ---------------------------------------------------------------- schema

pub fn init_schema(db: &Mutex<Connection>) -> Result<(), String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS materials (
           id          TEXT PRIMARY KEY,
           course_id   TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
           uploader_id TEXT NOT NULL REFERENCES users(id),
           filename    TEXT NOT NULL,
           content     TEXT NOT NULL,
           sha256      TEXT NOT NULL,
           created_at  INTEGER NOT NULL
         );
         CREATE UNIQUE INDEX IF NOT EXISTS idx_material_dedup
           ON materials(course_id, uploader_id, sha256);
         CREATE INDEX IF NOT EXISTS idx_materials_course ON materials(course_id);",
    )
    .map_err(|e| e.to_string())
}

// ---------------------------------------------------------------- 型別

/// 列表用嘅摘要 —— 刻意冇 `content`，唔想個列表 endpoint 順手漏埋原文
#[derive(Serialize)]
pub struct MaterialSummary {
    pub id: String,
    pub course_id: String,
    pub uploader_id: String,
    pub uploader_username: String,
    pub filename: String,
    pub sha256: String,
    pub size: i64,
    pub created_at: i64,
}

#[derive(Serialize)]
pub struct MaterialDetail {
    #[serde(flatten)]
    pub summary: MaterialSummary,
    pub content: String,
}

fn load_summary(conn: &Connection, id: &str) -> Result<MaterialSummary, Err> {
    conn.query_row(
        "SELECT m.id, m.course_id, m.uploader_id, u.username, m.filename, m.sha256,
                LENGTH(CAST(m.content AS BLOB)), m.created_at
           FROM materials m JOIN users u ON u.id = m.uploader_id
          WHERE m.id = ?1",
        params![id],
        |r| {
            Ok(MaterialSummary {
                id: r.get(0)?,
                course_id: r.get(1)?,
                uploader_id: r.get(2)?,
                uploader_username: r.get(3)?,
                filename: r.get(4)?,
                sha256: r.get(5)?,
                size: r.get(6)?,
                created_at: r.get(7)?,
            })
        },
    )
    .map_err(db_err)
}

// ---------------------------------------------------------------- handlers

pub async fn upload_material_handler(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<CurrentUser>,
    Path(course_id): Path<String>,
    mut multipart: Multipart,
) -> Result<Json<MaterialSummary>, Err> {
    {
        let conn = state.db().lock().map_err(db_err)?;
        require_member(&conn, &course_id, &user.id)?;
    }

    let mut file_name = String::new();
    let mut file_data: Option<Vec<u8>> = None;
    while let Ok(Some(field)) = multipart.next_field().await {
        if field.name() == Some("file") {
            file_name = field.file_name().unwrap_or("material.md").to_string();
            file_data = Some(
                field
                    .bytes()
                    .await
                    .map_err(|e| err(StatusCode::BAD_REQUEST, &e.to_string()))?
                    .to_vec(),
            );
        }
    }
    let file_data = file_data.ok_or_else(|| err(StatusCode::BAD_REQUEST, "no file uploaded"))?;

    if !is_markdown_filename(&file_name) {
        return Err(err(StatusCode::BAD_REQUEST, "only .md files are accepted"));
    }
    // 喺解碼之前就攔 —— 千祈唔好幫個大 binary 檔做晒編碼偵測先話你知太大
    if file_data.len() > MAX_CONTENT_LEN {
        return Err(err(StatusCode::PAYLOAD_TOO_LARGE, "file too large"));
    }

    // 借用 core 現成嘅 parser —— 會做編碼偵測（UTF-8/UTF-16/GB18030）、去 BOM、
    // 拒絕 binary 或空檔，唔使自己重寫一次
    let mut temp_file = tempfile::Builder::new()
        .suffix(".md")
        .tempfile()
        .map_err(|e| err(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()))?;
    temp_file
        .write_all(&file_data)
        .map_err(|e| err(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()))?;
    let (_, temp_path) = temp_file
        .keep()
        .map_err(|e| err(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()))?;
    let temp_path_str = temp_path.to_string_lossy().to_string();
    let parsed = parse_file(&temp_path_str).map_err(|e| err(StatusCode::BAD_REQUEST, &e.to_string()));
    let _ = std::fs::remove_file(&temp_path_str);
    let content = parsed?;

    if content.len() > MAX_CONTENT_LEN {
        return Err(err(StatusCode::PAYLOAD_TOO_LARGE, "file too large"));
    }

    let sha256 = format!("{:x}", Sha256::digest(content.as_bytes()));

    let conn = state.db().lock().map_err(db_err)?;
    // 同一上傳者、同一課程、內容完全一樣 —— 幂等，唔重複入（撞 idx_material_dedup）
    let existing_id: Option<String> = conn
        .query_row(
            "SELECT id FROM materials WHERE course_id = ?1 AND uploader_id = ?2 AND sha256 = ?3",
            params![course_id, user.id, sha256],
            |r| r.get(0),
        )
        .optional()
        .map_err(db_err)?;

    let id = match existing_id {
        Some(id) => id,
        None => {
            let id = uuid::Uuid::new_v4().to_string();
            conn.execute(
                "INSERT INTO materials (id, course_id, uploader_id, filename, content, sha256, created_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                params![id, course_id, user.id, file_name, content, sha256, now_ms()],
            )
            .map_err(db_err)?;
            id
        }
    };

    Ok(Json(load_summary(&conn, &id)?))
}

pub async fn list_materials_handler(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<CurrentUser>,
    Path(course_id): Path<String>,
) -> Result<Json<Vec<MaterialSummary>>, Err> {
    let conn = state.db().lock().map_err(db_err)?;
    require_member(&conn, &course_id, &user.id)?;

    // admin 見晒全部；其他成員淨係見自己上傳嘅 —— 原文私有,連檔名/上傳者
    // 呢啲 metadata 都唔畀其他成員睇晒
    let rows = if user.is_admin() {
        let mut stmt = conn
            .prepare(
                "SELECT m.id, m.course_id, m.uploader_id, u.username, m.filename, m.sha256,
                        LENGTH(CAST(m.content AS BLOB)), m.created_at
                   FROM materials m JOIN users u ON u.id = m.uploader_id
                  WHERE m.course_id = ?1
                  ORDER BY m.created_at DESC",
            )
            .map_err(db_err)?;
        let mapped = stmt
            .query_map(params![course_id], row_to_summary)
            .map_err(db_err)?
            .collect::<Result<Vec<_>, _>>()
            .map_err(db_err)?;
        mapped
    } else {
        let mut stmt = conn
            .prepare(
                "SELECT m.id, m.course_id, m.uploader_id, u.username, m.filename, m.sha256,
                        LENGTH(CAST(m.content AS BLOB)), m.created_at
                   FROM materials m JOIN users u ON u.id = m.uploader_id
                  WHERE m.course_id = ?1 AND m.uploader_id = ?2
                  ORDER BY m.created_at DESC",
            )
            .map_err(db_err)?;
        let mapped = stmt
            .query_map(params![course_id, user.id], row_to_summary)
            .map_err(db_err)?
            .collect::<Result<Vec<_>, _>>()
            .map_err(db_err)?;
        mapped
    };

    Ok(Json(rows))
}

fn row_to_summary(r: &rusqlite::Row) -> rusqlite::Result<MaterialSummary> {
    Ok(MaterialSummary {
        id: r.get(0)?,
        course_id: r.get(1)?,
        uploader_id: r.get(2)?,
        uploader_username: r.get(3)?,
        filename: r.get(4)?,
        sha256: r.get(5)?,
        size: r.get(6)?,
        created_at: r.get(7)?,
    })
}

pub async fn get_material_handler(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<CurrentUser>,
    Path(id): Path<String>,
) -> Result<Json<MaterialDetail>, Err> {
    let conn = state.db().lock().map_err(db_err)?;

    let row: Option<(String, String, String, String, String, i64)> = conn
        .query_row(
            "SELECT course_id, uploader_id, filename, content, sha256, created_at
               FROM materials WHERE id = ?1",
            params![id],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?, r.get(4)?, r.get(5)?)),
        )
        .optional()
        .map_err(db_err)?;

    let (course_id, uploader_id, filename, content, sha256, created_at) =
        row.ok_or_else(|| err(StatusCode::NOT_FOUND, "material not found"))?;

    // 唔係呢個課程嘅成員 —— 當「唔存在」，唔好用呢個 404/403 分野漏埋 course_id 存唔存在
    require_member(&conn, &course_id, &user.id)?;

    // 係成員，但唔係上傳者本人又唔係 admin —— 原文私有
    if uploader_id != user.id && !user.is_admin() {
        return Err(err(StatusCode::FORBIDDEN, "material is private to its uploader"));
    }

    let uploader_username: String = conn
        .query_row(
            "SELECT username FROM users WHERE id = ?1",
            params![uploader_id],
            |r| r.get(0),
        )
        .map_err(db_err)?;

    Ok(Json(MaterialDetail {
        summary: MaterialSummary {
            id,
            course_id,
            uploader_id,
            uploader_username,
            filename,
            sha256,
            size: content.len() as i64,
            created_at,
        },
        content,
    }))
}

pub async fn delete_material_handler(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<CurrentUser>,
    Path(id): Path<String>,
) -> Result<StatusCode, Err> {
    let conn = state.db().lock().map_err(db_err)?;

    let row: Option<(String, String)> = conn
        .query_row(
            "SELECT course_id, uploader_id FROM materials WHERE id = ?1",
            params![id],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )
        .optional()
        .map_err(db_err)?;
    let (course_id, uploader_id) = row.ok_or_else(|| err(StatusCode::NOT_FOUND, "material not found"))?;

    require_member(&conn, &course_id, &user.id)?;
    if uploader_id != user.id && !user.is_admin() {
        return Err(err(StatusCode::FORBIDDEN, "material is private to its uploader"));
    }

    let n = conn
        .execute("DELETE FROM materials WHERE id = ?1", params![id])
        .map_err(db_err)?;
    if n == 0 {
        return Err(err(StatusCode::NOT_FOUND, "material not found"));
    }
    // W6：questions.material_id 會 reference 呢張表。SQLite 冇開 foreign_keys，
    // `ON DELETE SET NULL` 唔會自動生效（同 courses.rs 刪 course 嗰個教訓一樣），
    // 要手動清 —— 題目本身唔跟住刪，淨係斷返個出處連結
    conn.execute(
        "UPDATE questions SET material_id = NULL WHERE material_id = ?1",
        params![id],
    )
    .map_err(db_err)?;
    Ok(StatusCode::NO_CONTENT)
}

// ---------------------------------------------------------------- tests

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_only_markdown_extensions() {
        assert!(is_markdown_filename("notes.md"));
        assert!(is_markdown_filename("Notes.MD"));
        assert!(is_markdown_filename("chapter1.markdown"));
        assert!(!is_markdown_filename("notes.txt"));
        assert!(!is_markdown_filename("notes.pdf"));
        assert!(!is_markdown_filename("md"));
        assert!(!is_markdown_filename(""));
    }
}
