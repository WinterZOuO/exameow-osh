//! 帳號同 session（W2）
//!
//! - 密碼用 argon2id hash
//! - session token 只喺 DB 存 SHA-256 hash，明文只出現喺 HttpOnly cookie
//! - `require_auth` middleware 掛喺除咗 /api/auth/login 之外嘅所有 /api 路由

use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use axum::{
    extract::{Path, Request, State},
    http::{header, HeaderMap, StatusCode},
    middleware::Next,
    response::{IntoResponse, Response},
    Extension, Json,
};
use rand::Rng;
use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::sync::{Arc, Mutex};

use crate::routes::AppState;

const SESSION_COOKIE: &str = "exameow_session";
const SESSION_MAX_AGE_SECS: i64 = 30 * 24 * 60 * 60;
const MIN_PASSWORD_LEN: usize = 8;

type Err = (StatusCode, String);

fn err(status: StatusCode, code: &str) -> Err {
    (status, serde_json::json!({ "error": code }).to_string())
}

fn now_ms() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

fn db_err<E: std::fmt::Display>(e: E) -> Err {
    err(StatusCode::INTERNAL_SERVER_ERROR, &format!("db error: {e}"))
}

// ---------------------------------------------------------------- 型別

/// 由 `require_auth` 塞入 request extensions，handler 用 `Extension<CurrentUser>` 攞
#[derive(Clone, Debug, Serialize)]
pub struct CurrentUser {
    pub id: String,
    pub username: String,
    pub role: String,
}

impl CurrentUser {
    pub fn is_admin(&self) -> bool {
        self.role == "admin"
    }
}

#[derive(Deserialize)]
pub struct LoginRequest {
    pub username: String,
    pub password: String,
}

#[derive(Deserialize)]
pub struct CreateUserRequest {
    pub username: String,
    pub password: String,
    #[serde(default)]
    pub role: Option<String>,
}

// ---------------------------------------------------------------- 密碼

fn hash_password(password: &str) -> Result<String, Err> {
    let salt = SaltString::generate(&mut OsRng);
    Argon2::default()
        .hash_password(password.as_bytes(), &salt)
        .map(|h| h.to_string())
        .map_err(|e| err(StatusCode::INTERNAL_SERVER_ERROR, &format!("hash error: {e}")))
}

fn verify_password(password: &str, stored_hash: &str) -> bool {
    match PasswordHash::new(stored_hash) {
        Ok(parsed) => Argon2::default()
            .verify_password(password.as_bytes(), &parsed)
            .is_ok(),
        // hash 壞咗就當驗證失敗，唔好 panic
        Err(_) => false,
    }
}

// ---------------------------------------------------------------- session token

fn gen_token() -> String {
    let bytes: [u8; 32] = rand::thread_rng().gen();
    bytes.iter().map(|b| format!("{b:02x}")).collect()
}

fn sha256_hex(text: &str) -> String {
    let mut h = Sha256::new();
    h.update(text.as_bytes());
    h.finalize().iter().map(|b| format!("{b:02x}")).collect()
}

// ---------------------------------------------------------------- cookie

/// 預設帶 Secure。本機用 HTTP 測試先設 COOKIE_SECURE=0。
fn cookie_secure() -> bool {
    !matches!(
        std::env::var("COOKIE_SECURE").as_deref(),
        Ok("0") | Ok("false")
    )
}

fn build_cookie(token: &str, max_age: i64) -> String {
    let mut c =
        format!("{SESSION_COOKIE}={token}; HttpOnly; SameSite=Lax; Path=/; Max-Age={max_age}");
    if cookie_secure() {
        c.push_str("; Secure");
    }
    c
}

fn cookie_value(headers: &HeaderMap, name: &str) -> Option<String> {
    let raw = headers.get(header::COOKIE)?.to_str().ok()?;
    raw.split(';')
        .filter_map(|kv| kv.split_once('='))
        .find(|(k, _)| k.trim() == name)
        .map(|(_, v)| v.trim().to_string())
}

fn with_cookie(body: impl IntoResponse, cookie: String) -> Result<Response, Err> {
    let mut res = body.into_response();
    let value = cookie
        .parse()
        .map_err(|_| err(StatusCode::INTERNAL_SERVER_ERROR, "bad cookie"))?;
    res.headers_mut().insert(header::SET_COOKIE, value);
    Ok(res)
}

// ---------------------------------------------------------------- schema

