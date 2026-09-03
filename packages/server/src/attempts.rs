//! 練習流程（W7）
//!
//! - 抽題完全喺前端做——`GET .../questions`（W6）已經回晒成個課程
//!   `status='active'` 嘅共享題庫，前端由嗰堆隨機抽 N 題,伺服器唔使知
//!   「呢次練習抽咗邊幾題」,淨係負責記低兩件事：答題結果 (`attempts`)
//!   同 🚩 標記 (`question_flags`)
//! - 對唔對即刻喺前端判（同 `stores/practice.ts` 果套判法一樣），呢個
//!   模組淨係「寫低已經判過嘅結果」，唔重新判一次——信前端嘅
//!   `is_correct`,因為呢個唔係計分競賽,啱唔啱亂報自己揾自己笨
//! - **「A 同 B 嘅答題進度互相睇唔到」係設計要求**（design.md §9 checklist）:
//!   呢個模組冇任何「攞第二個用戶嘅 attempts」嘅路由,淨係暴露自己個人聚合
//!   （`GET .../attempts/me/summary`）
//! - 🚩 flag 用 `(question_id, user_id)` unique index 做 toggle：撳一下
//!   標記,再撳一下取消,冇獨立 unflag 路由。`flag_count` 見唔見到俾晒
//!   同課成員睇（信任群組,唔遮）,方便人手決定要唔要用 sqlite3 CLI
//!   手動隱藏嗰條題（見 design.md §10「題庫品質」已知限制)

use axum::{
    extract::{Path, State},
    http::StatusCode,
    Extension, Json,
};
use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
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

/// 確認呢條題屬於呢個課程——同 W6 嘅 material_id ACL 檢查同一個道理：
/// request body 嘅 course_id/question_id 隨便都砌得到,唔可以淨係信路由
/// 入面嘅 `{id}` 同 `{question_id}` 兩個 path 參數真係掛得埋
fn require_question_in_course(
    conn: &Connection,
    course_id: &str,
    question_id: &str,
) -> Result<(), Err> {
    let row: Option<String> = conn
        .query_row(
            "SELECT course_id FROM questions WHERE id = ?1",
            params![question_id],
            |r| r.get(0),
        )
        .optional()
        .map_err(db_err)?;
    match row {
        Some(cid) if cid == course_id => Ok(()),
        _ => Err(err(StatusCode::NOT_FOUND, "question not found")),
    }
}

// ---------------------------------------------------------------- schema

pub fn init_schema(db: &Mutex<Connection>) -> Result<(), String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS attempts (
           id           TEXT PRIMARY KEY,
           question_id  TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
           course_id    TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
           user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
           user_answer  TEXT NOT NULL DEFAULT '',
           is_correct   INTEGER NOT NULL,
           created_at   INTEGER NOT NULL
         );
         CREATE INDEX IF NOT EXISTS idx_attempts_user_course ON attempts(user_id, course_id);
         CREATE INDEX IF NOT EXISTS idx_attempts_question ON attempts(question_id);

         CREATE TABLE IF NOT EXISTS question_flags (
           id           TEXT PRIMARY KEY,
           question_id  TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
           course_id    TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
           user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
           created_at   INTEGER NOT NULL
         );
         CREATE UNIQUE INDEX IF NOT EXISTS idx_flag_question_user ON question_flags(question_id, user_id);",
    )
    .map_err(|e| e.to_string())
}

// ---------------------------------------------------------------- 型別

#[derive(Deserialize)]
pub struct RecordAttemptRequest {
    #[serde(default)]
    pub user_answer: String,
    pub is_correct: bool,
}

#[derive(Serialize)]
pub struct AttemptSummary {
    pub attempted: i64,
    pub correct: i64,
}

#[derive(Serialize)]
pub struct FlagResult {
    pub flagged: bool,
}

// ---------------------------------------------------------------- handlers

