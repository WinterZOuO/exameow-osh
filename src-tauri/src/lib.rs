use exameow_core::ai::{AIClient, ModelInfo};
use exameow_core::config::{AIConfigData, ConfigStore, VisionConfigData};
use exameow_core::exam::{
    answer_question as core_answer_question, extract_question_text as core_extract_question_text,
    generate_exam as core_generate_exam,
    judge_answer as core_judge_answer, AnswerResult, ExamParams, JudgeResult, Question,
};
use exameow_core::export::export_csv as core_export_csv;
use exameow_core::export::export_xlsx as core_export_xlsx;
use exameow_core::parser::parse_file;
use serde::Serialize;
use std::fmt;
#[cfg(target_os = "macos")]
fn make_webview_transparent(win: &tauri::WebviewWindow) {
    use objc::runtime::{Class, Object, NO};
    use objc::{msg_send, sel, sel_impl};
    if let Ok(ptr) = win.ns_window() {
        unsafe {
            let ns_window = ptr as *mut Object;
            let clear: *mut Object = msg_send![Class::get("NSColor").unwrap(), clearColor];
            let _: () = msg_send![ns_window, setOpaque: NO];
            let _: () = msg_send![ns_window, setBackgroundColor: clear];
        }
    }
}

use tauri::Manager;
use base64::Engine;

const APP_NAME: &str = "Exameow";

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
    let params: ExamParams = serde_json::from_str(&params_json)
        .map_err(|e| CommandError(format!("Invalid params JSON: {e}")))?;

    let text = if params.text.is_some() {
        params.text.clone().unwrap()
    } else {
        parse_file(&file_path).map_err(|e| CommandError(format!("File parse error: {e}")))?
    };

    let client = AIClient::new(&endpoint, &api_key);
    let questions = core_generate_exam(&client, &text, &params, &model)
        .await
        .map_err(|e| CommandError(format!("Exam generation error: {e}")))?;

    Ok(GenerateResult { questions })
}

#[tauri::command]
async fn answer_question(
    question: String,
    language: String,
    endpoint: String,
    api_key: String,
    model: String,
) -> Result<AnswerResult, CommandError> {
    if question.trim().is_empty() {
        return Err(CommandError("Question is empty".to_string()));
    }
    let client = AIClient::new(&endpoint, &api_key);
    core_answer_question(&client, &question, &language, &model)
        .await
        .map_err(|e| CommandError(format!("Answer error: {e}")))
}

#[tauri::command]
async fn judge_answer(
    stem: String,
    reference_answer: String,
    analysis: String,
    user_answer: String,
    language: String,
    endpoint: String,
    api_key: String,
    model: String,
) -> Result<JudgeResult, CommandError> {
    if user_answer.trim().is_empty() {
        return Err(CommandError("User answer is empty".to_string()));
    }
    let client = AIClient::new(&endpoint, &api_key);
    core_judge_answer(
        &client,
        &stem,
        &reference_answer,
        &analysis,
        &user_answer,
        &language,
        &model,
    )
    .await
    .map_err(|e| CommandError(format!("Judge error: {e}")))
}

#[tauri::command]
async fn extract_question_text(
    image_data_url: String,
    endpoint: String,
    api_key: String,
    model: String,
) -> Result<String, CommandError> {
    if image_data_url.trim().is_empty() {
        return Err(CommandError("Image is empty".to_string()));
    }
    let client = AIClient::new(&endpoint, &api_key);
    core_extract_question_text(&client, &image_data_url, &model)
        .await
        .map_err(|e| CommandError(format!("Extract error: {e}")))
}

#[tauri::command]
fn parse_file_text(file_path: String) -> Result<String, CommandError> {
    parse_file(&file_path).map_err(|e| CommandError(format!("File parse error: {e}")))
}

#[tauri::command]
fn parse_file_bytes(base64_data: String, file_ext: String) -> Result<String, CommandError> {
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(&base64_data)
        .map_err(|e| CommandError(format!("Base64 decode error: {e}")))?;

    let dir = std::env::temp_dir();
    let file_name = format!("exameow_upload.{}", file_ext);
    let file_path = dir.join(&file_name);

    std::fs::write(&file_path, &bytes)
        .map_err(|e| CommandError(format!("Write temp file error: {e}")))?;

    let result = parse_file(file_path.to_string_lossy().as_ref());
    let _ = std::fs::remove_file(&file_path);
    result.map_err(|e| CommandError(format!("File parse error: {e}")))
}

#[tauri::command]
fn export_csv(questions_json: String, save_path: String) -> Result<(), CommandError> {
    let questions: Vec<Question> = serde_json::from_str(&questions_json)
        .map_err(|e| CommandError(format!("Invalid questions JSON: {e}")))?;
    core_export_csv(&questions, &save_path)
        .map_err(|e| CommandError(format!("CSV export error: {e}")))
}

#[tauri::command]
fn export_xlsx(questions_json: String, save_path: String) -> Result<(), CommandError> {
    let questions: Vec<Question> = serde_json::from_str(&questions_json)
        .map_err(|e| CommandError(format!("Invalid questions JSON: {e}")))?;
    core_export_xlsx(&questions, &save_path)
        .map_err(|e| CommandError(format!("XLSX export error: {e}")))
}

#[tauri::command]
fn export_xlsx_data(questions_json: String) -> Result<String, CommandError> {
    let questions: Vec<Question> = serde_json::from_str(&questions_json)
        .map_err(|e| CommandError(format!("Invalid questions JSON: {e}")))?;
    let data = exameow_core::export::export_xlsx_to_writer(&questions)
        .map_err(|e| CommandError(format!("Export XLSX error: {e}")))?;
    Ok(base64::engine::general_purpose::STANDARD.encode(&data))
}

