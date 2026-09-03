mod auth;
mod relay;
mod routes;

use axum::{
    http::{header, HeaderValue, Method},
    middleware,
    routing::{delete, get, post},
    Router,
};
use exameow_core::config::ConfigStore;
use routes::AppState;
use std::sync::{Arc, Mutex};
use tower_http::cors::CorsLayer;
use tower_http::services::ServeDir;

/// 預設完全唔開 CORS —— 生產環境個 app 自己 serve 前端，同源就夠。
/// 只有本機開發（vite dev server 喺另一個 port）先設 CORS_ORIGIN。
/// 注意：帶 credentials 嘅 CORS 唔可以用萬用字元，所以要逐個 origin 列明。
fn cors_layer() -> Option<CorsLayer> {
    let raw = std::env::var("CORS_ORIGIN").ok()?;
    let origins: Vec<HeaderValue> = raw
        .split(',')
        .filter_map(|o| o.trim().parse().ok())
        .collect();
    if origins.is_empty() {
        return None;
    }
    println!("CORS enabled for: {raw}");
    Some(
        CorsLayer::new()
            .allow_origin(origins)
            .allow_methods([Method::GET, Method::POST, Method::DELETE, Method::OPTIONS])
            .allow_headers([header::CONTENT_TYPE, header::ACCEPT])
            .allow_credentials(true),
    )
}

/// 設定錯誤唔應該 panic —— panic 會印一大堆 backtrace 提示，睇落似程式炸咗，
/// 而且 compose 有 restart: unless-stopped 會變成無限 crash-loop。
fn fatal(msg: &str) -> ! {
    eprintln!();
    eprintln!("啟動失敗：{msg}");
    eprintln!();
    std::process::exit(1);
}

#[tokio::main]
async fn main() {
    let config_store = ConfigStore::new("ExameowServer").unwrap_or_else(|_| {
        eprintln!("Warning: could not init config store, using transient store");
        ConfigStore::new("ExameowServerTransient").unwrap()
    });
    let db_path = std::env::var("EXAM_DB_PATH").unwrap_or_else(|_| "./exameow.db".to_string());
    let relay = relay::init_db(&db_path)
        .unwrap_or_else(|e| panic!("failed to init exam db at {db_path}: {e}"));
    let admin_token = relay::load_admin_token();
    if admin_token == "pass" {
        println!("WARNING: ADMIN_TOKEN is the default \"pass\" — change it at /#/admin before exposing this server");
    }

    auth::init_schema(&relay.conn).unwrap_or_else(|e| fatal(&format!("初始化 auth schema 失敗：{e}")));
    auth::seed_admin(&relay.conn).unwrap_or_else(|e| fatal(&e));

    let state = Arc::new(AppState {
        config_store,
        relay,
        admin_token: Mutex::new(admin_token),
    });

    {
        let state = state.clone();
        tokio::spawn(async move {
            let mut interval = tokio::time::interval(std::time::Duration::from_secs(3600));
            loop {
                interval.tick().await;
                relay::cleanup_expired(&state.relay);
                auth::cleanup_expired_sessions(state.db());
            }
        });
    }

    let static_dir =
        std::env::var("STATIC_DIR").unwrap_or_else(|_| "../frontend/dist".to_string());

    // 唔需要登入嘅路由
    let public = Router::new()
        .route("/api/auth/login", post(auth::login_handler))
        .route("/api/auth/logout", post(auth::logout_handler));

    // 其餘全部 /api 路由都要有效 session
    let protected = Router::new()
        .route("/api/auth/me", get(auth::me_handler))
        .route(
            "/api/auth/users",
            get(auth::list_users_handler).post(auth::create_user_handler),
        )
        .route("/api/auth/users/{id}", delete(auth::delete_user_handler))
        .route("/api/models", get(routes::get_models))
        .route("/api/generate", post(routes::generate_exam_handler))
        .route("/api/answer", post(routes::answer_handler))
        .route("/api/judge", post(routes::judge_handler))
        .route("/api/explain", post(routes::explain_handler))
        .route("/api/export", get(routes::export_handler))
        .route("/api/export/xlsx", post(routes::export_xlsx_handler))
        .route("/api/config/save", post(routes::save_config_handler))
        .route("/api/config/load", get(routes::load_config_handler))
        .route("/api/config/server", get(routes::server_config_info_handler))
        .route("/api/exam/publish", post(relay::publish_handler))
        .route(
            "/api/exam/code/{code}",
            get(relay::get_exam_handler).delete(relay::delete_exam_handler),
        )
        .route("/api/exam/code/{code}/submit", post(relay::submit_handler))
        .route("/api/exam/code/{code}/results", get(relay::results_handler))
        .route("/api/exam/code/{code}/report", post(relay::report_handler))
        .route("/api/exam/admin/reports", get(relay::admin_reports_handler))
        .route("/api/exam/admin/code/{code}", delete(relay::admin_delete_handler))
        .route(
            "/api/exam/admin/code/{code}/restore",
            post(relay::admin_restore_handler),
        )
        .route("/api/exam/admin/token", post(relay::admin_change_token_handler))
        .layer(middleware::from_fn_with_state(
            state.clone(),
            auth::require_auth,
        ));

    let mut app = Router::new()
        .merge(public)
        .merge(protected)
        .fallback_service(ServeDir::new(&static_dir))
        .with_state(state);

    if let Some(cors) = cors_layer() {
        app = app.layer(cors);
    }

    let port: u16 = std::env::var("PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(3000);

    let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{port}"))
        .await
        .unwrap();
    println!("Exameow server running on http://0.0.0.0:{port}");
    axum::serve(listener, app).await.unwrap();
}
