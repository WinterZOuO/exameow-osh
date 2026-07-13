use axum::{
    extract::{Multipart, Query, State},
    http::{header, StatusCode},
    response::Response,
    Json,
};
use exambot_core::ai::{AIClient, ModelInfo};
use exambot_core::config::{AIConfigData, ConfigStore};
use exambot_core::exam::{generate_exam, ExamParams, Question};
use exambot_core::parser::parse_file;
use serde::{Deserialize, Serialize};
use std::io::Write;
use std::sync::Arc;

pub struct AppState {
    pub config_store: ConfigStore,
}

#[derive(Deserialize)]
pub struct ModelsQuery {
    pub endpoint: String,
    pub api_key: String,
}

#[derive(Serialize)]
pub struct GenerateResult {
    pub questions: Vec<Question>,
}

#[derive(Deserialize)]
pub struct ExportQuery {
    pub questions: String,
}

pub async fn get_models(
    Query(params): Query<ModelsQuery>,
) -> Result<Json<Vec<ModelInfo>>, (StatusCode, String)> {
    let client = AIClient::new(&params.endpoint, &params.api_key);
    let models = client
        .fetch_models()
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, format!("AI error: {e}")))?;
    Ok(Json(models))
}

pub async fn generate_exam_handler(
    State(_state): State<Arc<AppState>>,
    mut multipart: Multipart,
) -> Result<Json<GenerateResult>, (StatusCode, String)> {
    let mut file_data: Option<Vec<u8>> = None;
    let mut file_name = String::new();
    let mut params_json = String::new();
    let mut endpoint = String::new();
    let mut api_key = String::new();
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
            "endpoint" => {
                endpoint = field
                    .text()
                    .await
                    .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?
            }
            "api_key" => {
                api_key = field
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

    let file_data =
        file_data.ok_or((StatusCode::BAD_REQUEST, "No file uploaded".to_string()))?;

    let params: ExamParams = serde_json::from_str(&params_json)
        .map_err(|e| (StatusCode::BAD_REQUEST, format!("Invalid params: {e}")))?;

    let ext = file_name.rsplit('.').next().unwrap_or("txt");
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

    let text = if ext == "txt" {
        std::fs::read_to_string(&temp_path_str)
            .map_err(|e| (StatusCode::BAD_REQUEST, format!("Read error: {e}")))?
    } else {
        parse_file(&temp_path_str)
            .map_err(|e| (StatusCode::BAD_REQUEST, format!("Parse error: {e}")))?
    };

    let _ = std::fs::remove_file(&temp_path_str);

    let client = AIClient::new(&endpoint, &api_key);
    let questions = generate_exam(&client, &text, &params, &model)
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
    exambot_core::export::export_csv_to_writer(&questions, &mut buf)
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

pub async fn export_kaoshibao_handler(
    Json(questions): Json<Vec<Question>>,
) -> Result<Response, (StatusCode, String)> {
    let data = exambot_core::export::export_kaoshibao_to_writer(&questions)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Response::builder()
        .header(
            header::CONTENT_TYPE,
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        .header(
            header::CONTENT_DISPOSITION,
            "attachment; filename=\"exambot_kaoshibao.xlsx\"",
        )
        .body(axum::body::Body::from(data))
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
}

pub async fn save_config_handler(
    State(_state): State<Arc<AppState>>,
    Json(config): Json<AIConfigData>,
) -> Result<StatusCode, (StatusCode, String)> {
    _state
        .config_store
        .save(&config.endpoint, &config.api_key, &config.model)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Save error: {e}")))?;
    Ok(StatusCode::OK)
}

pub async fn load_config_handler(
    State(_state): State<Arc<AppState>>,
) -> Result<Json<Option<AIConfigData>>, (StatusCode, String)> {
    let config = _state
        .config_store
        .load()
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Load error: {e}")))?;
    Ok(Json(config))
}