#[tauri::command]
fn save_to_downloads(filename: String, content_base64: String) -> Result<String, CommandError> {
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(&content_base64)
        .map_err(|e| CommandError(format!("Base64 decode error: {e}")))?;
    let dir = std::path::Path::new("/storage/emulated/0/Download/Exameow");
    std::fs::create_dir_all(dir)
        .map_err(|e| CommandError(format!("Create dir error: {e}")))?;
    let path = dir.join(&filename);
    std::fs::write(&path, &bytes)
        .map_err(|e| CommandError(format!("Write error: {e}")))?;
    Ok(path.to_string_lossy().to_string())
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
fn save_vision_config(
    mode: String,
    endpoint: String,
    api_key: String,
    model: String,
) -> Result<(), CommandError> {
    let store = ConfigStore::new(APP_NAME)
        .map_err(|e| CommandError(format!("Config init error: {e}")))?;
    store
        .save_vision(&VisionConfigData { mode, endpoint, api_key, model })
        .map_err(|e| CommandError(format!("Vision config save error: {e}")))
}

#[tauri::command]
fn load_vision_config() -> Result<Option<VisionConfigData>, CommandError> {
    let store = ConfigStore::new(APP_NAME)
        .map_err(|e| CommandError(format!("Config init error: {e}")))?;
    store
        .load_vision()
        .map_err(|e| CommandError(format!("Vision config load error: {e}")))
}

#[tauri::command]
fn capture_screen(x: i32, y: i32, w: i32, h: i32) -> Result<String, CommandError> {
    let monitors = xcap::Monitor::all()
        .map_err(|e| CommandError(format!("Failed to enumerate monitors: {e}")))?;
    let primary = monitors
        .into_iter()
        .next()
        .ok_or_else(|| CommandError("No monitor found".to_string()))?;
    let captured = primary
        .capture_image()
        .map_err(|e| CommandError(format!("Failed to capture screen: {e}")))?;
    let mut dyn_img = image::DynamicImage::ImageRgba8(captured);
    let cropped = dyn_img.crop(
        x.max(0) as u32,
        y.max(0) as u32,
        w.max(1) as u32,
        h.max(1) as u32,
    );
    let mut buf = std::io::Cursor::new(Vec::new());
    cropped
        .write_to(&mut buf, image::ImageFormat::Jpeg)
        .map_err(|e| CommandError(format!("Failed to encode JPEG: {e}")))?;
    Ok(base64::engine::general_purpose::STANDARD.encode(buf.into_inner()))
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! Exameow is ready.", name)
}

#[tauri::command]
fn create_record_windows(
    app: tauri::AppHandle,
    overlay_x: f64,
    overlay_y: f64,
    overlay_w: f64,
    overlay_h: f64,
    float_x: f64,
    float_y: f64,
    float_w: f64,
    float_h: f64,
) -> Result<(), CommandError> {
    #[cfg(debug_assertions)]
    let overlay_url = tauri::WebviewUrl::External("http://localhost:5273/#/src-windows/record-overlay".parse().unwrap());
    #[cfg(not(debug_assertions))]
    let overlay_url = tauri::WebviewUrl::App("/index.html#/src-windows/record-overlay".into());

    let _overlay = tauri::WebviewWindowBuilder::new(
        &app,
        "record-overlay",
        overlay_url,
    )
    .position(overlay_x, overlay_y)
    .inner_size(overlay_w, overlay_h)
    .decorations(false)
    .transparent(true)
    .always_on_top(true)
    .resizable(true)
    .visible(true)
    .build()
    .map_err(|e| CommandError(format!("Failed to create record-overlay: {e}")))?;

    #[cfg(target_os = "macos")]
    make_webview_transparent(&_overlay);

    #[cfg(debug_assertions)]
    let float_url = tauri::WebviewUrl::External("http://localhost:5273/#/src-windows/answer-float".parse().unwrap());
    #[cfg(not(debug_assertions))]
    let float_url = tauri::WebviewUrl::App("/index.html#/src-windows/answer-float".into());

    let _float = tauri::WebviewWindowBuilder::new(
        &app,
        "answer-float",
        float_url,
    )
    .position(float_x, float_y)
    .inner_size(float_w, float_h)
    .decorations(false)
    .always_on_top(true)
    .resizable(true)
    .visible(true)
    .build()
    .map_err(|e| CommandError(format!("Failed to create answer-float: {e}")))?;

    Ok(())
}

#[tauri::command]
fn close_record_windows(app: tauri::AppHandle) -> Result<(), CommandError> {
    if let Some(w) = app.get_webview_window("record-overlay") {
        w.close().ok();
    }
    if let Some(w) = app.get_webview_window("answer-float") {
        w.close().ok();
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_sharekit::init())
        .setup(|app| {
            let config = &app.config().app.windows[0];
            let mut builder = tauri::WebviewWindowBuilder::from_config(app.handle(), config)?;

            #[cfg(target_os = "macos")]
            {
                builder = builder
                    .title_bar_style(tauri::TitleBarStyle::Overlay)
                    .hidden_title(true);
            }

            #[cfg(any(target_os = "windows", target_os = "linux"))]
            {
                builder = builder.decorations(false);
            }

            let window = builder.build()?;

            #[cfg(not(target_os = "android"))]
            window.show()?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            get_models,
            generate_exam,
            answer_question,
            judge_answer,
            extract_question_text,
            parse_file_text,
            parse_file_bytes,
            export_csv,
            export_xlsx,
            export_xlsx_data,
            save_to_downloads,
            save_config,
            load_config,
            save_vision_config,
            load_vision_config,
            capture_screen,
            create_record_windows,
            close_record_windows,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
