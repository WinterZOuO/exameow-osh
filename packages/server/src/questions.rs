//! 共享題庫（W6）
//!
//! - 題庫**掛喺課程底下、課程內所有成員共享**（同教材唔同 —— 教材原文私有，
//!   題目一入庫就係大家見到嘅嘢，見 §6.2/D9）
//! - 生成流程冧留喺前端（`stores/exam.ts`，批次、chunk 切分嗰套照舊），
//!   呢個模組淨係負責「生成完之後點存」：`POST .../questions/bulk` 一次過
//!   bulk insert 一批題目，撞 `(course_id, stem_hash)` 嘅重複題直接
//!   `INSERT OR IGNORE` 拋走 —— 唔同用戶用同一份筆記生成，唔會入兩次
//! - `material_id` 純粹記低「呢批題目係邊份教材生成」，得選咗**單一**教材生成
//!   先會有值（幾份一齊生成冇一個明確嘅出處，留 NULL）；要生成就要有權睇到
//!   嗰份教材（上傳者本人或 admin）—— 同 materials.rs 嘅 ACL 一致
//! - 呢個模組刻意冇 flag / hide / 抽題練習 —— 嗰啲留返 W7（design.md §8）
//!
//! **W7 補充**：`list_questions_handler` 加多咗 `flag_count`（呢條題俾幾多
//! 個人 🚩 咗）同 `flagged_by_me`（自己有冇標記過）——寫入/toggle 呢兩樣嘢
//! 嘅路由喺 `attempts.rs`（同 `attempts` 表擺埋一齊，因為兩樣都係「答完/
//! 睇完一條題之後嘅動作」，唔屬於「呢個模組」原本嘅 bulk-insert/list 職責）

use axum::{
    extract::{Path, State},
    http::StatusCode,
    Extension, Json,
};
use exameow_core::exam::Question;
use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
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

/// 一次過最多入幾多題 —— 攔住手殘/亂改 request body 塞爆張表
const MAX_BULK_QUESTIONS: usize = 500;

/// 去重淨係睇題幹嘅「內容」，唔理空白位多寡 —— trim + 摺埋連續空白 + 轉細楷
/// （轉細楷對中文冇影響，對英文題幹先有用）
fn normalize_stem(stem: &str) -> String {
    stem.split_whitespace().collect::<Vec<_>>().join(" ").to_lowercase()
}

fn stem_hash(stem: &str) -> String {
    format!("{:x}", Sha256::digest(normalize_stem(stem).as_bytes()))
}

// ---------------------------------------------------------------- schema

pub fn init_schema(db: &Mutex<Connection>) -> Result<(), String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS questions (
           id             TEXT PRIMARY KEY,
           course_id      TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
           material_id    TEXT REFERENCES materials(id) ON DELETE SET NULL,
           contributor_id TEXT NOT NULL REFERENCES users(id),
           type           TEXT NOT NULL,
           stem           TEXT NOT NULL,
           options        TEXT NOT NULL,
           answer         TEXT NOT NULL,
           analysis       TEXT NOT NULL DEFAULT '',
           ai_analysis    TEXT,
           score          REAL,
           status         TEXT NOT NULL DEFAULT 'active',
           stem_hash      TEXT NOT NULL,
           created_at     INTEGER NOT NULL
         );
         CREATE UNIQUE INDEX IF NOT EXISTS idx_q_course_hash ON questions(course_id, stem_hash);
         CREATE INDEX IF NOT EXISTS idx_q_course_status ON questions(course_id, status);",
    )
    .map_err(|e| e.to_string())
}

// ---------------------------------------------------------------- 型別

#[derive(Serialize)]
pub struct SharedQuestion {
    pub id: String,
    pub course_id: String,
    pub material_id: Option<String>,
    pub contributor_id: String,
    pub contributor_username: String,
    #[serde(rename = "type")]
    pub qtype: String,
    pub stem: String,
    pub options: Vec<String>,
    pub answer: String,
    pub analysis: String,
    #[serde(rename = "aiAnalysis", skip_serializing_if = "Option::is_none")]
    pub ai_analysis: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub score: Option<f64>,
    pub status: String,
    pub created_at: i64,
    /// 俾幾多個唔同用戶 🚩 咗（W7）——信任小組入面唔遮呢個數,等人手決定
    /// 使唔使用 sqlite3 CLI 手動隱藏,見 design.md §10
    pub flag_count: i64,
    pub flagged_by_me: bool,
}

#[derive(Deserialize)]
pub struct BulkInsertRequest {
    /// 得生成自單一教材先有值 —— 見上面模組註解
    #[serde(default)]
    pub material_id: Option<String>,
    pub questions: Vec<Question>,
}

#[derive(Serialize)]
pub struct BulkInsertResult {
    pub inserted: usize,
    /// 撞咗 `(course_id, stem_hash)` 俾 `INSERT OR IGNORE` 拋走嘅題數
    pub duplicates: usize,
    /// 題幹淨係空白，冇入都唔算重複嘅題數
    pub skipped: usize,
}

// ---------------------------------------------------------------- handlers

