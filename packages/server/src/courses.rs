//! 課程同成員（W4）
//!
//! - 任何已登入用戶都可以開新課程，開課嗰個自動成為 `owner`
//! - 其他人憑 `join_code` 加入，成為 `member`
//! - 所有課程範圍嘅路由都要先查成員資格 —— 唔係成員就當呢個課程唔存在
//!   （同 login 嗰句「用戶唔存在」同「密碼錯」一樣，唔畀人靠錯誤訊息分辨
//!   出「呢個課程存唔存在」同「你唔係成員」）

use axum::{
    extract::{Path, State},
    http::StatusCode,
    Extension, Json,
};
use rand::Rng;
use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};

use crate::auth::CurrentUser;
use crate::routes::AppState;

/// 淨係用有辨識度嘅字元 —— 冇 0/O/1/I，讀出嚟／打入去唔會撞
const CODE_ALPHABET: &[u8] = b"ABCDEFGHJKMNPQRSTUVWXYZ23456789";
/// 8 個字：32^8 ≈ 1.1 萬億種組合。join_code 长期有效，
/// 揸住就入得課程、見到共享題庫，所以要夠長，唔可以同 exam 嗰種即棄 6 碼比
const JOIN_CODE_LEN: usize = 8;

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

fn gen_join_code() -> String {
    let mut rng = rand::thread_rng();
    (0..JOIN_CODE_LEN)
        .map(|_| CODE_ALPHABET[rng.gen_range(0..CODE_ALPHABET.len())] as char)
        .collect()
}

/// join_code 淨係識呢個字元集，用戶貼嘢入嚟時可能連埋空格／小楷／分隔號，
/// 正規化之後先查
fn normalize_join_code(raw: &str) -> String {
    raw.chars()
        .filter(|c| c.is_ascii_alphanumeric())
        .collect::<String>()
        .to_uppercase()
}

// ---------------------------------------------------------------- schema

pub fn init_schema(db: &Mutex<Connection>) -> Result<(), String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS courses (
           id         TEXT PRIMARY KEY,
           code       TEXT NOT NULL,
           title      TEXT NOT NULL,
           owner_id   TEXT NOT NULL REFERENCES users(id),
           join_code  TEXT NOT NULL UNIQUE,
           created_at INTEGER NOT NULL
         );
         CREATE TABLE IF NOT EXISTS course_members (
           course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
           user_id   TEXT NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
           role      TEXT NOT NULL DEFAULT 'member',
           joined_at INTEGER NOT NULL,
           PRIMARY KEY (course_id, user_id)
         );
         CREATE INDEX IF NOT EXISTS idx_course_members_user ON course_members(user_id);",
    )
    .map_err(|e| e.to_string())
}

// ---------------------------------------------------------------- 型別

#[derive(Serialize)]
pub struct CourseSummary {
    pub id: String,
    pub code: String,
    pub title: String,
    pub owner_id: String,
    pub owner_username: String,
    /// 當前用戶喺呢個課程嘅角色：'owner' | 'member'
    pub role: String,
    pub join_code: String,
    pub member_count: i64,
    pub created_at: i64,
}

#[derive(Serialize)]
pub struct MemberInfo {
    pub user_id: String,
    pub username: String,
    pub role: String,
    pub joined_at: i64,
}

#[derive(Serialize)]
pub struct CourseDetail {
    #[serde(flatten)]
    pub course: CourseSummary,
    pub members: Vec<MemberInfo>,
}

#[derive(Deserialize)]
pub struct CreateCourseRequest {
    pub code: String,
    pub title: String,
}

#[derive(Deserialize)]
pub struct JoinCourseRequest {
    pub join_code: String,
}

// ---------------------------------------------------------------- 成員資格

/// 唔係成員就當「課程唔存在」處理 —— 唔好用 403 / 404 分開兩種訊息，
/// 免得畀人靠錯誤訊息掃到邊個 course_id 存在
fn require_member(conn: &Connection, course_id: &str, user_id: &str) -> Result<String, Err> {
    conn.query_row(
        "SELECT role FROM course_members WHERE course_id = ?1 AND user_id = ?2",
        params![course_id, user_id],
        |r| r.get(0),
    )
    .optional()
    .map_err(db_err)?
    .ok_or_else(|| err(StatusCode::NOT_FOUND, "course not found"))
}

