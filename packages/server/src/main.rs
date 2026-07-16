mod routes;

use axum::{
    extract::Request,
    http::StatusCode,
    middleware::{self, Next},
    response::Response,
    routing::{get, post},
    Router,
};
use std::sync::Arc;
use routes::AppState;
use exambot_core::config::ConfigStore;
use tower_http::cors::{CorsLayer, Any};
use tower_http::services::ServeDir;

async fn api_key_auth(req: Request, next: Next) -> Result<Response, StatusCode> {
    let expected = std::env::var("API_KEY").unwrap_or_default();
    if expected.is_empty() {
        return Ok(next.run(req).await);
    }

    let key = req
        .headers()
        .get("X-API-Key")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");

    if key != expected {
        return Err(StatusCode::UNAUTHORIZED);
    }

    Ok(next.run(req).await)
}

#[tokio::main]
async fn main() {
    let config_store = ConfigStore::new("ExamBotServer").unwrap_or_else(|_| {
        eprintln!("Warning: could not init config store, using transient store");
        ConfigStore::new("ExamBotServerTransient").unwrap()
    });

    let state = Arc::new(AppState { config_store });

    let static_dir =
        std::env::var("STATIC_DIR").unwrap_or_else(|_| "../frontend/dist".to_string());

    let api_routes = Router::new()
        .route("/api/models", get(routes::get_models))
        .route("/api/generate", post(routes::generate_exam_handler))
        .route("/api/export", get(routes::export_handler))
        .route("/api/export/xlsx", post(routes::export_xlsx_handler))
        .route("/api/config/save", post(routes::save_config_handler))
        .route("/api/config/load", get(routes::load_config_handler))
        .layer(middleware::from_fn(api_key_auth));

    let app = Router::new()
        .merge(api_routes)
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
    println!("ExamBot server running on http://localhost:{port}");
    axum::serve(listener, app).await.unwrap();
}