pub fn init_schema(db: &Mutex<Connection>) -> Result<(), String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS users (
           id            TEXT PRIMARY KEY,
           username      TEXT NOT NULL UNIQUE,
           password_hash TEXT NOT NULL,
           role          TEXT NOT NULL DEFAULT 'member',
           created_at    INTEGER NOT NULL
         );
         CREATE TABLE IF NOT EXISTS sessions (
           token_hash TEXT PRIMARY KEY,
           user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
           created_at INTEGER NOT NULL,
           expires_at INTEGER NOT NULL
         );
         CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);",
    )
    .map_err(|e| e.to_string())
}

/// 第一次啟動、users 表係空嘅時候建立 admin。
/// 冇設 ADMIN_PASSWORD 就隨機生成一個並喺 log 印一次。
pub fn seed_admin(db: &Mutex<Connection>) -> Result<(), String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM users", [], |r| r.get(0))
        .map_err(|e| e.to_string())?;
    if count > 0 {
        return Ok(());
    }

    let username = std::env::var("ADMIN_USERNAME").unwrap_or_else(|_| "admin".to_string());
    let (password, generated) = match std::env::var("ADMIN_PASSWORD") {
        // 用字元數而唔係 p.len()（byte 數）—— 中文密碼一個字係 3 bytes
        Ok(p) if p.chars().count() >= MIN_PASSWORD_LEN => (p, false),
        Ok(p) if !p.is_empty() => {
            return Err(format!(
                "ADMIN_PASSWORD 太短：要至少 {MIN_PASSWORD_LEN} 個字元，而家得 {}。想要隨機密碼就索性唔好設 ADMIN_PASSWORD，啟動時會生成一個印喺 log。",
                p.chars().count()
            ))
        }
        _ => (gen_token()[..24].to_string(), true),
    };

    let hash = hash_password(&password).map_err(|(_, body)| body)?;
    conn.execute(
        "INSERT INTO users (id, username, password_hash, role, created_at)
         VALUES (?1, ?2, ?3, 'admin', ?4)",
        params![
            uuid::Uuid::new_v4().to_string(),
            username,
            hash,
            now_ms()
        ],
    )
    .map_err(|e| e.to_string())?;

    if generated {
        println!("============================================================");
        println!("  已建立 admin 帳號：{username}");
        println!("  密碼（只顯示呢一次）：{password}");
        println!("  想自己指定就設 ADMIN_PASSWORD 環境變數再重新開一個 DB");
        println!("============================================================");
    } else {
        println!("已由 ADMIN_PASSWORD 建立 admin 帳號：{username}");
    }
    Ok(())
}

pub fn cleanup_expired_sessions(db: &Mutex<Connection>) {
    if let Ok(conn) = db.lock() {
        let _ = conn.execute("DELETE FROM sessions WHERE expires_at < ?1", params![now_ms()]);
    }
}

// ---------------------------------------------------------------- middleware

fn lookup_session(state: &AppState, token: &str) -> Result<Option<CurrentUser>, Err> {
    let conn = state.db().lock().map_err(db_err)?;
    conn.query_row(
        "SELECT u.id, u.username, u.role
           FROM sessions s JOIN users u ON u.id = s.user_id
          WHERE s.token_hash = ?1 AND s.expires_at > ?2",
        params![sha256_hex(token), now_ms()],
        |r| {
            Ok(CurrentUser {
                id: r.get(0)?,
                username: r.get(1)?,
                role: r.get(2)?,
            })
        },
    )
    .optional()
    .map_err(db_err)
}

pub async fn require_auth(
    State(state): State<Arc<AppState>>,
    mut req: Request,
    next: Next,
) -> Result<Response, Err> {
    let token = cookie_value(req.headers(), SESSION_COOKIE)
        .ok_or_else(|| err(StatusCode::UNAUTHORIZED, "unauthorized"))?;
    let user = lookup_session(&state, &token)?
        .ok_or_else(|| err(StatusCode::UNAUTHORIZED, "unauthorized"))?;
    req.extensions_mut().insert(user);
    Ok(next.run(req).await)
}

fn require_admin(user: &CurrentUser) -> Result<(), Err> {
    if user.is_admin() {
        Ok(())
    } else {
        Err(err(StatusCode::FORBIDDEN, "admin only"))
    }
}

// ---------------------------------------------------------------- handlers