fn load_summary(conn: &Connection, course_id: &str, role: &str) -> Result<CourseSummary, Err> {
    conn.query_row(
        "SELECT c.id, c.code, c.title, c.owner_id, u.username, c.join_code, c.created_at,
                (SELECT COUNT(*) FROM course_members WHERE course_id = c.id)
           FROM courses c JOIN users u ON u.id = c.owner_id
          WHERE c.id = ?1",
        params![course_id],
        |r| {
            Ok(CourseSummary {
                id: r.get(0)?,
                code: r.get(1)?,
                title: r.get(2)?,
                owner_id: r.get(3)?,
                owner_username: r.get(4)?,
                role: role.to_string(),
                join_code: r.get(5)?,
                created_at: r.get(6)?,
                member_count: r.get(7)?,
            })
        },
    )
    .map_err(db_err)
}

// ---------------------------------------------------------------- handlers

pub async fn list_courses_handler(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<CurrentUser>,
) -> Result<Json<Vec<CourseSummary>>, Err> {
    let conn = state.db().lock().map_err(db_err)?;
    let mut stmt = conn
        .prepare(
            "SELECT c.id, c.code, c.title, c.owner_id, u.username, cm.role, c.join_code, c.created_at,
                    (SELECT COUNT(*) FROM course_members WHERE course_id = c.id)
               FROM course_members cm
               JOIN courses c ON c.id = cm.course_id
               JOIN users u ON u.id = c.owner_id
              WHERE cm.user_id = ?1
              ORDER BY c.created_at DESC",
        )
        .map_err(db_err)?;
    let rows = stmt
        .query_map(params![user.id], |r| {
            Ok(CourseSummary {
                id: r.get(0)?,
                code: r.get(1)?,
                title: r.get(2)?,
                owner_id: r.get(3)?,
                owner_username: r.get(4)?,
                role: r.get(5)?,
                join_code: r.get(6)?,
                created_at: r.get(7)?,
                member_count: r.get(8)?,
            })
        })
        .map_err(db_err)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(db_err)?;
    Ok(Json(rows))
}

pub async fn create_course_handler(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<CurrentUser>,
    Json(req): Json<CreateCourseRequest>,
) -> Result<Json<CourseSummary>, Err> {
    let code = req.code.trim().to_string();
    let title = req.title.trim().to_string();
    if code.is_empty() {
        return Err(err(StatusCode::BAD_REQUEST, "code required"));
    }
    if title.is_empty() {
        return Err(err(StatusCode::BAD_REQUEST, "title required"));
    }

    let conn = state.db().lock().map_err(db_err)?;

    let mut join_code = gen_join_code();
    for _ in 0..5 {
        let exists: bool = conn
            .query_row(
                "SELECT 1 FROM courses WHERE join_code = ?1",
                params![join_code],
                |_| Ok(()),
            )
            .optional()
            .map_err(db_err)?
            .is_some();
        if !exists {
            break;
        }
        join_code = gen_join_code();
    }

    let id = uuid::Uuid::new_v4().to_string();
    let now = now_ms();
    conn.execute(
        "INSERT INTO courses (id, code, title, owner_id, join_code, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![id, code, title, user.id, join_code, now],
    )
    .map_err(db_err)?;
    conn.execute(
        "INSERT INTO course_members (course_id, user_id, role, joined_at)
         VALUES (?1, ?2, 'owner', ?3)",
        params![id, user.id, now],
    )
    .map_err(db_err)?;

    Ok(Json(load_summary(&conn, &id, "owner")?))
}

pub async fn get_course_handler(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<CurrentUser>,
    Path(id): Path<String>,
) -> Result<Json<CourseDetail>, Err> {
    let conn = state.db().lock().map_err(db_err)?;
    let role = require_member(&conn, &id, &user.id)?;
    let course = load_summary(&conn, &id, &role)?;

    let mut stmt = conn
        .prepare(
            "SELECT cm.user_id, u.username, cm.role, cm.joined_at
               FROM course_members cm JOIN users u ON u.id = cm.user_id
              WHERE cm.course_id = ?1
              ORDER BY cm.joined_at",
        )
        .map_err(db_err)?;
    let members = stmt
        .query_map(params![id], |r| {
            Ok(MemberInfo {
                user_id: r.get(0)?,
                username: r.get(1)?,
                role: r.get(2)?,
                joined_at: r.get(3)?,
            })
        })
        .map_err(db_err)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(db_err)?;

    Ok(Json(CourseDetail { course, members }))
}

