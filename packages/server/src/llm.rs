//! 每個用戶自己嘅 LLM 設定（W3）
//!
//! 三個目標：
//!   1. **key 存 server，加密** —— AES-256-GCM，master key 由 `MASTER_KEY` env 讀，
//!      唔入 DB。DB 單獨洩漏解唔開啲 key。
//!   2. **請求流程反轉** —— 瀏覽器唔再每次帶住 key 上嚟；server 按 session user
//!      自己查返、解密、call LLM。key 存咗之後永遠唔會再經過網絡。
//!   3. **endpoint allowlist** —— 唔准隨便填 URL，堵死 SSRF（S3）。

use axum::{extract::State, http::StatusCode, Extension, Json};
use exameow_core::ai::{AIClient, ModelInfo};
use exameow_core::config::{open_sealed, seal};
use rand::Rng;
use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex, OnceLock};
use url::Url;

use crate::auth::CurrentUser;
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

// ---------------------------------------------------------------- master key

static MASTER_KEY: OnceLock<[u8; 32]> = OnceLock::new();

fn parse_master_key(raw: &str) -> Option<[u8; 32]> {
    let raw = raw.trim();
    // 64 個十六進位字元
    if raw.len() == 64 && raw.chars().all(|c| c.is_ascii_hexdigit()) {
        let mut out = [0u8; 32];
        for i in 0..32 {
            out[i] = u8::from_str_radix(&raw[i * 2..i * 2 + 2], 16).ok()?;
        }
        return Some(out);
    }
    // 或者 base64 嘅 32 bytes
    use base64::{engine::general_purpose::STANDARD as B64, Engine};
    let bytes = B64.decode(raw).ok()?;
    if bytes.len() == 32 {
        let mut out = [0u8; 32];
        out.copy_from_slice(&bytes);
        return Some(out);
    }
    None
}

fn gen_master_key_hex() -> String {
    let bytes: [u8; 32] = rand::thread_rng().gen();
    bytes.iter().map(|b| format!("{b:02x}")).collect()
}

/// 開機時行一次。冇 key 就唔好扮嘢跑落去 —— 用戶會喺存 key 嗰陣先撞板，
/// 到時錯誤訊息離現場好遠。直接停，順手生成一條俾佢貼。
pub fn ensure_master_key() -> Result<(), String> {
    let raw = std::env::var("MASTER_KEY").unwrap_or_default();
    if raw.trim().is_empty() {
        let suggestion = gen_master_key_hex();
        let mut msg = String::new();
        msg.push_str("冇設 MASTER_KEY。呢條 key 用嚟加密每個用戶嘅 LLM API key。");
        msg.push_str("\n隨便攞條新嘅用：\n\n    MASTER_KEY=");
        msg.push_str(&suggestion);
        msg.push_str("\n\n要求：64 個十六進位字元，或者 base64 嘅 32 bytes。");
        msg.push_str("\n唔好 commit 入 git，亦唔好同 DB 擺埋一齊備份 —— 分開放先有意義。");
        msg.push_str("\n一旦遺失，所有已存嘅 API key 都解唔返（用戶重新填就得）。");
        return Err(msg);
    }
    let key = parse_master_key(&raw).ok_or_else(|| {
        "MASTER_KEY 格式唔啱：要 64 個十六進位字元，或者 base64 嘅 32 bytes。".to_string()
    })?;
    let _ = MASTER_KEY.set(key);
    Ok(())
}

fn master_key() -> Result<&'static [u8; 32], Err> {
    MASTER_KEY.get().ok_or_else(|| {
        err(
            StatusCode::INTERNAL_SERVER_ERROR,
            "MASTER_KEY not configured",
        )
    })
}

// ---------------------------------------------------------------- endpoint allowlist

