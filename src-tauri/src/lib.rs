use exambot_core::ai::{AIClient, ModelInfo};
use exambot_core::config::{AIConfigData, ConfigStore};
use exambot_core::exam::{generate_exam as core_generate_exam, ExamParams, Question};
use exambot_core::export::export_csv as core_export_csv;
use exambot_core::export::export_kaoshibao as core_export_kaoshibao;
use exambot_core::parser::parse_file;
use serde::Serialize;
use std::fmt;
use base64::Engine;

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
fn parse_file_text(file_path: String) -> Result<String, CommandError> {
    parse_file(&file_path).map_err(|e| CommandError(format!("File parse error: {e}")))
}

#[tauri::command]
fn parse_file_bytes(base64_data: String, file_ext: String) -> Result<String, CommandError> {
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(&base64_data)
        .map_err(|e| CommandError(format!("Base64 decode error: {e}")))?;

    let dir = std::env::temp_dir();
    let file_name = format!("exambot_upload.{}", file_ext);
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
fn export_kaoshibao(questions_json: String, save_path: String) -> Result<(), CommandError> {
    let questions: Vec<Question> = serde_json::from_str(&questions_json)
        .map_err(|e| CommandError(format!("Invalid questions JSON: {e}")))?;
    core_export_kaoshibao(&questions, &save_path)
        .map_err(|e| CommandError(format!("XLSX export error: {e}")))
}

#[tauri::command]
fn export_xlsx_data(questions_json: String) -> Result<String, CommandError> {
    let questions: Vec<Question> = serde_json::from_str(&questions_json)
        .map_err(|e| CommandError(format!("Invalid questions JSON: {e}")))?;
    let data = exambot_core::export::export_kaoshibao_to_writer(&questions)
        .map_err(|e| CommandError(format!("Export XLSX error: {e}")))?;
    Ok(base64::engine::general_purpose::STANDARD.encode(&data))
}

#[tauri::command]
fn save_to_downloads(filename: String, content_base64: String) -> Result<String, CommandError> {
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(&content_base64)
        .map_err(|e| CommandError(format!("Base64 decode error: {e}")))?;
    let dir = std::path::Path::new("/storage/emulated/0/Download/ExamBot");
    std::fs::create_dir_all(dir)
        .map_err(|e| CommandError(format!("Create dir error: {e}")))?;
    let path = dir.join(&filename);
    std::fs::write(&path, &bytes)
        .map_err(|e| CommandError(format!("Write error: {e}")))?;
    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
fn share_file(path: String) -> Result<(), CommandError> {
    #[cfg(target_os = "android")]
    {
        std::thread::spawn(move || {
            let ctx = ndk_context::android_context();
            let jvm = ctx.vm() as *mut jni::sys::JavaVM;
            let activity = ctx.context();
            if jvm.is_null() || activity.is_null() { return; }
            let vm = unsafe { jni::JavaVM::from_raw(jvm) }.unwrap();
            let mut env = vm.attach_current_thread().unwrap();

            let intent = env.new_object("android/content/Intent", "()V", &[]).unwrap();
            let action_send = env.get_static_field("android/content/Intent", "ACTION_SEND", "Ljava/lang/String;").unwrap().l().unwrap();
            env.call_method(&intent, "setAction", "(Ljava/lang/String;)Landroid/content/Intent;", &[(&action_send).into()]).unwrap();

            let mime = if path.ends_with(".xlsx") { "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" } else { "text/csv" };
            env.call_method(&intent, "setType", "(Ljava/lang/String;)Landroid/content/Intent;", &[env.new_string(mime).unwrap().into()]).unwrap();

            let uri = env.call_static_method("android/net/Uri", "parse", "(Ljava/lang/String;)Landroid/net/Uri;", &[env.new_string(&format!("file://{}", path)).unwrap().into()]).unwrap().l().unwrap();
            let extra_stream = env.get_static_field("android/content/Intent", "EXTRA_STREAM", "Ljava/lang/String;").unwrap().l().unwrap();
            env.call_method(&intent, "putExtra", "(Ljava/lang/String;Landroid/os/Parcelable;)Landroid/content/Intent;", &[(&extra_stream).into(), (&uri).into()]).unwrap();

            let read_flags = env.get_static_field("android/content/Intent", "FLAG_GRANT_READ_URI_PERMISSION", "I").unwrap().i().unwrap();
            env.call_method(&intent, "addFlags", "(I)Landroid/content/Intent;", &[read_flags.into()]).unwrap();

            let chooser = env.call_static_method("android/content/Intent", "createChooser", "(Landroid/content/Intent;Ljava/lang/CharSequence;)Landroid/content/Intent;", &[(&intent).into(), env.new_string("Share via").unwrap().into()]).unwrap().l().unwrap();

            let activity_obj = unsafe { jni::objects::JObject::from_raw(activity as jni::sys::jobject) };
            env.call_method(&activity_obj, "startActivity", "(Landroid/content/Intent;)V", &[(&chooser).into()]).unwrap();
        });
    }
    Ok(())
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
            parse_file_text,
            parse_file_bytes,
            export_csv,
            export_kaoshibao,
            export_xlsx_data,
            save_to_downloads,
            share_file,
            save_config,
            load_config,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
