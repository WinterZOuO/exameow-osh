//! 帳號同 session（W2）
//!
//! - 密碼用 argon2id hash
//! - session token 只喺 DB 存 SHA-256 hash，明文只出現喺 HttpOnly cookie
//! - `require_auth` middleware 掛喺除咗 /api/auth/login 之外嘅所有 /api 路由
//! - 登入有失敗節流（`LoginThrottle`），唔係嘅話公開個 URL 出去就任人試密碼

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
use std::collections::HashMap;
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

// ---------------------------------------------------------------- 登入節流

/// 頭幾次失敗唔罰 —— 打錯密碼係常事，唔想自己都撞到。
const LOGIN_FREE_TRIES: u32 = 5;
/// 咁耐冇再失敗過就當無事發生，計數清零。
const LOGIN_WINDOW_MS: i64 = 15 * 60 * 1000;
/// 延遲封頂，唔好無限咁翻倍。
const LOGIN_MAX_DELAY_SECS: i64 = 300;
/// 記得低幾多個 username。爆咗就踢走最耐冇郁過嗰個。
const LOGIN_TRACK_CAP: usize = 4096;

/// 登入失敗節流。
///
/// 冇呢個嘅話，一 tunnel／部署出公網就等於任人無限試密碼。argon2id 慢，
/// 某程度上係天然減速器，但同時亦即係每次試都燒你 CPU。
///
/// **逐個 username 記，唔按 IP 記**：喺 Cloudflare tunnel／反向代理後面，
/// peer IP 全部都係 127.0.0.1，按 IP 記等於冇記；而信 `X-Forwarded-For`
/// 又反而開咗一條「自己填個 header 就繞過」嘅路。username 呃唔到人。
///
/// **罰延遲，唔鎖帳號**：鎖死嘅話任何人都可以用一個亂咁嘅密碼將你鎖出街。
///
/// 存記憶體唔入 DB —— 重啟清零可以接受（攻擊者估唔到你幾時重啟），
/// 亦唔想每次登入都寫一次 disk。
#[derive(Default)]
pub struct LoginThrottle {
    /// username → (連續失敗次數, 最後一次失敗嘅 ms)
    per_user: HashMap<String, (u32, i64)>,
}

/// 累積咗 n 次失敗之後，下一次要等幾多秒。
/// 頭 `LOGIN_FREE_TRIES` 次 0 秒，之後每次翻倍，去到 `LOGIN_MAX_DELAY_SECS` 封頂。
fn login_delay_secs(failures: u32) -> i64 {
    if failures < LOGIN_FREE_TRIES {
        return 0;
    }
    // `.min(30)` 唔止係封頂，仲係防 shift overflow
    let steps = (failures - LOGIN_FREE_TRIES).min(30);
    (1_i64 << steps).min(LOGIN_MAX_DELAY_SECS)
}

/// 仲要等幾多秒先可以再試。0 = 而家就得。
fn login_retry_after(failures: u32, last_ms: i64, now_ms: i64) -> i64 {
    if now_ms - last_ms >= LOGIN_WINDOW_MS {
        return 0; // 過咗窗口，當清零
    }
    let wait = login_delay_secs(failures);
    if wait == 0 {
        return 0;
    }
    let elapsed = (now_ms - last_ms) / 1000;
    (wait - elapsed).max(0)
}

impl LoginThrottle {
    fn check(&self, username: &str, now: i64) -> i64 {
        match self.per_user.get(username) {
            Some((failures, last)) => login_retry_after(*failures, *last, now),
            None => 0,
        }
    }

    fn record_failure(&mut self, username: &str, now: i64) {
        // 過期嘅先清走，順便控制個 map 大細
        self.per_user
            .retain(|_, (_, last)| now - *last < LOGIN_WINDOW_MS);
        if !self.per_user.contains_key(username) && self.per_user.len() >= LOGIN_TRACK_CAP {
            // 爆 cap 就踢走最耐冇郁過嗰個。**唔可以「爆咗就唔記」** ——
            // 咁樣噴 4096 個假 username 就可以令一個真 username 完全冇節流。
            // 俾人狂試緊嗰個 username 時間戳一直喺度更新，唔會俾踢走。
            if let Some(oldest) = self
                .per_user
                .iter()
                .min_by_key(|(_, (_, last))| *last)
                .map(|(k, _)| k.clone())
            {
                self.per_user.remove(&oldest);
            }
        }
        let entry = self.per_user.entry(username.to_string()).or_insert((0, now));
        // 隔咗成個窗口先再失敗，當重新開始數
        if now - entry.1 >= LOGIN_WINDOW_MS {
            entry.0 = 0;
        }
        entry.0 += 1;
        entry.1 = now;
    }

    fn clear(&mut self, username: &str) {
        self.per_user.remove(username);
    }
}