/// 已知 OpenAI 相容 provider。呢個清單只准 https。
const DEFAULT_ALLOWED_HOSTS: &[&str] = &[
    "api.openai.com",
    "api.deepseek.com",
    "generativelanguage.googleapis.com",
    "api.anthropic.com",
    "openrouter.ai",
    "api.groq.com",
    "api.mistral.ai",
    "api.moonshot.cn",
    "api.siliconflow.cn",
    "dashscope.aliyuncs.com",
    "ark.cn-beijing.volces.com",
    "open.bigmodel.cn",
    "api.x.ai",
];

/// `LLM_EXTRA_HOSTS=host1,host2:8899` —— 由 server 管理員明示加入。
/// 呢啲 host 可以行 http（自架 / 本機測試），因為加入嘅人已經知自己做緊咩。
fn extra_hosts() -> Vec<String> {
    std::env::var("LLM_EXTRA_HOSTS")
        .unwrap_or_default()
        .split(',')
        .map(|h| h.trim().to_lowercase())
        .filter(|h| !h.is_empty())
        .collect()
}

/// 檢查用戶填嘅 endpoint 準唔准用。
///
/// 唔做呢步嘅話，`AIClient::new(&endpoint, ..)` 會照打任何 URL —— 有人填
/// `http://169.254.169.254/`（雲端 metadata）或者 `http://localhost:3000/`
/// 就可以借部 server 打內網。用 allowlist 而唔係 blocklist：blocklist 永遠
/// 補唔切（IPv6、十進位 IP、DNS rebinding、redirect…）。
pub fn validate_endpoint(raw: &str) -> Result<String, Err> {
    let raw = raw.trim().trim_end_matches('/');
    if raw.is_empty() {
        return Err(err(StatusCode::BAD_REQUEST, "endpoint is empty"));
    }
    let url =
        Url::parse(raw).map_err(|_| err(StatusCode::BAD_REQUEST, "endpoint is not a valid URL"))?;

    match url.scheme() {
        "http" | "https" => {}
        _ => {
            return Err(err(
                StatusCode::BAD_REQUEST,
                "endpoint must be http or https",
            ))
        }
    }
    // `https://api.openai.com@evil.com/` 呢類騙眼嘢一律唔收
    if !url.username().is_empty() || url.password().is_some() {
        return Err(err(
            StatusCode::BAD_REQUEST,
            "endpoint must not contain credentials",
        ));
    }

    let host = url
        .host_str()
        .ok_or_else(|| err(StatusCode::BAD_REQUEST, "endpoint has no host"))?
        .to_lowercase();
    let host_port = match url.port() {
        Some(p) => format!("{host}:{p}"),
        None => host.clone(),
    };

    let extras = extra_hosts();
    if extras.iter().any(|h| *h == host || *h == host_port) {
        return Ok(raw.to_string());
    }

    if DEFAULT_ALLOWED_HOSTS.contains(&host.as_str()) {
        if url.scheme() != "https" {
            return Err(err(
                StatusCode::BAD_REQUEST,
                "endpoint must use https for this host",
            ));
        }
        if url.port().is_some_and(|p| p != 443) {
            return Err(err(StatusCode::BAD_REQUEST, "endpoint port not allowed"));
        }
        return Ok(raw.to_string());
    }

    let mut allowed: Vec<String> = DEFAULT_ALLOWED_HOSTS.iter().map(|s| s.to_string()).collect();
    allowed.extend(extras);
    Err(err(
        StatusCode::BAD_REQUEST,
        &format!(
            "endpoint host '{host}' is not allowed. allowed: {}",
            allowed.join(", ")
        ),
    ))
}

// ---------------------------------------------------------------- schema

pub fn init_schema(conn: &Mutex<Connection>) -> Result<(), rusqlite::Error> {
    let conn = conn.lock().unwrap();
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS user_llm_config (
            user_id     TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
            endpoint    TEXT NOT NULL,
            model       TEXT NOT NULL,
            api_key_enc TEXT NOT NULL,
            key_hint    TEXT NOT NULL,
            updated_at  INTEGER NOT NULL
        );",
    )
}

