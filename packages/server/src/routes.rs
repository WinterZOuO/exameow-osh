use axum::{
    extract::{Multipart, Query, State},
    http::{header, StatusCode},
    response::Response,
    Extension, Json,
};
use exameow_core::ai::AIClient;
use exameow_core::exam::{
    answer_question, explain_question, generate_exam, judge_answer, AnswerResult, ExamParams,
    ExplainResult, JudgeResult, Question,
};
use exameow_core::parser::parse_file;
use serde::{Deserialize, Serialize};
use std::io::Write;
use std::sync::{Arc, Mutex};

use crate::auth::CurrentUser;
use crate::llm;

pub struct AppState {
    pub relay: crate::relay::RelayState,
    pub admin_token: Mutex<String>,
}

impl AppState {
    /// 全個 app 共用同一個 SQLite handle（由 relay::init_db 開）
    pub fn db(&self) -> &Mutex<rusqlite::Connection> {
        &self.relay.conn
    }
}

#[derive(Serialize)]
pub struct GenerateResult {
    pub questions: Vec<Question>,
}

#[derive(Deserialize)]
pub struct ExportQuery {
    pub questions: String,
}

fn ai_endpoint() -> String {
    std::env::var("AI_ENDPOINT").unwrap_or_default()
}
fn ai_api_key() -> String {
    std::env::var("AI_API_KEY").unwrap_or_default()
}
fn ai_model() -> String {
    std::env::var("AI_MODEL").unwrap_or_default()
}

/// W3 之後所有 AI handler 都行呢條路：由 session user 查返自己嘅 endpoint + key。
/// request body 唔再帶 `api_key` / `endpoint` —— 帶都冇用，冇 handler 會睇。
fn resolve(
    state: &AppState,
    user: &CurrentUser,
    model_override: Option<String>,
) -> Result<llm::ResolvedLlm, (StatusCode, String)> {
    llm::resolve_or_env(state, user, model_override)
}

fn default_language(lang: Option<String>) -> String {
    lang.filter(|s| !s.is_empty())
        .unwrap_or_else(|| "Chinese".to_string())
}

pub async fn generate_exam_handler(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<CurrentUser>,
    mut multipart: Multipart,
) -> Result<Json<GenerateResult>, (StatusCode, String)> {
    let mut file_data: Option<Vec<u8>> = None;
    let mut file_name = String::new();
    let mut params_json = String::new();
    let mut model = String::new();

    while let Ok(Some(field)) = multipart.next_field().await {
        let name = field.name().unwrap_or("").to_string();
        match name.as_str() {
            "file" => {
                file_name = field.file_name().unwrap_or("unknown").to_string();
                file_data = Some(
                    field
                        .bytes()
                        .await
                        .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?
                        .to_vec(),
                );
            }
            "params" => {
                params_json = field
                    .text()
                    .await
                    .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?
            }
            "model" => {
                model = field
                    .text()
                    .await
                    .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?
            }
            _ => {}
        }
    }

    let file_data = file_data.ok_or((StatusCode::BAD_REQUEST, "No file uploaded".to_string()))?;
    let cfg = resolve(&state, &user, Some(model))?;

    let params: ExamParams = serde_json::from_str(&params_json)
        .map_err(|e| (StatusCode::BAD_REQUEST, format!("Invalid params: {e}")))?;

    let ext = file_name.rsplit_once('.').map(|(_, e)| e).unwrap_or("txt");
    let mut temp_file = tempfile::Builder::new()
        .suffix(&format!(".{ext}"))
        .tempfile()
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    temp_file
        .write_all(&file_data)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let (_, temp_path) = temp_file
        .keep()
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let temp_path_str = temp_path.to_string_lossy().to_string();

    let text = parse_file(&temp_path_str)
        .map_err(|e| (StatusCode::BAD_REQUEST, format!("Parse error: {e}")))?;

    let _ = std::fs::remove_file(&temp_path_str);

    let client = AIClient::new(&cfg.endpoint, &cfg.api_key);
    let questions = generate_exam(&client, &text, &params, &cfg.model)
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, format!("AI error: {e}")))?;

    Ok(Json(GenerateResult { questions }))
}

