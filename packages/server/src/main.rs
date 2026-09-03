mod attempts;
mod auth;
mod courses;
mod llm;
mod materials;
mod questions;
mod relay;
mod routes;

use axum::{
    http::{header, HeaderValue, Method},
    middleware,
    routing::{delete, get, post},
    Router,
};
use routes::AppState;
use std::sync::{Arc, Mutex};
use tower_http::cors::CorsLayer;
use tower_http::services::ServeDir;
use tower::Layer;
use tower_http::set_header::SetResponseHeaderLayer;

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
    let db_path = std::env::var("EXAM_DB_PATH").unwrap_or_else(|_| "./exameow.db".to_string());
    let relay = relay::init_db(&db_path)
        .unwrap_or_else(|e| panic!("failed to init exam db at {db_path}: {e}"));
    let admin_token = relay::load_admin_token();
    if admin_token == "pass" {
        println!("WARNING: ADMIN_TOKEN is the default \"pass\" — change it at /#/admin before exposing this server");
    }

    auth::init_schema(&relay.conn).unwrap_or_else(|e| fatal(&format!("初始化 auth schema 失敗：{e}")));
    auth::seed_admin(&relay.conn).unwrap_or_else(|e| fatal(&e));
    llm::init_schema(&relay.conn).unwrap_or_else(|e| fatal(&format!("初始化 llm schema 失敗：{e}")));
    llm::ensure_master_key().unwrap_or_else(|e| fatal(&e));
    courses::init_schema(&relay.conn).unwrap_or_else(|e| fatal(&format!("初始化 courses schema 失敗：{e}")));
    materials::init_schema(&relay.conn).unwrap_or_else(|e| fatal(&format!("初始化 materials schema 失敗：{e}")));
    questions::init_schema(&relay.conn).unwrap_or_else(|e| fatal(&format!("初始化 questions schema 失敗：{e}")));
    attempts::init_schema(&relay.conn).unwrap_or_else(|e| fatal(&format!("初始化 attempts schema 失敗：{e}")));

    let state = Arc::new(AppState {
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
        .route(
            "/api/llm-config",
            get(llm::get_llm_config)
                .put(llm::put_llm_config)
                .delete(llm::delete_llm_config),
        )
        .route("/api/llm-config/models", post(llm::post_models))
        .route(
            "/api/courses",
            get(courses::list_courses_handler).post(courses::create_course_handler),
        )
        .route("/api/courses/join", post(courses::join_course_handler))
        .route(
            "/api/courses/{id}",
            get(courses::get_course_handler).delete(courses::delete_course_handler),
        )
        .route("/api/courses/{id}/leave", post(courses::leave_course_handler))
        .route(
            "/api/courses/{id}/materials",
            get(materials::list_materials_handler).post(materials::upload_material_handler),
        )
        .route(
            "/api/materials/{id}",
            get(materials::get_material_handler).delete(materials::delete_material_handler),
        )
        .route(
            "/api/courses/{id}/questions",
            get(questions::list_questions_handler),
        )
        .route(
            "/api/courses/{id}/questions/bulk",
            post(questions::bulk_insert_questions_handler),
        )
        .route(
            "/api/courses/{id}/questions/{qid}/attempts",
            post(attempts::record_attempt_handler),
        )
        .route(
            "/api/courses/{id}/questions/{qid}/flag",
            post(attempts::toggle_flag_handler),
        )
        .route(
            "/api/courses/{id}/attempts/me/summary",
            get(attempts::my_attempt_summary_handler),
        )
        .route("/api/generate", post(routes::generate_exam_handler))
        .route("/api/answer", post(routes::answer_handler))
        .route("/api/judge", post(routes::judge_handler))
        .route("/api/explain", post(routes::explain_handler))
        .route("/api/export", get(routes::export_handler))
        .route("/api/export/xlsx", post(routes::export_xlsx_handler))
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

    // 靜態檔嘅快取策略。ServeDir 預設只送 last-modified，冇 Cache-Control 亦冇
    // ETag，瀏覽器會用啟發式快取 —— 即係部署咗新版之後，用戶可能繼續行緊舊
    // index.html 同舊 bundle，完全唔問 server。
    //   /assets/*  檔名有 content hash，內容永遠唔會變，可以 immutable 長期 cache
    //   其餘(index.html) 一定要 no-cache（= 用之前先 revalidate）
    let assets_service = SetResponseHeaderLayer::overriding(
        header::CACHE_CONTROL,
        HeaderValue::from_static("public, max-age=31536000, immutable"),
    )
    .layer(ServeDir::new(format!("{static_dir}/assets")));

    let root_service = SetResponseHeaderLayer::overriding(
        header::CACHE_CONTROL,
        HeaderValue::from_static("no-cache"),
    )
    .layer(ServeDir::new(&static_dir));

    let mut app = Router::new()
        .merge(public)
        .merge(protected)
        .nest_service("/assets", assets_service)
        .fallback_service(root_service)
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