// ---------------------------------------------------------------- 型別

#[derive(Serialize)]
pub struct LlmConfigInfo {
    pub configured: bool,
    pub endpoint: String,
    pub model: String,
    /// 只夠用戶認得返自己貼咗邊條 key，砌唔返原文
    pub key_hint: String,
}

#[derive(Deserialize)]
pub struct SaveLlmConfig {
    pub endpoint: String,
    #[serde(default)]
    pub model: String,
    /// 留空 = 沿用已存嗰條（改 model / endpoint 唔使重新貼 key）
    #[serde(default)]
    pub api_key: Option<String>,
}

/// 解密之後嘅設定。刻意唔 derive Serialize —— 免得手殘 `Json(cfg)` 就送咗條 key 出街。
pub struct ResolvedLlm {
    pub endpoint: String,
    pub api_key: String,
    pub model: String,
}

fn key_hint(api_key: &str) -> String {
    let chars: Vec<char> = api_key.chars().collect();
    // 短 key 唔好露頭，露咗等於露晒
    if chars.len() <= 12 {
        return "…".to_string();
    }
    let head: String = chars[..4].iter().collect();
    let tail: String = chars[chars.len() - 4..].iter().collect();
    format!("{head}…{tail}")
}

// ---------------------------------------------------------------- DB 存取

struct StoredRow {
    endpoint: String,
    model: String,
    api_key_enc: String,
    key_hint: String,
}

fn load_row(state: &AppState, user_id: &str) -> Result<Option<StoredRow>, Err> {
    let conn = state.db().lock().unwrap();
    conn.query_row(
        "SELECT endpoint, model, api_key_enc, key_hint FROM user_llm_config WHERE user_id = ?1",
        params![user_id],
        |r| {
            Ok(StoredRow {
                endpoint: r.get(0)?,
                model: r.get(1)?,
                api_key_enc: r.get(2)?,
                key_hint: r.get(3)?,
            })
        },
    )
    .optional()
    .map_err(db_err)
}

/// 攞返某個用戶解密後嘅設定。冇設定就 `Ok(None)`。
///
/// 解密失敗（多數係換咗 MASTER_KEY）唔當 500 —— 500 只會令人以為部 server 壞咗。
/// 直接叫用戶重新填。
pub fn resolve_for_user(state: &AppState, user_id: &str) -> Result<Option<ResolvedLlm>, Err> {
    let Some(row) = load_row(state, user_id)? else {
        return Ok(None);
    };
    let key = master_key()?;
    let Ok(plain) = open_sealed(key, &row.api_key_enc) else {
        return Err(err(
            StatusCode::BAD_REQUEST,
            "stored API key cannot be decrypted (MASTER_KEY changed?) — please re-enter it",
        ));
    };
    let api_key = String::from_utf8(plain)
        .map_err(|_| err(StatusCode::INTERNAL_SERVER_ERROR, "stored key is not utf-8"))?;
    Ok(Some(ResolvedLlm {
        endpoint: row.endpoint,
        api_key,
        model: row.model,
    }))
}

fn env_or_empty(name: &str) -> String {
    std::env::var(name).unwrap_or_default()
}

/// server 自己有冇一套 env AI 設定（`/api/config/server` 同 fallback 都睇呢個）
fn env_config() -> Option<ResolvedLlm> {
    let endpoint = env_or_empty("AI_ENDPOINT");
    let api_key = env_or_empty("AI_API_KEY");
    if endpoint.is_empty() || api_key.is_empty() {
        return None;
    }
    Some(ResolvedLlm {
        endpoint,
        api_key,
        model: env_or_empty("AI_MODEL"),
    })
}