pub async fn bulk_insert_questions_handler(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<CurrentUser>,
    Path(course_id): Path<String>,
    Json(req): Json<BulkInsertRequest>,
) -> Result<Json<BulkInsertResult>, Err> {
    if req.questions.is_empty() {
        return Err(err(StatusCode::BAD_REQUEST, "questions is empty"));
    }
    if req.questions.len() > MAX_BULK_QUESTIONS {
        return Err(err(StatusCode::BAD_REQUEST, "too many questions in one batch"));
    }

    let conn = state.db().lock().map_err(db_err)?;
    require_member(&conn, &course_id, &user.id)?;

    // material_id 有值 —— 要先確認呢份教材屬於呢個課程,而且用戶有權睇（上傳者/admin），
    // 同 materials.rs 嘅 ACL 一致：唔係就當「唔存在」，唔畀人靠呢條 endpoint 掃到
    // 其他人嘅 material_id 存唔存在
    if let Some(mid) = &req.material_id {
        let row: Option<(String, String)> = conn
            .query_row(
                "SELECT course_id, uploader_id FROM materials WHERE id = ?1",
                params![mid],
                |r| Ok((r.get(0)?, r.get(1)?)),
            )
            .optional()
            .map_err(db_err)?;
        let (m_course_id, uploader_id) =
            row.ok_or_else(|| err(StatusCode::NOT_FOUND, "material not found"))?;
        if m_course_id != course_id {
            return Err(err(StatusCode::NOT_FOUND, "material not found"));
        }
        if uploader_id != user.id && !user.is_admin() {
            return Err(err(StatusCode::FORBIDDEN, "material is private to its uploader"));
        }
    }

    let now = now_ms();
    let mut inserted = 0usize;
    let mut duplicates = 0usize;
    let mut skipped = 0usize;

    {
        let mut stmt = conn
            .prepare(
                "INSERT OR IGNORE INTO questions
                   (id, course_id, material_id, contributor_id, type, stem, options,
                    answer, analysis, ai_analysis, score, status, stem_hash, created_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, 'active', ?12, ?13)",
            )
            .map_err(db_err)?;

        for q in &req.questions {
            let stem = q.stem.trim();
            if stem.is_empty() {
                skipped += 1;
                continue;
            }
            let options_json = serde_json::to_string(&q.options).map_err(db_err)?;
            let id = uuid::Uuid::new_v4().to_string();
            let changed = stmt
                .execute(params![
                    id,
                    course_id,
                    req.material_id,
                    user.id,
                    q.qtype.to_string(),
                    stem,
                    options_json,
                    q.answer,
                    q.analysis,
                    q.ai_analysis,
                    q.score,
                    stem_hash(stem),
                    now
                ])
                .map_err(db_err)?;
            if changed > 0 {
                inserted += 1;
            } else {
                duplicates += 1;
            }
        }
    }

    Ok(Json(BulkInsertResult { inserted, duplicates, skipped }))
}

pub async fn list_questions_handler(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<CurrentUser>,
    Path(course_id): Path<String>,
) -> Result<Json<Vec<SharedQuestion>>, Err> {
    let conn = state.db().lock().map_err(db_err)?;
    require_member(&conn, &course_id, &user.id)?;

    let mut stmt = conn
        .prepare(
            "SELECT q.id, q.course_id, q.material_id, q.contributor_id, u.username,
                    q.type, q.stem, q.options, q.answer, q.analysis, q.ai_analysis,
                    q.score, q.status, q.created_at,
                    (SELECT COUNT(*) FROM question_flags qf WHERE qf.question_id = q.id),
                    EXISTS(SELECT 1 FROM question_flags qf2
                            WHERE qf2.question_id = q.id AND qf2.user_id = ?2)
               FROM questions q JOIN users u ON u.id = q.contributor_id
              WHERE q.course_id = ?1 AND q.status = 'active'
              ORDER BY q.created_at DESC",
        )
        .map_err(db_err)?;
    let rows = stmt
        .query_map(params![course_id, user.id], |r| {
            let options_json: String = r.get(7)?;
            let options: Vec<String> = serde_json::from_str(&options_json).unwrap_or_default();
            Ok(SharedQuestion {
                id: r.get(0)?,
                course_id: r.get(1)?,
                material_id: r.get(2)?,
                contributor_id: r.get(3)?,
                contributor_username: r.get(4)?,
                qtype: r.get(5)?,
                stem: r.get(6)?,
                options,
                answer: r.get(8)?,
                analysis: r.get(9)?,
                ai_analysis: r.get(10)?,
                score: r.get(11)?,
                status: r.get(12)?,
                created_at: r.get(13)?,
                flag_count: r.get(14)?,
                flagged_by_me: r.get(15)?,
            })
        })
        .map_err(db_err)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(db_err)?;

    Ok(Json(rows))
}

// ---------------------------------------------------------------- tests

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalize_stem_ignores_whitespace_differences() {
        assert_eq!(normalize_stem("What  is\tthe answer?"), normalize_stem("what is the answer?"));
        assert_eq!(normalize_stem("  trim me  "), normalize_stem("trim me"));
    }

    #[test]
    fn stem_hash_is_stable_and_distinguishes_content() {
        assert_eq!(stem_hash("Same question"), stem_hash("  same   question  "));
        assert_ne!(stem_hash("Question A"), stem_hash("Question B"));
    }
}