pub async fn login_handler(
    State(state): State<Arc<AppState>>,
    Json(req): Json<LoginRequest>,
) -> Result<Response, Err> {
    let username = req.username.trim().to_string();
    if username.is_empty() || req.password.is_empty() {
        return Err(err(StatusCode::BAD_REQUEST, "missing credentials"));
    }

    let row: Option<(String, String, String)> = {
        let conn = state.db().lock().map_err(db_err)?;
        conn.query_row(
            "SELECT id, password_hash, role FROM users WHERE username = ?1",
            params![username],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
        )
        .optional()
        .map_err(db_err)?
    };

    // 用戶唔存在同密碼錯，對外一律回同一個錯誤，唔好泄漏邊個 username 有效
    let (user_id, stored_hash, role) =
        row.ok_or_else(|| err(StatusCode::UNAUTHORIZED, "invalid credentials"))?;
    if !verify_password(&req.password, &stored_hash) {
        return Err(err(StatusCode::UNAUTHORIZED, "invalid credentials"));
    }

    let token = gen_token();
    let now = now_ms();
    {
        let conn = state.db().lock().map_err(db_err)?;
        conn.execute(
            "INSERT INTO sessions (token_hash, user_id, created_at, expires_at)
             VALUES (?1, ?2, ?3, ?4)",
            params![
                sha256_hex(&token),
                user_id,
                now,
                now + SESSION_MAX_AGE_SECS * 1000
            ],
        )
        .map_err(db_err)?;
    }

    let user = CurrentUser {
        id: user_id,
        username,
        role,
    };
    with_cookie(Json(user), build_cookie(&token, SESSION_MAX_AGE_SECS))
}

pub async fn logout_handler(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
) -> Result<Response, Err> {
    if let Some(token) = cookie_value(&headers, SESSION_COOKIE) {
        let conn = state.db().lock().map_err(db_err)?;
        let _ = conn.execute(
            "DELETE FROM sessions WHERE token_hash = ?1",
            params![sha256_hex(&token)],
        );
    }
    with_cookie(StatusCode::NO_CONTENT, build_cookie("", 0))
}

pub async fn me_handler(Extension(user): Extension<CurrentUser>) -> Json<CurrentUser> {
    Json(user)
}

#[derive(Serialize)]
pub struct UserSummary {
    pub id: String,
    pub username: String,
    pub role: String,
    pub created_at: i64,
}

pub async fn list_users_handler(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<CurrentUser>,
) -> Result<Json<Vec<UserSummary>>, Err> {
    require_admin(&user)?;
    let conn = state.db().lock().map_err(db_err)?;
    let mut stmt = conn
        .prepare("SELECT id, username, role, created_at FROM users ORDER BY created_at")
        .map_err(db_err)?;
    let rows = stmt
        .query_map([], |r| {
            Ok(UserSummary {
                id: r.get(0)?,
                username: r.get(1)?,
                role: r.get(2)?,
                created_at: r.get(3)?,
            })
        })
        .map_err(db_err)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(db_err)?;
    Ok(Json(rows))
}

pub async fn create_user_handler(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<CurrentUser>,
    Json(req): Json<CreateUserRequest>,
) -> Result<Json<UserSummary>, Err> {
    require_admin(&user)?;

    let username = req.username.trim().to_string();
    if username.is_empty() {
        return Err(err(StatusCode::BAD_REQUEST, "username required"));
    }
    if req.password.chars().count() < MIN_PASSWORD_LEN {
        return Err(err(StatusCode::BAD_REQUEST, "password too short"));
    }
    let role = match req.role.as_deref() {
        None | Some("member") => "member",
        Some("admin") => "admin",
        Some(_) => return Err(err(StatusCode::BAD_REQUEST, "invalid role")),
    };

    let hash = hash_password(&req.password)?;
    let id = uuid::Uuid::new_v4().to_string();
    let created_at = now_ms();
    {
        let conn = state.db().lock().map_err(db_err)?;
        conn.execute(
            "INSERT INTO users (id, username, password_hash, role, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![id, username, hash, role, created_at],
        )
        .map_err(|e| match e {
            rusqlite::Error::SqliteFailure(f, _)
                if f.code == rusqlite::ErrorCode::ConstraintViolation =>
            {
                err(StatusCode::CONFLICT, "username taken")
            }
            other => db_err(other),
        })?;
    }

    Ok(Json(UserSummary {
        id,
        username,
        role: role.to_string(),
        created_at,
    }))
}

pub async fn delete_user_handler(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<CurrentUser>,
    Path(id): Path<String>,
) -> Result<StatusCode, Err> {
    require_admin(&user)?;
    if id == user.id {
        return Err(err(StatusCode::BAD_REQUEST, "cannot delete yourself"));
    }
    let conn = state.db().lock().map_err(db_err)?;
    // sessions 有 ON DELETE CASCADE，但 SQLite 預設冇開 foreign_keys，所以手動清
    let _ = conn.execute("DELETE FROM sessions WHERE user_id = ?1", params![id]);
    let n = conn
        .execute("DELETE FROM users WHERE id = ?1", params![id])
        .map_err(db_err)?;
    if n == 0 {
        return Err(err(StatusCode::NOT_FOUND, "user not found"));
    }
    Ok(StatusCode::NO_CONTENT)
}