/// 所有 AI handler 攞設定嘅唯一入口。
///
/// 次序：用戶自己存嘅 → server 嘅 env（`AI_ENDPOINT` / `AI_API_KEY` / `AI_MODEL`）。
/// `model_override` 淨係俾介面臨時換型號 —— 型號唔係秘密，可以由 request 帶。
pub fn resolve_or_env(
    state: &AppState,
    user: &CurrentUser,
    model_override: Option<String>,
) -> Result<ResolvedLlm, Err> {
    let picked = match resolve_for_user(state, &user.id)? {
        Some(cfg) => cfg,
        None => env_config().ok_or_else(|| {
            err(
                StatusCode::BAD_REQUEST,
                "no LLM config — set yours in AI Config first",
            )
        })?,
    };

    let model = model_override
        .filter(|m| !m.trim().is_empty())
        .unwrap_or(picked.model);
    if model.trim().is_empty() {
        return Err(err(StatusCode::BAD_REQUEST, "no model selected"));
    }
    Ok(ResolvedLlm { model, ..picked })
}

// ---------------------------------------------------------------- handlers

/// ⚠️ 鐵律：呢個回應永遠唔可以含 `api_key`。一含就係 S1 重演。
pub async fn get_llm_config(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<CurrentUser>,
) -> Result<Json<LlmConfigInfo>, Err> {
    match load_row(&state, &user.id)? {
        Some(row) => Ok(Json(LlmConfigInfo {
            configured: true,
            endpoint: row.endpoint,
            model: row.model,
            key_hint: row.key_hint,
        })),
        None => Ok(Json(LlmConfigInfo {
            configured: false,
            endpoint: env_or_empty("AI_ENDPOINT"),
            model: env_or_empty("AI_MODEL"),
            key_hint: String::new(),
        })),
    }
}

pub async fn put_llm_config(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<CurrentUser>,
    Json(req): Json<SaveLlmConfig>,
) -> Result<Json<LlmConfigInfo>, Err> {
    let endpoint = validate_endpoint(&req.endpoint)?;
    let model = req.model.trim().to_string();

    let incoming = req.api_key.unwrap_or_default();
    let incoming = incoming.trim();

    let (api_key_enc, hint) = if incoming.is_empty() {
        // 淨係改 endpoint / model，keep 返舊 key
        let row = load_row(&state, &user.id)?
            .ok_or_else(|| err(StatusCode::BAD_REQUEST, "api_key is required"))?;
        (row.api_key_enc, row.key_hint)
    } else {
        let key = master_key()?;
        let enc = seal(key, incoming.as_bytes()).map_err(|e| {
            err(
                StatusCode::INTERNAL_SERVER_ERROR,
                &format!("encrypt error: {e}"),
            )
        })?;
        (enc, key_hint(incoming))
    };

    {
        let conn = state.db().lock().unwrap();
        conn.execute(
            "INSERT INTO user_llm_config (user_id, endpoint, model, api_key_enc, key_hint, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)
             ON CONFLICT(user_id) DO UPDATE SET
               endpoint = excluded.endpoint,
               model = excluded.model,
               api_key_enc = excluded.api_key_enc,
               key_hint = excluded.key_hint,
               updated_at = excluded.updated_at",
            params![user.id, endpoint, model, api_key_enc, hint, now_ms()],
        )
        .map_err(db_err)?;
    }

    Ok(Json(LlmConfigInfo {
        configured: true,
        endpoint,
        model,
        key_hint: hint,
    }))
}

pub async fn delete_llm_config(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<CurrentUser>,
) -> Result<StatusCode, Err> {
    let conn = state.db().lock().unwrap();
    conn.execute(
        "DELETE FROM user_llm_config WHERE user_id = ?1",
        params![user.id],
    )
    .map_err(db_err)?;
    Ok(StatusCode::NO_CONTENT)
}