pub async fn login_handler(
    State(state): State<Arc<AppState>>,
    Json(req): Json<LoginRequest>,
) -> Result<Response, Err> {
    let username = req.username.trim().to_string();
    if username.is_empty() || req.password.is_empty() {
        return Err(err(StatusCode::BAD_REQUEST, "missing credentials"));
    }

    // 喺查 DB／行 argon2 之前擋 —— 俾人狂試嗰陣連 CPU 都唔想燒
    let now = now_ms();
    {
        let throttle = state.login_throttle.lock().map_err(db_err)?;
        let retry = throttle.check(&username, now);
        if retry > 0 {
            return Err(err(
                StatusCode::TOO_MANY_REQUESTS,
                &format!("too many failed logins, try again in {retry}s"),
            ));
        }
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

    // 用戶唔存在同密碼錯，對外一律回同一個錯誤，唔好泄漏邊個 username 有效。
    // 節流亦係兩種情況都記 —— 淨係記存在嘅 username 就等於送個列舉工具俾人。
    let fail = |state: &AppState| {
        if let Ok(mut t) = state.login_throttle.lock() {
            t.record_failure(&username, now);
        }
        err(StatusCode::UNAUTHORIZED, "invalid credentials")
    };
    let Some((user_id, stored_hash, role)) = row else {
        return Err(fail(&state));
    };
    if !verify_password(&req.password, &stored_hash) {
        return Err(fail(&state));
    }
    if let Ok(mut t) = state.login_throttle.lock() {
        t.clear(&username);
    }

    let token = gen_token();
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

#[cfg(test)]
mod tests {
    use super::*;

    const MIN: i64 = 60 * 1000;

    #[test]
    fn first_few_failures_are_free() {
        let mut t = LoginThrottle::default();
        for i in 0..LOGIN_FREE_TRIES {
            assert_eq!(t.check("bob", i as i64), 0, "第 {i} 次唔應該罰");
            t.record_failure("bob", i as i64);
        }
        // 第 LOGIN_FREE_TRIES 次失敗之後先開始罰
        assert!(t.check("bob", LOGIN_FREE_TRIES as i64) > 0);
    }

    #[test]
    fn delay_grows_then_caps() {
        assert_eq!(login_delay_secs(LOGIN_FREE_TRIES - 1), 0);
        assert_eq!(login_delay_secs(LOGIN_FREE_TRIES), 1);
        assert_eq!(login_delay_secs(LOGIN_FREE_TRIES + 1), 2);
        assert_eq!(login_delay_secs(LOGIN_FREE_TRIES + 2), 4);
        // 封頂，唔會無限翻倍（亦唔會 shift overflow）
        assert_eq!(login_delay_secs(LOGIN_FREE_TRIES + 40), LOGIN_MAX_DELAY_SECS);
        assert_eq!(login_delay_secs(u32::MAX), LOGIN_MAX_DELAY_SECS);
    }

    #[test]
    fn waiting_it_out_clears_the_penalty() {
        let mut t = LoginThrottle::default();
        for _ in 0..(LOGIN_FREE_TRIES + 3) {
            t.record_failure("bob", 0);
        }
        assert!(t.check("bob", 0) > 0);
        // 8 次失敗 = 要等 2^(8-5) = 8 秒，等夠就再試得
        assert_eq!(t.check("bob", 3 * 1000), 5);
        assert_eq!(t.check("bob", 8 * 1000), 0);
        // 過咗成個窗口更加係當冇事發生
        assert_eq!(t.check("bob", LOGIN_WINDOW_MS), 0);
    }

    #[test]
    fn success_clears_the_counter() {
        let mut t = LoginThrottle::default();
        for _ in 0..(LOGIN_FREE_TRIES + 2) {
            t.record_failure("bob", 0);
        }
        assert!(t.check("bob", 0) > 0);
        t.clear("bob");
        assert_eq!(t.check("bob", 0), 0);
    }

    #[test]
    fn one_user_being_attacked_does_not_slow_another() {
        let mut t = LoginThrottle::default();
        for _ in 0..20 {
            t.record_failure("bob", 0);
        }
        assert!(t.check("bob", 0) > 0);
        assert_eq!(t.check("alice", 0), 0, "唔應該連累第二個人");
    }

    #[test]
    fn spraying_junk_usernames_cannot_evict_the_one_under_attack() {
        // 呢個係「爆 cap 就唔記」嗰種寫法會中嘅招：噴夠假 username
        // 就令一個真 username 完全冇節流。
        let mut t = LoginThrottle::default();
        let mut now = 0;
        for _ in 0..(LOGIN_FREE_TRIES + 5) {
            t.record_failure("admin", now);
            now += 1;
        }
        for i in 0..(LOGIN_TRACK_CAP * 2) {
            t.record_failure(&format!("junk{i}"), now);
            now += 1;
            // 被攻擊嗰個一路都仲有失敗記錄，時間戳會 refresh，唔應該俾人踢走
            if i % 500 == 0 {
                t.record_failure("admin", now);
                now += 1;
            }
        }
        assert!(t.check("admin", now) > 0, "admin 唔可以俾人噴到冇晒節流");
        assert!(t.per_user.len() <= LOGIN_TRACK_CAP + 1, "個 map 要有上限");
    }

    #[test]
    fn expired_entries_get_pruned() {
        let mut t = LoginThrottle::default();
        t.record_failure("bob", 0);
        t.record_failure("carol", LOGIN_WINDOW_MS + MIN);
        assert!(!t.per_user.contains_key("bob"), "過咗期就唔應該仲霸住");
    }
}