pub async fn record_attempt_handler(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<CurrentUser>,
    Path((course_id, question_id)): Path<(String, String)>,
    Json(req): Json<RecordAttemptRequest>,
) -> Result<StatusCode, Err> {
    let conn = state.db().lock().map_err(db_err)?;
    require_member(&conn, &course_id, &user.id)?;
    require_question_in_course(&conn, &course_id, &question_id)?;

    conn.execute(
        "INSERT INTO attempts (id, question_id, course_id, user_id, user_answer, is_correct, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![
            uuid::Uuid::new_v4().to_string(),
            question_id,
            course_id,
            user.id,
            req.user_answer,
            req.is_correct as i64,
            now_ms(),
        ],
    )
    .map_err(db_err)?;

    Ok(StatusCode::CREATED)
}

pub async fn my_attempt_summary_handler(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<CurrentUser>,
    Path(course_id): Path<String>,
) -> Result<Json<AttemptSummary>, Err> {
    let conn = state.db().lock().map_err(db_err)?;
    require_member(&conn, &course_id, &user.id)?;

    let (attempted, correct): (i64, i64) = conn
        .query_row(
            "SELECT COUNT(*), COALESCE(SUM(is_correct), 0)
               FROM attempts WHERE course_id = ?1 AND user_id = ?2",
            params![course_id, user.id],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )
        .map_err(db_err)?;

    Ok(Json(AttemptSummary { attempted, correct }))
}

pub async fn toggle_flag_handler(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<CurrentUser>,
    Path((course_id, question_id)): Path<(String, String)>,
) -> Result<Json<FlagResult>, Err> {
    let conn = state.db().lock().map_err(db_err)?;
    require_member(&conn, &course_id, &user.id)?;
    require_question_in_course(&conn, &course_id, &question_id)?;

    let existing: Option<String> = conn
        .query_row(
            "SELECT id FROM question_flags WHERE question_id = ?1 AND user_id = ?2",
            params![question_id, user.id],
            |r| r.get(0),
        )
        .optional()
        .map_err(db_err)?;

    let flagged = match existing {
        Some(flag_id) => {
            conn.execute("DELETE FROM question_flags WHERE id = ?1", params![flag_id])
                .map_err(db_err)?;
            false
        }
        None => {
            conn.execute(
                "INSERT INTO question_flags (id, question_id, course_id, user_id, created_at)
                 VALUES (?1, ?2, ?3, ?4, ?5)",
                params![
                    uuid::Uuid::new_v4().to_string(),
                    question_id,
                    course_id,
                    user.id,
                    now_ms(),
                ],
            )
            .map_err(db_err)?;
            true
        }
    };

    Ok(Json(FlagResult { flagged }))
}

// ---------------------------------------------------------------- tests

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::Connection;

    fn setup() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch(
            "CREATE TABLE courses (id TEXT PRIMARY KEY);
             CREATE TABLE questions (id TEXT PRIMARY KEY, course_id TEXT NOT NULL);",
        )
        .unwrap();
        conn.execute("INSERT INTO courses (id) VALUES ('c1')", []).unwrap();
        conn.execute("INSERT INTO courses (id) VALUES ('c2')", []).unwrap();
        conn.execute(
            "INSERT INTO questions (id, course_id) VALUES ('q1', 'c1')",
            [],
        )
        .unwrap();
        conn
    }

    #[test]
    fn require_question_in_course_accepts_matching_course() {
        let conn = setup();
        assert!(require_question_in_course(&conn, "c1", "q1").is_ok());
    }

    #[test]
    fn require_question_in_course_rejects_wrong_course() {
        let conn = setup();
        let e = require_question_in_course(&conn, "c2", "q1").unwrap_err();
        assert_eq!(e.0, StatusCode::NOT_FOUND);
    }

    #[test]
    fn require_question_in_course_rejects_unknown_question() {
        let conn = setup();
        let e = require_question_in_course(&conn, "c1", "does-not-exist").unwrap_err();
        assert_eq!(e.0, StatusCode::NOT_FOUND);
    }
}
