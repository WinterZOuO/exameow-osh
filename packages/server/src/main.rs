mod routes;

use axum::{routing::{get, post}, Router};
use std::sync::Arc;
use routes::AppState;
use exambot_core::config::ConfigStore;
use tower_http::cors::{CorsLayer, Any};
use tower_http::services::ServeDir;

#[tokio::main]
async fn main() {
    let config_store = ConfigStore::new("ExamBotServer").unwrap_or_else(|_| {
        eprintln!("Warning: could not init config store, using transient store");
        ConfigStore::new("ExamBotServerTransient").unwrap()
    });

    let state = Arc::new(AppState { config_store });

    let app = Router::new()
        .route("/api/models", get(routes::get_models))
        .route("/api/generate", post(routes::generate_exam_handler))
        .route("/api/export", get(routes::export_handler))
        .route("/api/config/save", post(routes::save_config_handler))
        .route("/api/config/load", get(routes::load_config_handler))
        .nest_service("/", ServeDir::new("../frontend/dist"))
        .layer(CorsLayer::new().allow_origin(Any).allow_methods(Any).allow_headers(Any))
        .with_state(state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    println!("ExamBot server running on http://localhost:3000");
    axum::serve(listener, app).await.unwrap();
}
