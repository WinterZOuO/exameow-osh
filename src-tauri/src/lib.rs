use exambot_core::ai::{AIClient, ModelInfo};
use exambot_core::config::{AIConfigData, ConfigStore};
use exambot_core::exam::{generate_exam as core_generate_exam, ExamParams, Question};
use exambot_core::export::export_csv as core_export_csv;
use exambot_core::parser::parse_file;
use serde::Serialize;
use std::fmt;

const APP_NAME: &str = "ExamBot";

#[derive(Debug, Serialize)]
pub struct CommandError(String);

impl fmt::Display for CommandError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        self.0.fmt(f)
    }
}

impl std::error::Error for CommandError {}

#[derive(Serialize)]
pub struct GenerateResult {
    pub questions: Vec<Question>,
}

#[tauri::command]
async fn get_models(endpoint: String, api_key: String) -> Result<Vec<ModelInfo>, CommandError> {
    let client = AIClient::new(&endpoint, &api_key);
    client
        .fetch_models()
        .await
        .map_err(|e| CommandError(format!("Failed to fetch models: {e}")))
}

#[tauri::command]
async fn generate_exam(
    file_path: String,
    params_json: String,
    endpoint: String,
    api_key: String,
    model: String,
) -> Result<GenerateResult, CommandError> {
    let text = parse_file(&file_path).map_err(|e| CommandError(format!("File parse error: {e}")))?;

    let params: ExamParams = serde_json::from_str(&params_json)
        .map_err(|e| CommandError(format!("Invalid params JSON: {e}")))?;

    let client = AIClient::new(&endpoint, &api_key);
    let questions = core_generate_exam(&client, &text, &params, &model)
        .await
        .map_err(|e| CommandError(format!("Exam generation error: {e}")))?;

    Ok(GenerateResult { questions })
}

#[tauri::command]
fn export_csv(questions_json: String, save_path: String) -> Result<(), CommandError> {
    let questions: Vec<Question> = serde_json::from_str(&questions_json)
        .map_err(|e| CommandError(format!("Invalid questions JSON: {e}")))?;
    core_export_csv(&questions, &save_path)
        .map_err(|e| CommandError(format!("CSV export error: {e}")))
}

#[tauri::command]
fn save_config(endpoint: String, api_key: String, model: String) -> Result<(), CommandError> {
    let store = ConfigStore::new(APP_NAME)
        .map_err(|e| CommandError(format!("Config init error: {e}")))?;
    store
        .save(&endpoint, &api_key, &model)
        .map_err(|e| CommandError(format!("Config save error: {e}")))
}

#[tauri::command]
fn load_config() -> Result<Option<AIConfigData>, CommandError> {
    let store = ConfigStore::new(APP_NAME)
        .map_err(|e| CommandError(format!("Config init error: {e}")))?;
    store
        .load()
        .map_err(|e| CommandError(format!("Config load error: {e}")))
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! ExamBot is ready.", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            get_models,
            generate_exam,
            export_csv,
            save_config,
            load_config,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
