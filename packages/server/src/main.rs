mod routes;

use axum::{routing::{get, post}, Router};
use std::sync::Arc;
use routes::AppState;
use quizseek_core::config::ConfigStore;
use tower_http::cors::{CorsLayer, Any};
use tower_http::services::ServeDir;

#[tokio::main]
async fn main() {
    let config_store = ConfigStore::new("QuizSeekServer").unwrap_or_else(|_| {
        eprintln!("Warning: could not init config store, using transient store");
        ConfigStore::new("QuizSeekServerTransient").unwrap()
    });

    let state = Arc::new(AppState { config_store });

    let static_dir =
        std::env::var("STATIC_DIR").unwrap_or_else(|_| "../frontend/dist".to_string());

    let app = Router::new()
        .route("/api/models", get(routes::get_models))
        .route("/api/generate", post(routes::generate_exam_handler))
        .route("/api/answer", post(routes::answer_handler))
        .route("/api/judge", post(routes::judge_handler))
        .route("/api/export", get(routes::export_handler))
        .route("/api/export/xlsx", post(routes::export_xlsx_handler))
        .route("/api/config/save", post(routes::save_config_handler))
        .route("/api/config/load", get(routes::load_config_handler))
        .fallback_service(ServeDir::new(&static_dir))
        .layer(CorsLayer::new().allow_origin(Any).allow_methods(Any).allow_headers(Any))
        .with_state(state);

    let port: u16 = std::env::var("PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(3000);

    let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{port}"))
        .await
        .unwrap();
    println!("QuizSeek server running on http://localhost:{port}");
    axum::serve(listener, app).await.unwrap();
}