pub async fn join_course_handler(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<CurrentUser>,
    Json(req): Json<JoinCourseRequest>,
) -> Result<Json<CourseSummary>, Err> {
    let join_code = normalize_join_code(&req.join_code);
    if join_code.is_empty() {
        return Err(err(StatusCode::BAD_REQUEST, "join_code required"));
    }

    let conn = state.db().lock().map_err(db_err)?;
    let course_id: String = conn
        .query_row(
            "SELECT id FROM courses WHERE join_code = ?1",
            params![join_code],
            |r| r.get(0),
        )
        .optional()
        .map_err(db_err)?
        .ok_or_else(|| err(StatusCode::NOT_FOUND, "invalid join code"))?;

    let already_role: Option<String> = conn
        .query_row(
            "SELECT role FROM course_members WHERE course_id = ?1 AND user_id = ?2",
            params![course_id, user.id],
            |r| r.get(0),
        )
        .optional()
        .map_err(db_err)?;

    let role = match already_role {
        // 已經係成員 —— 幂等處理，唔當錯誤
        Some(role) => role,
        None => {
            conn.execute(
                "INSERT INTO course_members (course_id, user_id, role, joined_at)
                 VALUES (?1, ?2, 'member', ?3)",
                params![course_id, user.id, now_ms()],
            )
            .map_err(db_err)?;
            "member".to_string()
        }
    };

    Ok(Json(load_summary(&conn, &course_id, &role)?))
}

pub async fn leave_course_handler(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<CurrentUser>,
    Path(id): Path<String>,
) -> Result<StatusCode, Err> {
    let conn = state.db().lock().map_err(db_err)?;
    let role = require_member(&conn, &id, &user.id)?;
    if role == "owner" {
        return Err(err(
            StatusCode::BAD_REQUEST,
            "owner cannot leave — delete the course instead",
        ));
    }
    conn.execute(
        "DELETE FROM course_members WHERE course_id = ?1 AND user_id = ?2",
        params![id, user.id],
    )
    .map_err(db_err)?;
    Ok(StatusCode::NO_CONTENT)
}

pub async fn delete_course_handler(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<CurrentUser>,
    Path(id): Path<String>,
) -> Result<StatusCode, Err> {
    let conn = state.db().lock().map_err(db_err)?;
    let role = require_member(&conn, &id, &user.id)?;
    if role != "owner" && !user.is_admin() {
        return Err(err(StatusCode::FORBIDDEN, "owner only"));
    }
    // course_members 有 ON DELETE CASCADE，但 SQLite 預設冇開 foreign_keys，
    // 同 auth.rs 刪 user 嗰度一樣，要手動清
    conn.execute(
        "DELETE FROM course_members WHERE course_id = ?1",
        params![id],
    )
    .map_err(db_err)?;
    let n = conn
        .execute("DELETE FROM courses WHERE id = ?1", params![id])
        .map_err(db_err)?;
    if n == 0 {
        return Err(err(StatusCode::NOT_FOUND, "course not found"));
    }
    Ok(StatusCode::NO_CONTENT)
}

// ---------------------------------------------------------------- tests

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn join_code_alphabet_has_no_ambiguous_chars() {
        for _ in 0..200 {
            let code = gen_join_code();
            assert_eq!(code.len(), JOIN_CODE_LEN);
            assert!(code.chars().all(|c| CODE_ALPHABET.contains(&(c as u8))));
            assert!(!code.contains(['0', 'O', '1', 'I']));
        }
    }

    #[test]
    fn normalize_strips_and_upcases() {
        assert_eq!(normalize_join_code(" ab-cd 34 "), "ABCD34");
        assert_eq!(normalize_join_code("XYZ98765"), "XYZ98765");
        assert_eq!(normalize_join_code(""), "");
    }
}