/// 用「已存」嘅 key 拉型號列表。
///
/// 上游係 `GET /api/models?api_key=...`，條 key 入晒 access log 同瀏覽器歷史（S2）。
/// 而家改 POST + 唔收 key：由 session 查返，根本冇機會經過 URL。
pub async fn post_models(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<CurrentUser>,
) -> Result<Json<Vec<ModelInfo>>, Err> {
    let cfg = match resolve_for_user(&state, &user.id)? {
        Some(c) => c,
        None => env_config().ok_or_else(|| {
            err(
                StatusCode::BAD_REQUEST,
                "no LLM config — save your endpoint and API key first",
            )
        })?,
    };

    let client = AIClient::new(&cfg.endpoint, &cfg.api_key);
    let models = client
        .fetch_models()
        .await
        .map_err(|e| err(StatusCode::BAD_GATEWAY, &format!("AI error: {e}")))?;
    Ok(Json(models))
}

// ---------------------------------------------------------------- tests

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn master_key_accepts_hex_and_base64() {
        let hex = "00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff";
        assert!(parse_master_key(hex).is_some());
        use base64::{engine::general_purpose::STANDARD as B64, Engine};
        assert!(parse_master_key(&B64.encode([9u8; 32])).is_some());
        assert!(parse_master_key("too-short").is_none());
        assert!(parse_master_key(&B64.encode([9u8; 16])).is_none());
    }

    #[test]
    fn generated_master_key_parses() {
        assert!(parse_master_key(&gen_master_key_hex()).is_some());
    }

    #[test]
    fn allows_known_https_providers() {
        assert!(validate_endpoint("https://api.deepseek.com/v1").is_ok());
        assert!(
            validate_endpoint("https://generativelanguage.googleapis.com/v1beta/openai/").is_ok()
        );
        assert!(validate_endpoint("HTTPS://API.OPENAI.COM/v1").is_ok());
    }

    #[test]
    fn blocks_ssrf_targets() {
        // 雲端 metadata、內網、loopback —— S3 講嘅就係呢啲
        assert!(validate_endpoint("http://169.254.169.254/").is_err());
        assert!(validate_endpoint("http://localhost:3000/v1").is_err());
        assert!(validate_endpoint("http://127.0.0.1/v1").is_err());
        assert!(validate_endpoint("http://[::1]/v1").is_err());
        assert!(validate_endpoint("http://192.168.1.1/v1").is_err());
        assert!(validate_endpoint("http://2130706433/v1").is_err());
        assert!(validate_endpoint("file:///etc/passwd").is_err());
        assert!(validate_endpoint("gopher://evil.com/").is_err());
        assert!(validate_endpoint("").is_err());
    }

    #[test]
    fn blocks_lookalike_hosts() {
        // userinfo 扮 host：真正連去 evil.com
        assert!(validate_endpoint("https://api.openai.com@evil.com/v1").is_err());
        assert!(validate_endpoint("https://api.deepseek.com.evil.com/v1").is_err());
        assert!(validate_endpoint("https://evil.com/api.openai.com/v1").is_err());
        // 已知 host 但走 http 或者怪 port
        assert!(validate_endpoint("http://api.deepseek.com/v1").is_err());
        assert!(validate_endpoint("https://api.deepseek.com:8080/v1").is_err());
    }

    #[test]
    fn key_hint_never_leaks_short_keys() {
        assert_eq!(key_hint("sk-123"), "…");
        assert_eq!(key_hint("123456789012"), "…");
        assert_eq!(key_hint("sk-abcdefghijklmnop"), "sk-a…mnop");
        // hint 唔可以夠料砌返條 key
        assert!(!key_hint("sk-abcdefghijklmnop").contains("efghijkl"));
    }

    #[test]
    fn seal_roundtrip_through_stored_form() {
        let key = [3u8; 32];
        let enc = seal(&key, b"sk-secret-value").unwrap();
        assert!(!enc.contains("sk-secret"));
        assert_eq!(open_sealed(&key, &enc).unwrap(), b"sk-secret-value");
        assert!(open_sealed(&[4u8; 32], &enc).is_err());
    }
}