pub async fn export_handler(
    Query(params): Query<ExportQuery>,
) -> Result<Response, (StatusCode, String)> {
    let questions: Vec<Question> = serde_json::from_str(&params.questions)
        .map_err(|e| (StatusCode::BAD_REQUEST, format!("Invalid questions JSON: {e}")))?;

    let mut buf = vec![];
    exameow_core::export::export_csv_to_writer(&questions, &mut buf)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Response::builder()
        .header(header::CONTENT_TYPE, "text/csv; charset=utf-8")
        .header(
            header::CONTENT_DISPOSITION,
            "attachment; filename=\"questions.csv\"",
        )
        .body(axum::body::Body::from(buf))
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
}

pub async fn export_xlsx_handler(
    Json(questions): Json<Vec<Question>>,
) -> Result<Response, (StatusCode, String)> {
    let data = exameow_core::export::export_xlsx_to_writer(&questions)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Response::builder()
        .header(
            header::CONTENT_TYPE,
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        .header(
            header::CONTENT_DISPOSITION,
            "attachment; filename=\"exameow_questions.xlsx\"",
        )
        .body(axum::body::Body::from(data))
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
}

#[derive(Deserialize)]
pub struct AnswerRequest {
    pub question: String,
    pub language: Option<String>,
    pub model: Option<String>,
}

pub async fn answer_handler(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<CurrentUser>,
    Json(req): Json<AnswerRequest>,
) -> Result<Json<AnswerResult>, (StatusCode, String)> {
    if req.question.trim().is_empty() {
        return Err((StatusCode::BAD_REQUEST, "Question is empty".to_string()));
    }
    let cfg = resolve(&state, &user, req.model)?;
    let language = default_language(req.language);

    let client = AIClient::new(&cfg.endpoint, &cfg.api_key);
    let result = answer_question(&client, &req.question, &language, &cfg.model)
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, format!("AI error: {e}")))?;
    Ok(Json(result))
}

#[derive(Deserialize)]
pub struct JudgeRequest {
    pub stem: String,
    pub reference_answer: String,
    pub analysis: Option<String>,
    pub user_answer: String,
    pub language: Option<String>,
    pub model: Option<String>,
}

pub async fn judge_handler(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<CurrentUser>,
    Json(req): Json<JudgeRequest>,
) -> Result<Json<JudgeResult>, (StatusCode, String)> {
    if req.user_answer.trim().is_empty() {
        return Err((StatusCode::BAD_REQUEST, "User answer is empty".to_string()));
    }
    let cfg = resolve(&state, &user, req.model)?;
    let language = default_language(req.language);
    let analysis = req.analysis.unwrap_or_default();

    let client = AIClient::new(&cfg.endpoint, &cfg.api_key);
    let result = judge_answer(
        &client,
        &req.stem,
        &req.reference_answer,
        &analysis,
        &req.user_answer,
        &language,
        &cfg.model,
    )
    .await
    .map_err(|e| (StatusCode::BAD_GATEWAY, format!("AI error: {e}")))?;
    Ok(Json(result))
}

#[derive(Deserialize)]
pub struct ExplainRequest {
    pub stem: String,
    pub reference_answer: String,
    pub analysis: Option<String>,
    pub language: Option<String>,
    pub model: Option<String>,
}

pub async fn explain_handler(
    State(state): State<Arc<AppState>>,
    Extension(user): Extension<CurrentUser>,
    Json(req): Json<ExplainRequest>,
) -> Result<Json<ExplainResult>, (StatusCode, String)> {
    if req.stem.trim().is_empty() {
        return Err((StatusCode::BAD_REQUEST, "Question is empty".to_string()));
    }
    let cfg = resolve(&state, &user, req.model)?;
    let language = default_language(req.language);
    let analysis = req.analysis.unwrap_or_default();

    let client = AIClient::new(&cfg.endpoint, &cfg.api_key);
    let result = explain_question(
        &client,
        &req.stem,
        &req.reference_answer,
        &analysis,
        &language,
        &cfg.model,
    )
    .await
    .map_err(|e| (StatusCode::BAD_GATEWAY, format!("AI error: {e}")))?;
    Ok(Json(result))
}

#[derive(Serialize)]
pub struct ServerConfigInfo {
    pub has_env_ai: bool,
    pub endpoint: String,
    pub model: String,
}

/// server 自己有冇一套 env AI 設定。**唔會**回傳條 key。
pub async fn server_config_info_handler() -> Json<ServerConfigInfo> {
    let endpoint = ai_endpoint();
    let api_key = ai_api_key();
    let model = ai_model();
    Json(ServerConfigInfo {
        has_env_ai: !endpoint.is_empty() && !api_key.is_empty(),
        endpoint,
        model,
    })
}
