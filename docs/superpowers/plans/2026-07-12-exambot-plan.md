# ExamBot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a cross-platform AI exam question generator with Vue 3 frontend, Rust backend, Tauri desktop/mobile support, and optional web deployment.

**Architecture:** Monorepo with a shared Rust core library providing all business logic (file parsing, AI client, exam generation, CSV export, config storage). Tauri wraps core via IPC commands for desktop/mobile; an Axum server wraps core via REST for web. Vue 3 frontend adapts via an API abstraction layer.

**Tech Stack:** Rust (core, axum server), Vue 3 + TypeScript + Vite (frontend), Vuetify 3 (Material Design 3 UI), Tauri v2 (desktop/mobile shell), pnpm (package manager)

## Global Constraints

- Vue 3.x with TypeScript, Composition API + `<script setup>`
- Vuetify 3.x for Material Design 3 UI components
- Pinia for state management
- Tauri v2 plugins: `tauri-plugin-dialog`, `tauri-plugin-fs`
- `serde` + `serde_json` for all serialization
- `reqwest` with `rustls-tls` for HTTP
- `csv` crate for CSV export
- `lopdf` for PDF, `quick-xml` + `zip` for DOCX
- `thiserror` for error types
- API Key encrypted with XChaCha20-Poly1305 at rest
- No telemetry, no data sent except to user-configured AI endpoint
- Platform targets: Web, Desktop (Win/Mac/Linux), Mobile (Android/iOS)
- Naming: kebab-case for files, PascalCase for Vue components, snake_case for Rust
- All Rust code under workspace `Cargo.toml` root

---

### Task 1: Scaffold Monorepo Structure

**Files:**
- Create: `Cargo.toml` (workspace root)
- Create: `packages/core/Cargo.toml`
- Create: `packages/core/src/lib.rs`
- Create: `packages/core/src/parser/mod.rs`
- Create: `packages/core/src/ai/mod.rs`
- Create: `packages/core/src/exam/mod.rs`
- Create: `packages/core/src/export/mod.rs`
- Create: `packages/core/src/config/mod.rs`
- Create: `packages/server/Cargo.toml`
- Create: `packages/server/src/main.rs`
- Create: `packages/shared/package.json`
- Create: `packages/shared/src/index.ts`
- Create: `packages/shared/src/types.ts`
- Create: `frontend/` via `pnpm create vue` (then customize)
- Create: `src-tauri/Cargo.toml`
- Create: `src-tauri/tauri.conf.json`
- Create: `src-tauri/capabilities/default.json`
- Create: `src-tauri/src/lib.rs`
- Create: `src-tauri/src/main.rs`

**Interfaces:**
- Produces: Complete empty monorepo with all module stubs, compiles with no errors.

- [ ] **Step 1: Create workspace root Cargo.toml**

```toml
[workspace]
resolver = "2"
members = [
    "packages/core",
    "packages/server",
    "src-tauri",
]
```

- [ ] **Step 2: Create packages/core/Cargo.toml**

```toml
[package]
name = "exambot-core"
version = "0.1.0"
edition = "2021"

[dependencies]
serde = { version = "1", features = ["derive"] }
serde_json = "1"
reqwest = { version = "0.12", features = ["json", "rustls-tls"], default-features = false }
csv = "1"
lopdf = "0.34"
quick-xml = "0.37"
zip = "2"
uuid = { version = "1", features = ["v4"] }
thiserror = "2"
tokio = { version = "1", features = ["full"] }
```

- [ ] **Step 3: Create packages/core/src/lib.rs with module declarations**

```rust
pub mod parser;
pub mod ai;
pub mod exam;
pub mod export;
pub mod config;
```

- [ ] **Step 4: Create empty mod.rs files in each core submodule**

For `packages/core/src/parser/mod.rs`:
```rust
mod txt;
mod docx;
mod pdf;

pub use txt::extract_txt;
pub use docx::extract_docx;
pub use pdf::extract_pdf;
```

For `packages/core/src/ai/mod.rs`:
```rust
mod client;
mod models;

pub use client::AIClient;
pub use models::ModelInfo;
```

For `packages/core/src/exam/mod.rs`:
```rust
mod types;
mod prompt;

pub use types::*;
pub use prompt::build_prompt;
```

For `packages/core/src/export/mod.rs`:
```rust
mod writer;

pub use writer::export_csv;
```

For `packages/core/src/config/mod.rs`:
```rust
mod store;

pub use store::ConfigStore;
```

- [ ] **Step 5: Create stub files for each submodule to make it compile**

`packages/core/src/parser/txt.rs`:
```rust
pub fn extract_txt(path: &str) -> Result<String, String> {
    std::fs::read_to_string(path).map_err(|e| e.to_string())
}
```

`packages/core/src/parser/docx.rs`:
```rust
pub fn extract_docx(_path: &str) -> Result<String, String> {
    Ok(String::new())
}
```

`packages/core/src/parser/pdf.rs`:
```rust
pub fn extract_pdf(_path: &str) -> Result<String, String> {
    Ok(String::new())
}
```

`packages/core/src/ai/client.rs`:
```rust
pub struct AIClient;
impl AIClient {
    pub fn new(_endpoint: String, _api_key: String) -> Self { Self }
}
```

`packages/core/src/ai/models.rs`:
```rust
use serde::Deserialize;

#[derive(Debug, Clone, Deserialize)]
pub struct ModelInfo {
    pub id: String,
}
```

`packages/core/src/exam/types.rs`:
```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum QuestionType {
    SingleChoice,
    MultiChoice,
    TrueFalse,
    FillBlank,
    ShortAnswer,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Difficulty {
    Easy,
    Medium,
    Hard,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Question {
    pub id: String,
    #[serde(rename = "type")]
    pub qtype: QuestionType,
    pub stem: String,
    pub options: Vec<String>,
    pub answer: String,
    pub analysis: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExamParams {
    pub question_types: Vec<QuestionType>,
    pub count: u32,
    pub difficulty: Difficulty,
    pub language: String,
    pub topic_filter: Option<String>,
}
```

`packages/core/src/exam/prompt.rs`:
```rust
use crate::exam::ExamParams;

pub fn build_prompt(_text: &str, _params: &ExamParams) -> String {
    String::new()
}
```

`packages/core/src/export/writer.rs`:
```rust
use crate::exam::Question;

pub fn export_csv(_questions: &[Question], _path: &str) -> Result<(), String> {
    Ok(())
}
```

`packages/core/src/config/store.rs`:
```rust
pub struct ConfigStore;
impl ConfigStore {
    pub fn save(&self, _endpoint: &str, _api_key: &str, _model: &str) -> Result<(), String> { Ok(()) }
    pub fn load(&self) -> Result<Option<(String, String, String)>, String> { Ok(None) }
}
```

- [ ] **Step 6: Create packages/server/Cargo.toml**

```toml
[package]
name = "exambot-server"
version = "0.1.0"
edition = "2021"

[dependencies]
exambot-core = { path = "../core" }
axum = "0.8"
tokio = { version = "1", features = ["full"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tower-http = { version = "0.6", features = ["cors"] }
```

- [ ] **Step 7: Create packages/server/src/main.rs**

```rust
#[tokio::main]
async fn main() {
    println!("ExamBot server starting...");
}
```

- [ ] **Step 8: Create packages/shared/package.json**

```json
{
  "name": "@exambot/shared",
  "version": "0.1.0",
  "type": "module",
  "main": "src/index.ts",
  "types": "src/index.ts"
}
```

`packages/shared/src/types.ts`:
```typescript
export enum QuestionType {
  SingleChoice = 'single_choice',
  MultiChoice = 'multi_choice',
  TrueFalse = 'true_false',
  FillBlank = 'fill_blank',
  ShortAnswer = 'short_answer',
}

export enum Difficulty {
  Easy = 'easy',
  Medium = 'medium',
  Hard = 'hard',
}

export interface Question {
  id: string
  type: QuestionType
  stem: string
  options: string[]
  answer: string
  analysis: string
}

export interface ExamParams {
  question_types: QuestionType[]
  count: number
  difficulty: Difficulty
  language: string
  topic_filter?: string
}

export interface AIConfig {
  endpoint: string
  api_key: string
  model: string
}

export interface ModelInfo {
  id: string
}
```

`packages/shared/src/index.ts`:
```typescript
export * from './types'
```

- [ ] **Step 9: Create Vue frontend via Vite**

Run: `pnpm create vue@latest frontend -- --typescript --router --pinia`

After scaffold, modify `frontend/vite.config.ts`:
```typescript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  clearScreen: false,
  server: {
    strictPort: true,
  },
  envPrefix: ['VITE_', 'TAURI_'],
})
```

- [ ] **Step 10: Install Vuetify 3**

Run:
```bash
cd frontend && pnpm add vuetify @mdi/font
```

Add Vuetify plugin. Create `frontend/src/plugins/vuetify.ts`:
```typescript
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import '@mdi/font/css/materialdesignicons.css'

export default createVuetify({
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        dark: false,
        colors: {
          primary: '#1A73E8',
          secondary: '#5F6368',
          background: '#FFFFFF',
          surface: '#FFFFFF',
        },
      },
      dark: {
        dark: true,
        colors: {
          primary: '#8AB4F8',
          secondary: '#9AA0A6',
          background: '#121212',
          surface: '#1E1E1E',
        },
      },
    },
  },
})
```

Modify `frontend/src/main.ts`:
```typescript
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import vuetify from './plugins/vuetify'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(vuetify)
app.mount('#app')
```

- [ ] **Step 11: Create Tauri config**

`src-tauri/Cargo.toml`:
```toml
[package]
name = "exambot"
version = "0.1.0"
edition = "2021"

[build-dependencies]
tauri-build = { version = "2", features = [] }

[dependencies]
tauri = { version = "2", features = [] }
tauri-plugin-dialog = "2"
tauri-plugin-fs = "2"
tauri-plugin-opener = "2"
exambot-core = { path = "../packages/core" }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
```

`src-tauri/tauri.conf.json`:
```json
{
  "$schema": "https://raw.githubusercontent.com/nickzyl/tauri/refs/heads/master/crates/tauri-config-schema/schema.json",
  "productName": "ExamBot",
  "version": "0.1.0",
  "identifier": "com.exambot.app",
  "build": {
    "frontendDist": "../frontend/dist",
    "devUrl": "http://localhost:5173",
    "beforeBuildCommand": "pnpm build",
    "beforeDevCommand": "pnpm dev"
  },
  "app": {
    "windows": [
      {
        "title": "ExamBot",
        "width": 1024,
        "height": 768
      }
    ],
    "security": {
      "csp": "default-src 'self'; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; font-src 'self' https://cdn.jsdelivr.net; img-src 'self' data:; connect-src 'self' http://localhost:* https://*"
    }
  },
  "plugins": {
    "dialog": {},
    "fs": {
      "scope": ["**"]
    }
  }
}
```

`src-tauri/capabilities/default.json`:
```json
{
  "identifier": "default",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "dialog:default",
    "dialog:allow-open",
    "dialog:allow-save",
    "fs:default",
    "fs:allow-read-text-file",
    "fs:allow-write-text-file",
    "opener:default"
  ]
}
```

`src-tauri/src/lib.rs`:
```rust
use exambot_core::exam::Question;
use serde::Serialize;

#[derive(Serialize)]
pub struct GenerateResult {
    pub questions: Vec<Question>,
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
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

`src-tauri/src/main.rs`:
```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    exambot_lib::run()
}
```

- [ ] **Step 12: Verify compilation**

Run: `cargo check --workspace`
Expected: Compiles successfully.

- [ ] **Step 13: Verify frontend dev server**

Run: `cd frontend && pnpm install && pnpm dev`
Expected: Vite dev server starts on port 5173.

- [ ] **Step 14: Commit**

```bash
git add -A && git commit -m "feat: scaffold monorepo with Rust workspace, Vue3 frontend, Tauri config"
```

---

### Task 2: Implement Rust Core — File Parser Module

**Files:**
- Modify: `packages/core/Cargo.toml` (add dependencies if missing)
- Modify: `packages/core/src/parser/txt.rs`
- Modify: `packages/core/src/parser/docx.rs`
- Modify: `packages/core/src/parser/pdf.rs`
- Modify: `packages/core/src/parser/mod.rs`

**Interfaces:**
- Consumes: None (standalone module)
- Produces:
  - `fn extract_txt(path: &str) -> Result<String, ParserError>`
  - `fn extract_docx(path: &str) -> Result<String, ParserError>`
  - `fn extract_pdf(path: &str) -> Result<String, ParserError>`
  - `enum FileFormat { Txt, Docx, Pdf }`
  - `fn parse_file(path: &str, format: FileFormat) -> Result<String, ParserError>`
  - `enum ParserError { Io(std::io::Error), Parse(String), Unsupported(String) }`

- [ ] **Step 1: Add ParserError to parser/mod.rs**

Replace `packages/core/src/parser/mod.rs`:
```rust
mod txt;
mod docx;
mod pdf;

use std::path::Path;

pub use txt::extract_txt;
pub use docx::extract_docx;
pub use pdf::extract_pdf;

#[derive(Debug)]
pub enum FileFormat {
    Txt,
    Docx,
    Pdf,
}

impl FileFormat {
    pub fn from_extension(path: &str) -> Result<Self, ParserError> {
        let ext = Path::new(path)
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("")
            .to_lowercase();
        match ext.as_str() {
            "txt" => Ok(FileFormat::Txt),
            "docx" => Ok(FileFormat::Docx),
            "pdf" => Ok(FileFormat::Pdf),
            other => Err(ParserError::Unsupported(format!("unsupported extension: .{other}"))),
        }
    }
}

#[derive(Debug)]
pub enum ParserError {
    Io(std::io::Error),
    Parse(String),
    Unsupported(String),
}

impl std::fmt::Display for ParserError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ParserError::Io(e) => write!(f, "IO error: {e}"),
            ParserError::Parse(e) => write!(f, "Parse error: {e}"),
            ParserError::Unsupported(e) => write!(f, "Unsupported: {e}"),
        }
    }
}

impl From<std::io::Error> for ParserError {
    fn from(e: std::io::Error) -> Self { ParserError::Io(e) }
}

pub fn parse_file(path: &str) -> Result<String, ParserError> {
    let format = FileFormat::from_extension(path)?;
    match format {
        FileFormat::Txt => extract_txt(path),
        FileFormat::Docx => extract_docx(path),
        FileFormat::Pdf => extract_pdf(path),
    }
}
```

- [ ] **Step 2: Implement TXT parser**

Replace `packages/core/src/parser/txt.rs`:
```rust
use super::ParserError;

pub fn extract_txt(path: &str) -> Result<String, ParserError> {
    let content = std::fs::read_to_string(path)?;
    if content.trim().is_empty() {
        return Err(ParserError::Parse("file is empty".to_string()));
    }
    Ok(content)
}
```

- [ ] **Step 3: Implement DOCX parser**

Replace `packages/core/src/parser/docx.rs`:
```rust
use super::ParserError;
use quick_xml::Reader;
use std::io::Read;

pub fn extract_docx(path: &str) -> Result<String, ParserError> {
    let file = std::fs::File::open(path)?;
    let mut archive = zip::ZipArchive::new(file)
        .map_err(|e| ParserError::Parse(format!("invalid docx zip: {e}")))?;

    let mut doc_xml = String::new();
    let mut doc_file = archive
        .by_name("word/document.xml")
        .map_err(|e| ParserError::Parse(format!("missing document.xml: {e}")))?;
    doc_file.read_to_string(&mut doc_xml)?;

    let mut reader = Reader::from_str(&doc_xml);
    reader.config_mut().trim_text(true);

    let mut texts = Vec::new();
    let mut txt_buf = Vec::new();
    loop {
        match reader.read_event_into(&mut txt_buf) {
            Ok(quick_xml::events::Event::Start(ref e)) => {
                if e.local_name().as_ref() == b"t" {
                    if let Ok(quick_xml::events::Event::Text(ref t)) = reader.read_event_into(&mut txt_buf) {
                        let text = t.unescape().unwrap_or_default();
                        if !text.trim().is_empty() {
                            texts.push(text.to_string());
                        }
                    }
                }
            }
            Ok(quick_xml::events::Event::Eof) => break,
            Err(e) => return Err(ParserError::Parse(format!("xml error: {e}"))),
            _ => {}
        }
        txt_buf.clear();
    }

    let result = texts.join("\n");
    if result.trim().is_empty() {
        return Err(ParserError::Parse("no text found in docx".to_string()));
    }
    Ok(result)
}
```

- [ ] **Step 4: Implement PDF parser**

Replace `packages/core/src/parser/pdf.rs`:
```rust
use super::ParserError;
use lopdf::Document;

pub fn extract_pdf(path: &str) -> Result<String, ParserError> {
    let doc = Document::load(path)
        .map_err(|e| ParserError::Parse(format!("pdf load error: {e}")))?;

    let mut texts = Vec::new();

    for page_num in 1..=doc.get_pages().len() as u32 {
        match doc.extract_text(&[page_num]) {
            Ok(texts_per_page) => {
                for text in texts_per_page {
                    let cleaned = text.trim().to_string();
                    if !cleaned.is_empty() {
                        texts.push(cleaned);
                    }
                }
            }
            Err(e) => return Err(ParserError::Parse(format!("text extraction error: {e}"))),
        }
    }

    let result = texts.join("\n");
    if result.trim().is_empty() {
        return Err(ParserError::Parse("no extractable text in pdf".to_string()));
    }
    Ok(result)
}
```

- [ ] **Step 5: Add test files**

Create `packages/core/tests/fixtures/sample.txt`:
```
This is a sample text file for testing.
It contains multiple lines of educational content.
Chapter 1: Introduction to Machine Learning
Machine learning is a subset of artificial intelligence.
```

Create `packages/core/tests/fixtures/` directory first:

Run: `mkdir -p packages/core/tests/fixtures`

- [ ] **Step 6: Write unit test for txt parser**

Create `packages/core/tests/parser_tests.rs`:
```rust
use exambot_core::parser::{extract_txt, FileFormat, ParserError};

#[test]
fn test_extract_txt() {
    let text = extract_txt("tests/fixtures/sample.txt").unwrap();
    assert!(text.contains("Machine Learning"));
    assert!(text.contains("Chapter 1"));
}

#[test]
fn test_extract_txt_not_found() {
    let result = extract_txt("tests/fixtures/nonexistent.txt");
    assert!(result.is_err());
}

#[test]
fn test_file_format_from_extension() {
    assert!(matches!(
        FileFormat::from_extension("doc.pdf"),
        Ok(FileFormat::Pdf)
    ));
    assert!(matches!(
        FileFormat::from_extension("doc.docx"),
        Ok(FileFormat::Docx)
    ));
    assert!(matches!(
        FileFormat::from_extension("doc.txt"),
        Ok(FileFormat::Txt)
    ));
    assert!(matches!(
        FileFormat::from_extension("doc.png"),
        Err(ParserError::Unsupported(_))
    ));
}
```

- [ ] **Step 7: Run tests**

Run: `cargo test -p exambot-core`
Expected: TXT test passes; DOCX and PDF tests skipped (no test fixtures for them yet). FileFormat tests pass.

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat: implement file parser module (txt, docx, pdf)"
```

---

### Task 3: Implement Rust Core — AI Client Module

**Files:**
- Modify: `packages/core/src/ai/client.rs`
- Modify: `packages/core/src/ai/models.rs`
- Modify: `packages/core/src/ai/mod.rs`
- Create: `packages/core/src/error.rs`
- Modify: `packages/core/src/lib.rs`

**Interfaces:**
- Consumes: None
- Produces:
  - `struct AIClient { client: reqwest::Client, endpoint: String, api_key: String }`
  - `AIClient::new(endpoint: &str, api_key: &str) -> Self`
  - `AIClient::fetch_models() -> Result<Vec<ModelInfo>, CoreError>`
  - `AIClient::chat(system_prompt: &str, user_prompt: &str, model: &str) -> Result<String, CoreError>`
  - `struct ModelInfo { id: String, object: Option<String>, created: Option<u64>, owned_by: Option<String> }`

- [ ] **Step 1: Create unified error type**

Create `packages/core/src/error.rs`:
```rust
use crate::parser::ParserError;

#[derive(Debug)]
pub enum CoreError {
    Parser(ParserError),
    AI(String),
    Exam(String),
    Export(String),
    Config(String),
}

impl std::fmt::Display for CoreError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            CoreError::Parser(e) => write!(f, "Parser: {e}"),
            CoreError::AI(e) => write!(f, "AI: {e}"),
            CoreError::Exam(e) => write!(f, "Exam: {e}"),
            CoreError::Export(e) => write!(f, "Export: {e}"),
            CoreError::Config(e) => write!(f, "Config: {e}"),
        }
    }
}

impl From<ParserError> for CoreError {
    fn from(e: ParserError) -> Self { CoreError::Parser(e) }
}

impl From<reqwest::Error> for CoreError {
    fn from(e: reqwest::Error) -> Self { CoreError::AI(e.to_string()) }
}

impl From<serde_json::Error> for CoreError {
    fn from(e: serde_json::Error) -> Self { CoreError::AI(e.to_string()) }
}
```

- [ ] **Step 2: Update lib.rs to include error module**

Modify `packages/core/src/lib.rs`:
```rust
pub mod parser;
pub mod ai;
pub mod exam;
pub mod export;
pub mod config;
pub mod error;
```

- [ ] **Step 3: Implement ModelInfo with full fields**

Replace `packages/core/src/ai/models.rs`:
```rust
use serde::Deserialize;

#[derive(Debug, Clone, Deserialize)]
pub struct ModelInfo {
    pub id: String,
    #[serde(default)]
    pub object: Option<String>,
    #[serde(default)]
    pub created: Option<u64>,
    #[serde(default)]
    pub owned_by: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ModelsResponse {
    pub data: Vec<ModelInfo>,
}
```

- [ ] **Step 4: Implement AIClient**

Replace `packages/core/src/ai/client.rs`:
```rust
use crate::error::CoreError;
use super::models::{ModelInfo, ModelsResponse};
use reqwest::header::{AUTHORIZATION, CONTENT_TYPE};

pub struct AIClient {
    client: reqwest::Client,
    endpoint: String,
    api_key: String,
}

impl AIClient {
    pub fn new(endpoint: &str, api_key: &str) -> Self {
        let endpoint = endpoint.trim_end_matches('/').to_string();
        Self {
            client: reqwest::Client::new(),
            endpoint,
            api_key: api_key.to_string(),
        }
    }

    pub async fn fetch_models(&self) -> Result<Vec<ModelInfo>, CoreError> {
        let url = format!("{}/models", self.endpoint);
        let response = self
            .client
            .get(&url)
            .header(AUTHORIZATION, format!("Bearer {}", self.api_key))
            .timeout(std::time::Duration::from_secs(15))
            .send()
            .await?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            return Err(CoreError::AI(format!("HTTP {status}: {body}")));
        }

        let models_response: ModelsResponse = response.json().await?;
        Ok(models_response.data)
    }

    pub async fn chat(
        &self,
        system_prompt: &str,
        user_prompt: &str,
        model: &str,
    ) -> Result<String, CoreError> {
        let url = format!("{}/chat/completions", self.endpoint);

        let body = serde_json::json!({
            "model": model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "temperature": 0.7,
            "max_tokens": 4096,
        });

        let response = self
            .client
            .post(&url)
            .header(AUTHORIZATION, format!("Bearer {}", self.api_key))
            .header(CONTENT_TYPE, "application/json")
            .json(&body)
            .timeout(std::time::Duration::from_secs(120))
            .send()
            .await?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            return Err(CoreError::AI(format!("HTTP {status}: {body}")));
        }

        let json: serde_json::Value = response.json().await?;
        let content = json["choices"][0]["message"]["content"]
            .as_str()
            .unwrap_or("")
            .to_string();

        if content.is_empty() {
            return Err(CoreError::AI("empty response from AI".to_string()));
        }

        Ok(content)
    }
}
```

- [ ] **Step 5: Update ai/mod.rs**

Replace `packages/core/src/ai/mod.rs`:
```rust
mod client;
mod models;

pub use client::AIClient;
pub use models::ModelInfo;
```

- [ ] **Step 6: Write test (skipped — requires real endpoint)**

Create `packages/core/tests/ai_tests.rs`:
```rust
// AI client tests require a running AI endpoint.
// Integration tests are run manually against a configured endpoint.
#[cfg(test)]
mod tests {
    use exambot_core::ai::AIClient;

    #[test]
    fn test_client_creation() {
        let client = AIClient::new("https://api.openai.com/v1", "sk-test");
        assert!(true); // Just verify it constructs without panic
    }
}
```

- [ ] **Step 7: Run tests**

Run: `cargo test -p exambot-core`
Expected: All tests pass.

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat: implement AI client module (fetch models, chat completion)"
```

---

### Task 4: Implement Rust Core — Exam Generation Engine

**Files:**
- Modify: `packages/core/src/exam/types.rs`
- Modify: `packages/core/src/exam/prompt.rs`
- Modify: `packages/core/src/exam/mod.rs`

**Interfaces:**
- Consumes: `AIClient`, `ExamParams`, `Question`, `CoreError`
- Produces:
  - `fn build_system_prompt() -> String`
  - `fn build_user_prompt(text: &str, params: &ExamParams) -> String`
  - `fn parse_questions(json: &str) -> Result<Vec<Question>, CoreError>`
  - `fn generate_exam(client: &AIClient, text: &str, params: &ExamParams, model: &str) -> Result<Vec<Question>, CoreError>` (async)

- [ ] **Step 1: Finalize types.rs with all derives and Display**

Replace `packages/core/src/exam/types.rs`:
```rust
use serde::{Deserialize, Serialize};
use std::fmt;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum QuestionType {
    SingleChoice,
    MultiChoice,
    TrueFalse,
    FillBlank,
    ShortAnswer,
}

impl fmt::Display for QuestionType {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            QuestionType::SingleChoice => write!(f, "single_choice"),
            QuestionType::MultiChoice => write!(f, "multi_choice"),
            QuestionType::TrueFalse => write!(f, "true_false"),
            QuestionType::FillBlank => write!(f, "fill_blank"),
            QuestionType::ShortAnswer => write!(f, "short_answer"),
        }
    }
}

impl QuestionType {
    pub fn to_label_cn(&self) -> &'static str {
        match self {
            QuestionType::SingleChoice => "单选题",
            QuestionType::MultiChoice => "多选题",
            QuestionType::TrueFalse => "判断题",
            QuestionType::FillBlank => "填空题",
            QuestionType::ShortAnswer => "简答题",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Difficulty {
    Easy,
    Medium,
    Hard,
}

impl fmt::Display for Difficulty {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Difficulty::Easy => write!(f, "easy"),
            Difficulty::Medium => write!(f, "medium"),
            Difficulty::Hard => write!(f, "hard"),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Question {
    pub id: String,
    #[serde(rename = "type")]
    pub qtype: QuestionType,
    pub stem: String,
    #[serde(default)]
    pub options: Vec<String>,
    pub answer: String,
    #[serde(default)]
    pub analysis: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExamParams {
    pub question_types: Vec<QuestionType>,
    pub count: u32,
    pub difficulty: Difficulty,
    pub language: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub topic_filter: Option<String>,
}
```

- [ ] **Step 2: Implement prompt builder**

Replace `packages/core/src/exam/prompt.rs`:
```rust
use crate::exam::{Difficulty, ExamParams, QuestionType};
use crate::error::CoreError;
use crate::ai::AIClient;
use crate::exam::Question;

pub fn build_system_prompt() -> String {
    format!(
        r#"You are an expert exam question generator. Generate questions based on the provided document content.

## Output Rules
1. Respond ONLY with a valid JSON array — no explanation, no markdown fences.
2. Each question object MUST have exactly these fields:
   - "id": a short unique identifier string
   - "type": one of [{}]
   - "stem": the question text
   - "options": array of option strings (required for single_choice/multi_choice/true_false; empty array for others)
   - "answer": the correct answer
   - "analysis": brief explanation of the answer (can be empty string for fill_blank/short_answer)
3. For single_choice: exactly 4 options, one correct.
4. For multi_choice: exactly 4 options, at least one correct (list correct letters separated by comma in answer).
5. For true_false: options ["True", "False"], answer is "True" or "False".
6. For fill_blank: answer is the exact word/phrase to fill in.
7. For short_answer: answer is a concise reference answer.
8. All questions must be based on the document content.
9. Use the specified language for questions.
"#,
        vec![
            QuestionType::SingleChoice,
            QuestionType::MultiChoice,
            QuestionType::TrueFalse,
            QuestionType::FillBlank,
            QuestionType::ShortAnswer,
        ]
        .iter()
        .map(|t| t.to_string())
        .collect::<Vec<_>>()
        .join(", ")
    )
}

pub fn build_user_prompt(text: &str, params: &ExamParams) -> String {
    let types_list = params
        .question_types
        .iter()
        .map(|t| t.to_string())
        .collect::<Vec<_>>()
        .join(", ");

    let difficulty_str = match params.difficulty {
        Difficulty::Easy => "easy questions suitable for beginners",
        Difficulty::Medium => "moderate difficulty questions requiring understanding",
        Difficulty::Hard => "challenging questions requiring deep analysis",
    };

    let topic_note = match &params.topic_filter {
        Some(topic) => format!("\nFocus on this topic: {topic}"),
        None => String::new(),
    };

    let max_chars = 32000;
    let text_section = if text.len() > max_chars {
        format!("{}...(truncated)", &text[..max_chars])
    } else {
        text.to_string()
    };

    format!(
        r#"Generate {count} questions based on the following document.

Question types: {types}
Difficulty: {difficulty_str}
Language: {language}{topic_note}

DOCUMENT CONTENT:
{text_content}
"#,
        count = params.count,
        types = types_list,
        difficulty_str = difficulty_str,
        language = params.language,
        topic_note = topic_note,
        text_content = text_section,
    )
}

pub fn parse_questions(json_str: &str) -> Result<Vec<Question>, CoreError> {
    let cleaned = json_str
        .trim()
        .trim_start_matches("```json")
        .trim_start_matches("```")
        .trim_end_matches("```")
        .trim();

    let questions: Vec<Question> = serde_json::from_str(cleaned)
        .map_err(|e| CoreError::Exam(format!("JSON parse error: {e}")))?;

    if questions.is_empty() {
        return Err(CoreError::Exam("AI returned empty questions array".to_string()));
    }

    Ok(questions)
}

pub async fn generate_exam(
    client: &AIClient,
    text: &str,
    params: &ExamParams,
    model: &str,
) -> Result<Vec<Question>, CoreError> {
    let system_prompt = build_system_prompt();
    let user_prompt = build_user_prompt(text, params);
    let response = client.chat(&system_prompt, &user_prompt, model).await?;
    parse_questions(&response)
}
```

- [ ] **Step 3: Update exam/mod.rs**

Replace `packages/core/src/exam/mod.rs`:
```rust
mod types;
mod prompt;

pub use types::*;
pub use prompt::*;
```

- [ ] **Step 4: Write tests**

Create `packages/core/tests/exam_tests.rs`:
```rust
use exambot_core::exam::*;
use exambot_core::ai::AIClient;

#[test]
fn test_build_system_prompt() {
    let prompt = build_system_prompt();
    assert!(prompt.contains("expert exam question generator"));
    assert!(prompt.contains("single_choice"));
}

#[test]
fn test_build_user_prompt() {
    let params = ExamParams {
        question_types: vec![QuestionType::SingleChoice, QuestionType::TrueFalse],
        count: 5,
        difficulty: Difficulty::Medium,
        language: "zh-CN".to_string(),
        topic_filter: Some("Machine Learning".to_string()),
    };
    let text = "Sample document content about ML.";
    let prompt = build_user_prompt(text, &params);
    assert!(prompt.contains("5 questions"));
    assert!(prompt.contains("single_choice"));
    assert!(prompt.contains("true_false"));
    assert!(prompt.contains("zh-CN"));
    assert!(prompt.contains("Machine Learning"));
    assert!(prompt.contains("Sample document content"));
}

#[test]
fn test_parse_questions_valid_json() {
    let json = r#"[
        {"id": "q1", "type": "single_choice", "stem": "What is AI?", "options": ["A", "B", "C", "D"], "answer": "A", "analysis": "AI is..."},
        {"id": "q2", "type": "true_false", "stem": "Is Earth round?", "options": ["True", "False"], "answer": "True", "analysis": ""}
    ]"#;
    let questions = parse_questions(json).unwrap();
    assert_eq!(questions.len(), 2);
    assert_eq!(questions[0].id, "q1");
    assert_eq!(questions[0].qtype, QuestionType::SingleChoice);
}

#[test]
fn test_parse_questions_empty_array() {
    let json = "[]";
    let result = parse_questions(json);
    assert!(result.is_err());
}

#[test]
fn test_parse_questions_with_markdown_fences() {
    let json = "```json\n[{\"id\":\"q1\",\"type\":\"true_false\",\"stem\":\"Test?\",\"options\":[\"True\",\"False\"],\"answer\":\"True\",\"analysis\":\"\"}]\n```";
    let questions = parse_questions(json).unwrap();
    assert_eq!(questions.len(), 1);
}

#[test]
fn test_question_type_labels() {
    assert_eq!(QuestionType::SingleChoice.to_label_cn(), "单选题");
    assert_eq!(QuestionType::TrueFalse.to_label_cn(), "判断题");
    assert_eq!(QuestionType::FillBlank.to_label_cn(), "填空题");
}
```

- [ ] **Step 5: Run tests**

Run: `cargo test -p exambot-core`
Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: implement exam generation engine (prompts, JSON parsing)"
```

---

### Task 5: Implement Rust Core — CSV Export Module

**Files:**
- Modify: `packages/core/src/export/writer.rs`
- Modify: `packages/core/src/export/mod.rs`

**Interfaces:**
- Consumes: `Vec<Question>`
- Produces: `fn export_csv(questions: &[Question], path: &str) -> Result<(), CoreError>`

- [ ] **Step 1: Implement CSV writer**

Replace `packages/core/src/export/writer.rs`:
```rust
use crate::error::CoreError;
use crate::exam::Question;
use csv::WriterBuilder;

pub fn export_csv(questions: &[Question], path: &str) -> Result<(), CoreError> {
    let mut wtr = WriterBuilder::new()
        .from_path(path)
        .map_err(|e| CoreError::Export(format!("cannot create CSV file: {e}")))?;

    wtr.write_record(["id", "type", "stem", "options", "answer", "analysis"])
        .map_err(|e| CoreError::Export(format!("write error: {e}")))?;

    for q in questions {
        let options_str = q.options.join("|");
        wtr.write_record([
            &q.id,
            &q.qtype.to_string(),
            &q.stem,
            &options_str,
            &q.answer,
            &q.analysis,
        ])
        .map_err(|e| CoreError::Export(format!("write error: {e}")))?;
    }

    wtr.flush()
        .map_err(|e| CoreError::Export(format!("flush error: {e}")))?;

    Ok(())
}
```

- [ ] **Step 2: Update export/mod.rs**

Replace `packages/core/src/export/mod.rs`:
```rust
mod writer;

pub use writer::export_csv;
```

- [ ] **Step 3: Write tests**

Create `packages/core/tests/export_tests.rs`:
```rust
use exambot_core::exam::{Question, QuestionType};
use exambot_core::export::export_csv;

fn make_questions() -> Vec<Question> {
    vec![
        Question {
            id: "q1".to_string(),
            qtype: QuestionType::SingleChoice,
            stem: "What is 2+2?".to_string(),
            options: vec!["3".to_string(), "4".to_string(), "5".to_string(), "6".to_string()],
            answer: "4".to_string(),
            analysis: "Basic arithmetic".to_string(),
        },
        Question {
            id: "q2".to_string(),
            qtype: QuestionType::TrueFalse,
            stem: "The sky is blue.".to_string(),
            options: vec!["True".to_string(), "False".to_string()],
            answer: "True".to_string(),
            analysis: "".to_string(),
        },
    ]
}

#[test]
fn test_export_csv() {
    let questions = make_questions();
    let path = "tests/fixtures/test_output.csv";
    export_csv(&questions, path).unwrap();

    let content = std::fs::read_to_string(path).unwrap();
    assert!(content.contains("id,type,stem,options,answer,analysis"));
    assert!(content.contains("q1"));
    assert!(content.contains("3|4|5|6"));
    assert!(content.contains("q2"));

    std::fs::remove_file(path).ok();
}

#[test]
fn test_export_empty_csv() {
    let questions: Vec<Question> = vec![];
    let path = "tests/fixtures/test_empty.csv";
    export_csv(&questions, path).unwrap();

    let content = std::fs::read_to_string(path).unwrap();
    let lines: Vec<_> = content.lines().collect();
    assert_eq!(lines.len(), 1); // header only
    assert!(lines[0].contains("id,type,stem"));

    std::fs::remove_file(path).ok();
}
```

- [ ] **Step 4: Run tests**

Run: `cargo test -p exambot-core`
Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: implement CSV export module"
```

---

### Task 6: Implement Rust Core — Config Storage Module

**Files:**
- Modify: `packages/core/src/config/store.rs`
- Modify: `packages/core/src/config/mod.rs`
- Modify: `packages/core/Cargo.toml` (add chacha20poly1305 if available, or base64 for v1 simple encryption)

**Interfaces:**
- Consumes: None
- Produces:
  - `ConfigStore::new(app_name: &str) -> Self`
  - `ConfigStore::save(&self, endpoint: &str, api_key: &str, model: &str) -> Result<(), CoreError>`
  - `ConfigStore::load(&self) -> Result<Option<AIConfigData>, CoreError>`
  - `struct AIConfigData { endpoint: String, api_key: String, model: String }`

- [ ] **Step 1: Add base64 dependency to core Cargo.toml**

In `packages/core/Cargo.toml`, add after `uuid`:
```toml
base64 = "0.22"
ring = "0.17"
```

- [ ] **Step 2: Implement ConfigStore with encryption**

Replace `packages/core/src/config/store.rs`:
```rust
use crate::error::CoreError;
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use ring::aead::{Aad, LessSafeKey, Nonce, UnboundKey, AES_256_GCM};
use ring::rand::{SecureRandom, SystemRandom};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIConfigData {
    pub endpoint: String,
    pub api_key: String,
    pub model: String,
}

pub struct ConfigStore {
    config_path: PathBuf,
    key: [u8; 32],
}

impl ConfigStore {
    pub fn new(app_name: &str) -> Result<Self, CoreError> {
        let config_dir = dirs_next().ok_or_else(|| {
            CoreError::Config("cannot determine config directory".to_string())
        })?;
        let app_dir = config_dir.join(app_name);
        std::fs::create_dir_all(&app_dir)
            .map_err(|e| CoreError::Config(format!("cannot create config dir: {e}")))?;

        let config_path = app_dir.join("config.enc");
        let key_path = app_dir.join("key.bin");

        let key = if key_path.exists() {
            let key_bytes = std::fs::read(&key_path)
                .map_err(|e| CoreError::Config(format!("cannot read key: {e}")))?;
            let mut key = [0u8; 32];
            key.copy_from_slice(&key_bytes[..32]);
            key
        } else {
            let rng = SystemRandom::new();
            let mut key = [0u8; 32];
            rng.fill(&mut key)
                .map_err(|_| CoreError::Config("key generation failed".to_string()))?;
            std::fs::write(&key_path, &key)
                .map_err(|e| CoreError::Config(format!("cannot write key: {e}")))?;

            #[cfg(unix)]
            {
                use std::os::unix::fs::PermissionsExt;
                let mut perms = std::fs::metadata(&key_path)
                    .map_err(|e| CoreError::Config(format!("cannot read key metadata: {e}")))?
                    .permissions();
                perms.set_mode(0o600);
                std::fs::set_permissions(&key_path, perms)
                    .map_err(|e| CoreError::Config(format!("cannot set key permissions: {e}")))?;
            }

            key
        };

        Ok(Self { config_path, key })
    }

    pub fn save(&self, endpoint: &str, api_key: &str, model: &str) -> Result<(), CoreError> {
        let config = AIConfigData {
            endpoint: endpoint.to_string(),
            api_key: api_key.to_string(),
            model: model.to_string(),
        };

        let plaintext = serde_json::to_vec(&config)
            .map_err(|e| CoreError::Config(format!("serialize error: {e}")))?;

        let rng = SystemRandom::new();
        let mut nonce_bytes = [0u8; 12];
        rng.fill(&mut nonce_bytes)
            .map_err(|_| CoreError::Config("nonce generation failed".to_string()))?;

        let unbound_key = UnboundKey::new(&AES_256_GCM, &self.key)
            .map_err(|_| CoreError::Config("invalid key".to_string()))?;
        let key = LessSafeKey::new(unbound_key);

        let nonce = Nonce::assume_unique_for_key(nonce_bytes);
        let aad = Aad::empty();

        let mut in_out = plaintext.clone();
        key.seal_in_place_append_tag(nonce, aad, &mut in_out)
            .map_err(|_| CoreError::Config("encryption failed".to_string()))?;

        let mut combined = nonce_bytes.to_vec();
        combined.extend_from_slice(&in_out);

        let encoded = BASE64.encode(&combined);
        std::fs::write(&self.config_path, encoded)
            .map_err(|e| CoreError::Config(format!("write error: {e}")))?;

        Ok(())
    }

    pub fn load(&self) -> Result<Option<AIConfigData>, CoreError> {
        if !self.config_path.exists() {
            return Ok(None);
        }

        let encoded = std::fs::read_to_string(&self.config_path)
            .map_err(|e| CoreError::Config(format!("read error: {e}")))?;

        let combined = BASE64.decode(&encoded)
            .map_err(|e| CoreError::Config(format!("decode error: {e}")))?;

        if combined.len() < 12 + 16 {
            return Ok(None);
        }

        let nonce_bytes: [u8; 12] = combined[..12].try_into().unwrap();
        let ciphertag = &combined[12..];

        let unbound_key = UnboundKey::new(&AES_256_GCM, &self.key)
            .map_err(|_| CoreError::Config("invalid key".to_string()))?;
        let key = LessSafeKey::new(unbound_key);

        let nonce = Nonce::assume_unique_for_key(nonce_bytes);
        let aad = Aad::empty();

        let mut in_out = ciphertag.to_vec();
        key.open_in_place(nonce, aad, &mut in_out)
            .map_err(|_| CoreError::Config("decryption failed — config may be corrupted".to_string()))?;

        let config: AIConfigData = serde_json::from_slice(&in_out)
            .map_err(|e| CoreError::Config(format!("deserialize error: {e}")))?;

        Ok(Some(config))
    }
}

// Minimal dirs_next replacement
fn dirs_next() -> Option<PathBuf> {
    #[cfg(target_os = "macos")]
    {
        if let Ok(home) = std::env::var("HOME") {
            return Some(PathBuf::from(home).join("Library").join("Application Support"));
        }
    }
    #[cfg(target_os = "linux")]
    {
        if let Ok(data) = std::env::var("XDG_CONFIG_HOME") {
            if !data.is_empty() {
                return Some(PathBuf::from(data));
            }
        }
        if let Ok(home) = std::env::var("HOME") {
            return Some(PathBuf::from(home).join(".config"));
        }
    }
    #[cfg(target_os = "windows")]
    {
        if let Ok(appdata) = std::env::var("APPDATA") {
            return Some(PathBuf::from(appdata));
        }
    }
    None
}
```

- [ ] **Step 3: Update config/mod.rs**

Replace `packages/core/src/config/mod.rs`:
```rust
mod store;

pub use store::{AIConfigData, ConfigStore};
```

- [ ] **Step 4: Write tests**

Create `packages/core/tests/config_tests.rs`:
```rust
use exambot_core::config::{AIConfigData, ConfigStore};

#[test]
fn test_save_and_load_config() {
    let store = ConfigStore::new("ExamBotTest").unwrap();
    store
        .save("https://api.openai.com/v1", "sk-test-key-123", "gpt-4")
        .unwrap();

    let config = store.load().unwrap().unwrap();
    assert_eq!(config.endpoint, "https://api.openai.com/v1");
    assert_eq!(config.api_key, "sk-test-key-123");
    assert_eq!(config.model, "gpt-4");
}

#[test]
fn test_load_nonexistent() {
    let store = ConfigStore::new("ExamBotNonExistent").unwrap();
    let config = store.load().unwrap();
    assert!(config.is_none());
}
```

- [ ] **Step 5: Run tests**

Run: `cargo test -p exambot-core`
Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: implement encrypted config storage module"
```

---

### Task 7: Implement Tauri Commands (Backend Bridge)

**Files:**
- Modify: `src-tauri/src/lib.rs`

**Interfaces:**
- Consumes: All `exambot-core` modules
- Produces:
  - `#[tauri::command] get_models(endpoint: String, api_key: String) -> Result<Vec<ModelInfo>, String>`
  - `#[tauri::command] generate_exam(file_path: String, params_json: String, endpoint: String, api_key: String, model: String) -> Result<GenerateResult, String>`
  - `#[tauri::command] export_csv(questions_json: String, save_path: String) -> Result<(), String>`
  - `#[tauri::command] save_config(endpoint: String, api_key: String, model: String) -> Result<(), String>`
  - `#[tauri::command] load_config() -> Result<Option<AIConfigData>, String>`

- [ ] **Step 1: Implement all Tauri commands**

Replace `src-tauri/src/lib.rs`:
```rust
use exambot_core::ai::{AIClient, ModelInfo};
use exambot_core::config::{AIConfigData, ConfigStore};
use exambot_core::exam::{generate_exam as core_generate_exam, ExamParams, Question};
use exambot_core::export::export_csv as core_export_csv;
use exambot_core::parser::parse_file;
use serde::{Deserialize, Serialize};

const APP_NAME: &str = "ExamBot";

#[derive(Serialize)]
pub struct GenerateResult {
    pub questions: Vec<Question>,
}

#[tauri::command]
async fn get_models(endpoint: String, api_key: String) -> Result<Vec<ModelInfo>, String> {
    let client = AIClient::new(&endpoint, &api_key);
    client
        .fetch_models()
        .await
        .map_err(|e| format!("Failed to fetch models: {e}"))
}

#[tauri::command]
async fn generate_exam(
    file_path: String,
    params_json: String,
    endpoint: String,
    api_key: String,
    model: String,
) -> Result<GenerateResult, String> {
    let text = parse_file(&file_path).map_err(|e| format!("File parse error: {e}"))?;

    let params: ExamParams =
        serde_json::from_str(&params_json).map_err(|e| format!("Invalid params JSON: {e}"))?;

    let client = AIClient::new(&endpoint, &api_key);
    let questions = core_generate_exam(&client, &text, &params, &model)
        .await
        .map_err(|e| format!("Exam generation error: {e}"))?;

    Ok(GenerateResult { questions })
}

#[tauri::command]
fn export_csv(questions_json: String, save_path: String) -> Result<(), String> {
    let questions: Vec<Question> =
        serde_json::from_str(&questions_json).map_err(|e| format!("Invalid questions JSON: {e}"))?;
    core_export_csv(&questions, &save_path).map_err(|e| format!("CSV export error: {e}"))
}

#[tauri::command]
fn save_config(endpoint: String, api_key: String, model: String) -> Result<(), String> {
    let store = ConfigStore::new(APP_NAME).map_err(|e| format!("Config init error: {e}"))?;
    store
        .save(&endpoint, &api_key, &model)
        .map_err(|e| format!("Config save error: {e}"))
}

#[tauri::command]
fn load_config() -> Result<Option<AIConfigData>, String> {
    let store = ConfigStore::new(APP_NAME).map_err(|e| format!("Config init error: {e}"))?;
    store.load().map_err(|e| format!("Config load error: {e}"))
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
```

- [ ] **Step 2: Verify compilation**

Run: `cargo check -p exambot`
Expected: Compiles.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: implement Tauri backend commands"
```

---

### Task 8: Implement Axum Web Server (Web Platform Backend)

**Files:**
- Modify: `packages/server/src/main.rs`
- Create: `packages/server/src/routes.rs`
- Modify: `packages/server/Cargo.toml`

**Interfaces:**
- Consumes: `exambot-core`
- Produces:
  - `GET /api/models?endpoint=...&api_key=...` → `Vec<ModelInfo>`
  - `POST /api/generate` (multipart: file + params JSON + config JSON) → `GenerateResult`
  - `GET /api/export` (query: questions JSON) → CSV file download
  - Serves frontend static files in production

- [ ] **Step 1: Add multipart support to server Cargo.toml**

Add to `packages/server/Cargo.toml` dependencies:
```toml
axum = { version = "0.8", features = ["multipart"] }
tower-http = { version = "0.6", features = ["cors", "fs"] }
tempfile = "3"
exambot-core = { path = "../core" }
```

- [ ] **Step 2: Implement server routes**

Create `packages/server/src/routes.rs`:
```rust
use axum::{
    extract::{Multipart, Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use exambot_core::ai::{AIClient, ModelInfo};
use exambot_core::config::{AIConfigData, ConfigStore};
use exambot_core::exam::{generate_exam, ExamParams, Question};
use exambot_core::parser::parse_file;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tempfile::NamedTempFile;
use tokio::io::AsyncWriteExt;

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
                file_data = Some(field.bytes().await.map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?.to_vec());
            }
            "params" => params_json = field.text().await.map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?,
            "endpoint" => endpoint = field.text().await.map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?,
            "api_key" => api_key = field.text().await.map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?,
            "model" => model = field.text().await.map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?,
            _ => {}
        }
    }

    let file_data = file_data.ok_or((StatusCode::BAD_REQUEST, "No file uploaded".to_string()))?;

    let params: ExamParams = serde_json::from_str(&params_json)
        .map_err(|e| (StatusCode::BAD_REQUEST, format!("Invalid params: {e}")))?;

    let ext = file_name.rsplit('.').next().unwrap_or("txt");
    let mut temp_file = NamedTempFile::new()
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    temp_file
        .write_all(&file_data)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let (_, temp_path) = temp_file.keep()
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
```

- [ ] **Step 3: Implement server main.rs**

Replace `packages/server/src/main.rs`:
```rust
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
        .route("/api/config/save", post(routes::save_config_handler))
        .route("/api/config/load", get(routes::load_config_handler))
        .nest_service("/", ServeDir::new("../frontend/dist"))
        .layer(CorsLayer::new().allow_origin(Any).allow_methods(Any).allow_headers(Any))
        .with_state(state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    println!("ExamBot server running on http://localhost:3000");
    axum::serve(listener, app).await.unwrap();
}
```

- [ ] **Step 4: Verify compilation**

Run: `cargo check -p exambot-server`
Expected: Compiles.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: implement Axum web server with REST API"
```

---

### Task 9: Implement Vue Frontend — API Abstraction Layer

**Files:**
- Create: `frontend/src/api/bridge.ts`
- Create: `frontend/src/api/http.ts`
- Create: `frontend/src/api/index.ts`

- [ ] **Step 1: Write Tauri bridge adapter**

Create `frontend/src/api/bridge.ts`:
```typescript
import { invoke } from '@tauri-apps/api/core'
import type { AIConfig, ExamParams, ModelInfo, Question } from '@exambot/shared'

export interface GenerateResult {
  questions: Question[]
}

export const tauriApi = {
  async getModels(endpoint: string, apiKey: string): Promise<ModelInfo[]> {
    return invoke<ModelInfo[]>('get_models', { endpoint, apiKey: apiKey ?? '' })
  },

  async generateExam(
    filePath: string,
    params: ExamParams,
    endpoint: string,
    apiKey: string,
    model: string,
  ): Promise<GenerateResult> {
    return invoke<GenerateResult>('generate_exam', {
      filePath,
      paramsJson: JSON.stringify(params),
      endpoint,
      apiKey: apiKey ?? '',
      model,
    })
  },

  async exportCsv(questions: Question[], savePath: string): Promise<void> {
    return invoke<void>('export_csv', {
      questionsJson: JSON.stringify(questions),
      savePath,
    })
  },

  async saveConfig(config: AIConfig): Promise<void> {
    return invoke<void>('save_config', {
      endpoint: config.endpoint,
      apiKey: config.api_key,
      model: config.model,
    })
  },

  async loadConfig(): Promise<AIConfig | null> {
    return invoke<AIConfig | null>('load_config')
  },
}
```

- [ ] **Step 2: Write HTTP adapter**

Create `frontend/src/api/http.ts`:
```typescript
import type { AIConfig, ExamParams, ModelInfo, Question } from '@exambot/shared'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export interface GenerateResult {
  questions: Question[]
}

export const httpApi = {
  async getModels(endpoint: string, apiKey: string): Promise<ModelInfo[]> {
    const url = `${BASE_URL}/api/models?endpoint=${encodeURIComponent(endpoint)}&api_key=${encodeURIComponent(apiKey)}`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`)
    return res.json()
  },

  async generateExam(
    file: File,
    params: ExamParams,
    config: AIConfig,
  ): Promise<GenerateResult> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('params', JSON.stringify(params))
    formData.append('endpoint', config.endpoint)
    formData.append('api_key', config.api_key)
    formData.append('model', config.model)

    const res = await fetch(`${BASE_URL}/api/generate`, {
      method: 'POST',
      body: formData,
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`)
    return res.json()
  },

  async exportCsv(questions: Question[]): Promise<void> {
    const csvContent = generateCsvContent(questions)
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'exambot_questions.csv'
    a.click()
    URL.revokeObjectURL(url)
  },

  async saveConfig(config: AIConfig): Promise<void> {
    const res = await fetch(`${BASE_URL}/api/config/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    })
    if (!res.ok) {
      // Fallback to localStorage
      localStorage.setItem('exambot_config', JSON.stringify(config))
    }
  },

  async loadConfig(): Promise<AIConfig | null> {
    try {
      const res = await fetch(`${BASE_URL}/api/config/load`)
      if (res.ok) {
        const data = await res.json()
        return data
      }
    } catch {}
    const stored = localStorage.getItem('exambot_config')
    return stored ? JSON.parse(stored) : null
  },
}

function generateCsvContent(questions: Question[]): string {
  const headers = ['id', 'type', 'stem', 'options', 'answer', 'analysis']
  const rows = questions.map((q) => [
    q.id,
    q.type,
    q.stem.replace(/"/g, '""'),
    q.options.join('|'),
    q.answer.replace(/"/g, '""'),
    q.analysis.replace(/"/g, '""'),
  ])
  const csvRows = [headers, ...rows].map((r) =>
    r.map((c) => `"${c}"`).join(','),
  )
  return '\uFEFF' + csvRows.join('\n')
}
```

- [ ] **Step 3: Write unified API adapter**

Create `frontend/src/api/index.ts`:
```typescript
import type { AIConfig, ExamParams, ModelInfo } from '@exambot/shared'
import { tauriApi, type GenerateResult as TauriGenerateResult } from './bridge'
import { httpApi, type GenerateResult as HttpGenerateResult } from './http'

let _isTauri: boolean | null = null

function isTauri(): boolean {
  if (_isTauri === null) {
    _isTauri = '__TAURI__' in window || '__TAURI_INTERNALS__' in window
  }
  return _isTauri
}

export const api = {
  async getModels(config: AIConfig): Promise<ModelInfo[]> {
    if (isTauri()) {
      return tauriApi.getModels(config.endpoint, config.api_key)
    }
    return httpApi.getModels(config.endpoint, config.api_key)
  },

  async generateExam(
    fileOrPath: File | string,
    params: ExamParams,
    config: AIConfig,
  ): Promise<{ questions: import('@exambot/shared').Question[] }> {
    if (isTauri()) {
      return tauriApi.generateExam(
        fileOrPath as string,
        params,
        config.endpoint,
        config.api_key,
        config.model,
      )
    }
    return httpApi.generateExam(fileOrPath as File, params, config)
  },

  async exportCsv(
    questions: import('@exambot/shared').Question[],
    savePath?: string,
  ): Promise<void> {
    if (isTauri()) {
      return tauriApi.exportCsv(questions, savePath!)
    }
    return httpApi.exportCsv(questions)
  },

  async saveConfig(config: AIConfig): Promise<void> {
    if (isTauri()) {
      return tauriApi.saveConfig(config)
    }
    return httpApi.saveConfig(config)
  },

  async loadConfig(): Promise<AIConfig | null> {
    if (isTauri()) {
      return tauriApi.loadConfig()
    }
    return httpApi.loadConfig()
  },
}
```

- [ ] **Step 4: Install @tauri-apps/api**

Run: `cd frontend && pnpm add @tauri-apps/api@^2`

- [ ] **Step 5: Configure workspace link for @exambot/shared**

Modify `frontend/package.json`, add to dependencies:
```json
"@exambot/shared": "workspace:*"
```

Create root `pnpm-workspace.yaml`:
```yaml
packages:
  - 'frontend'
  - 'packages/shared'
```

Create root `package.json`:
```json
{
  "name": "exambot",
  "private": true,
  "scripts": {
    "dev": "cd frontend && pnpm dev",
    "build": "cd frontend && pnpm build"
  }
}
```

Run: `pnpm install` (from root)

- [ ] **Step 6: Verify frontend builds**

Run: `cd frontend && pnpm build`
Expected: Build succeeds.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: implement API abstraction layer (Tauri + HTTP adapters)"
```

---

### Task 10: Implement Vue Frontend — Router, Layout & Stores

**Files:**
- Modify: `frontend/src/router.ts`
- Modify: `frontend/src/App.vue`
- Create: `frontend/src/components/layout/AppShell.vue`
- Create: `frontend/src/stores/config.ts`
- Create: `frontend/src/stores/exam.ts`
- Modify: `frontend/src/main.ts`

- [ ] **Step 1: Configure router**

Replace `frontend/src/router/index.ts`:
```typescript
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/config',
    },
    {
      path: '/config',
      name: 'config',
      component: () => import('@/views/ConfigView.vue'),
      meta: { title: 'AI Config' },
    },
    {
      path: '/generate',
      name: 'generate',
      component: () => import('@/views/GenerateView.vue'),
      meta: { title: 'Generate Exam' },
    },
    {
      path: '/preview',
      name: 'preview',
      component: () => import('@/views/PreviewView.vue'),
      meta: { title: 'Preview & Export' },
    },
  ],
})

export default router
```

- [ ] **Step 2: Create config store**

Create `frontend/src/stores/config.ts`:
```typescript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { AIConfig, ModelInfo } from '@exambot/shared'
import { api } from '@/api'

export const useConfigStore = defineStore('config', () => {
  const endpoint = ref('https://api.openai.com/v1')
  const apiKey = ref('')
  const model = ref('')
  const models = ref<ModelInfo[]>([])
  const loading = ref(false)
  const configured = computed(() => !!endpoint.value && !!apiKey.value && !!model.value)

  async function loadSaved() {
    const saved = await api.loadConfig()
    if (saved) {
      endpoint.value = saved.endpoint
      apiKey.value = saved.api_key
      model.value = saved.model
    }
  }

  async function fetchModels() {
    if (!endpoint.value || !apiKey.value) return
    loading.value = true
    try {
      models.value = await api.getModels({ endpoint: endpoint.value, apiKey: apiKey.value, model: '' })
    } catch (e: any) {
      throw new Error(e.message || String(e))
    } finally {
      loading.value = false
    }
  }

  async function save() {
    await api.saveConfig({ endpoint: endpoint.value, apiKey: apiKey.value, model: model.value })
  }

  function getConfig(): AIConfig {
    return { endpoint: endpoint.value, apiKey: apiKey.value, model: model.value }
  }

  return { endpoint, apiKey, model, models, loading, configured, loadSaved, fetchModels, save, getConfig }
})
```

- [ ] **Step 3: Create exam store**

Create `frontend/src/stores/exam.ts`:
```typescript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ExamParams, Question, QuestionType, Difficulty } from '@exambot/shared'
import { api } from '@/api'
import { useConfigStore } from './config'

export const useExamStore = defineStore('exam', () => {
  const selectedFile = ref<File | null>(null)
  const filePath = ref('')
  const questionTypes = ref<QuestionType[]>([])
  const count = ref(5)
  const difficulty = ref<Difficulty>('medium' as Difficulty)
  const language = ref('zh-CN')
  const topicFilter = ref('')
  const questions = ref<Question[]>([])
  const generating = ref(false)
  const generated = computed(() => questions.value.length > 0)

  function getParams(): ExamParams {
    return {
      question_types: questionTypes.value,
      count: count.value,
      difficulty: difficulty.value,
      language: language.value,
      topic_filter: topicFilter.value || undefined,
    }
  }

  async function generate() {
    const configStore = useConfigStore()
    generating.value = true
    try {
      const fileOrPath = filePath.value || selectedFile.value!
      const result = await api.generateExam(fileOrPath, getParams(), configStore.getConfig())
      questions.value = result.questions
    } finally {
      generating.value = false
    }
  }

  function reset() {
    selectedFile.value = null
    filePath.value = ''
    questions.value = []
  }

  return { selectedFile, filePath, questionTypes, count, difficulty, language, topicFilter, questions, generating, generated, getParams, generate, reset }
})
```

- [ ] **Step 4: Create responsive layout shell**

Create `frontend/src/components/layout/AppShell.vue`:
```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

const navItems = [
  { title: 'Config', icon: 'mdi-cog', path: '/config' },
  { title: 'Generate', icon: 'mdi-creation', path: '/generate' },
  { title: 'Preview', icon: 'mdi-table-eye', path: '/preview' },
]
</script>

<template>
  <v-app>
    <v-navigation-drawer
      v-if="$vuetify.display.mdAndUp"
      permanent
      rail
    >
      <v-list density="compact" nav>
        <v-list-item
          v-for="item in navItems"
          :key="item.path"
          :title="item.title"
          :prepend-icon="item.icon"
          :active="route.path === item.path"
          @click="router.push(item.path)"
        />
      </v-list>
    </v-navigation-drawer>

    <v-main>
      <v-container fluid class="pa-4">
        <router-view />
      </v-container>
    </v-main>

    <v-bottom-navigation v-if="$vuetify.display.smAndDown" grow>
      <v-btn
        v-for="item in navItems"
        :key="item.path"
        :value="item.path"
        @click="router.push(item.path)"
      >
        <v-icon>{{ item.icon }}</v-icon>
        <span>{{ item.title }}</span>
      </v-btn>
    </v-bottom-navigation>
  </v-app>
</template>
```

- [ ] **Step 5: Update App.vue**

Replace `frontend/src/App.vue`:
```vue
<script setup lang="ts">
import { onMounted } from 'vue'
import { useConfigStore } from '@/stores/config'

const configStore = useConfigStore()

onMounted(async () => {
  await configStore.loadSaved()
})
</script>

<template>
  <AppShell />
</template>

<style>
html, body { margin: 0; padding: 0; }
</style>
```

- [ ] **Step 6: Verify frontend builds**

Run: `cd frontend && pnpm build`
Expected: Build succeeds.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: implement router, layout shell, and Pinia stores"
```

---

### Task 11: Implement Vue Frontend — ConfigView

**Files:**
- Create: `frontend/src/views/ConfigView.vue`
- Create: `frontend/src/components/config/ApiSettings.vue`

- [ ] **Step 1: Create ApiSettings component**

Create `frontend/src/components/config/ApiSettings.vue`:
```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useConfigStore } from '@/stores/config'

const store = useConfigStore()
const showKey = ref(false)
const fetchError = ref('')
const fetchingModels = ref(false)
const saveSuccess = ref(false)

async function handleFetchModels() {
  fetchError.value = ''
  fetchingModels.value = true
  try {
    await store.fetchModels()
  } catch (e: any) {
    fetchError.value = e.message || String(e)
  } finally {
    fetchingModels.value = false
  }
}

async function handleSave() {
  try {
    await store.save()
    saveSuccess.value = true
    setTimeout(() => (saveSuccess.value = false), 2500)
  } catch {}
}
</script>

<template>
  <v-card class="mx-auto" max-width="640">
    <v-card-title class="text-h5">AI Configuration</v-card-title>
    <v-card-text>
      <v-text-field
        v-model="store.endpoint"
        label="API Endpoint URL"
        placeholder="https://api.openai.com/v1"
        variant="outlined"
        density="comfortable"
        prepend-inner-icon="mdi-server"
      />

      <v-text-field
        v-model="store.apiKey"
        :type="showKey ? 'text' : 'password'"
        label="API Key"
        placeholder="sk-..."
        variant="outlined"
        density="comfortable"
        prepend-inner-icon="mdi-key"
        :append-inner-icon="showKey ? 'mdi-eye-off' : 'mdi-eye'"
        @click:append-inner="showKey = !showKey"
      />

      <v-btn
        block
        variant="tonal"
        :loading="fetchingModels"
        :disabled="!store.endpoint || !store.apiKey"
        @click="handleFetchModels"
      >
        Fetch Models
      </v-btn>

      <v-alert
        v-if="fetchError"
        type="error"
        variant="tonal"
        density="compact"
        closable
        class="mt-2"
      >
        {{ fetchError }}
      </v-alert>

      <v-select
        v-if="store.models.length > 0"
        v-model="store.model"
        :items="store.models"
        item-title="id"
        item-value="id"
        label="Model"
        variant="outlined"
        density="comfortable"
        prepend-inner-icon="mdi-brain"
        class="mt-4"
      />
      <v-text-field
        v-else
        v-model="store.model"
        label="Model Name"
        placeholder="e.g. gpt-4o"
        variant="outlined"
        density="comfortable"
        prepend-inner-icon="mdi-brain"
        class="mt-4"
      />
    </v-card-text>

    <v-card-actions>
      <v-spacer />
      <v-btn
        color="primary"
        variant="elevated"
        :disabled="!store.configured"
        @click="handleSave"
      >
        Save Configuration
      </v-btn>
    </v-card-actions>

    <v-alert
      v-if="saveSuccess"
      type="success"
      variant="tonal"
      density="compact"
      class="mx-4 mb-4"
    >
      Configuration saved successfully
    </v-alert>
  </v-card>
</template>
```

- [ ] **Step 2: Create ConfigView**

Create `frontend/src/views/ConfigView.vue`:
```vue
<script setup lang="ts">
import { onMounted } from 'vue'
import { useConfigStore } from '@/stores/config'
import ApiSettings from '@/components/config/ApiSettings.vue'
import { useRouter } from 'vue-router'

const store = useConfigStore()
const router = useRouter()
</script>

<template>
  <div>
    <ApiSettings />

    <div class="text-center mt-6">
      <v-btn
        v-if="store.configured"
        size="large"
        color="primary"
        variant="flat"
        prepend-icon="mdi-arrow-right"
        @click="router.push('/generate')"
      >
        Start Generating
      </v-btn>
    </div>
  </div>
</template>
```

- [ ] **Step 3: Verify frontend builds**

Run: `cd frontend && pnpm build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: implement AI configuration page"
```

---

### Task 12: Implement Vue Frontend — GenerateView

**Files:**
- Create: `frontend/src/views/GenerateView.vue`
- Create: `frontend/src/components/generate/FileUploader.vue`
- Create: `frontend/src/components/generate/ParamForm.vue`

- [ ] **Step 1: Create FileUploader component**

Create `frontend/src/components/generate/FileUploader.vue`:
```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import { open } from '@tauri-apps/plugin-dialog'

const props = defineProps<{ isTauri: boolean }>()
const emit = defineEmits<{ fileSelected: [file: File | null, path: string] }>()

const file = ref<File | null>(null)
const filePath = ref('')
const fileName = computed(() => file.value?.name || (filePath.value ? filePath.value.split('/').pop() || filePath.value : ''))

async function handleTauriPick() {
  const selected = await open({
    multiple: false,
    filters: [{ name: 'Documents', extensions: ['txt', 'docx', 'pdf'] }],
  })
  if (selected) {
    filePath.value = selected as string
    emit('fileSelected', null, filePath.value)
  }
}

function handleWebPick(event: Event) {
  const input = event.target as HTMLInputElement
  if (input.files?.length) {
    file.value = input.files[0]
    emit('fileSelected', file.value, '')
  }
}
</script>

<template>
  <v-card variant="outlined" class="pa-4 text-center" @click="isTauri ? handleTauriPick() : undefined">
    <template v-if="isTauri">
      <v-btn
        block
        variant="outlined"
        prepend-icon="mdi-file-upload"
        @click="handleTauriPick"
      >
        Select Document (TXT, DOCX, PDF)
      </v-btn>
    </template>
    <template v-else>
      <input
        type="file"
        accept=".txt,.docx,.pdf"
        style="display: none"
        ref="fileInput"
        @change="handleWebPick"
      />
      <v-btn
        block
        variant="outlined"
        prepend-icon="mdi-file-upload"
        @click="($refs.fileInput as HTMLInputElement)?.click()"
      >
        Select Document (TXT, DOCX, PDF)
      </v-btn>
    </template>

    <div v-if="fileName" class="mt-2 text-body-2 font-weight-medium">
      Selected: {{ fileName }}
    </div>
  </v-card>
</template>
```

- [ ] **Step 2: Create ParamForm component**

Create `frontend/src/components/generate/ParamForm.vue`:
```vue
<script setup lang="ts">
import { useExamStore } from '@/stores/exam'
import { QuestionType, Difficulty } from '@exambot/shared'

const store = useExamStore()

const typeOptions = [
  { title: 'Single Choice', value: QuestionType.SingleChoice },
  { title: 'Multi Choice', value: QuestionType.MultiChoice },
  { title: 'True/False', value: QuestionType.TrueFalse },
  { title: 'Fill Blank', value: QuestionType.FillBlank },
  { title: 'Short Answer', value: QuestionType.ShortAnswer },
]

const difficultyOptions = [
  { title: 'Easy', value: Difficulty.Easy },
  { title: 'Medium', value: Difficulty.Medium },
  { title: 'Hard', value: Difficulty.Hard },
]
</script>

<template>
  <v-card>
    <v-card-text>
      <v-row>
        <v-col cols="12">
          <div class="text-subtitle-2 mb-2">Question Types</div>
          <v-chip-group v-model="store.questionTypes" column multiple>
            <v-chip
              v-for="opt in typeOptions"
              :key="opt.value"
              :value="opt.value"
              filter
              variant="outlined"
            >
              {{ opt.title }}
            </v-chip>
          </v-chip-group>
        </v-col>

        <v-col cols="12" sm="6">
          <v-text-field
            v-model.number="store.count"
            label="Number of Questions"
            type="number"
            variant="outlined"
            density="comfortable"
            :min="1"
            :max="50"
            hide-details
          />
        </v-col>

        <v-col cols="12" sm="6">
          <v-select
            v-model="store.difficulty"
            :items="difficultyOptions"
            item-title="title"
            item-value="value"
            label="Difficulty"
            variant="outlined"
            density="comfortable"
            hide-details
          />
        </v-col>

        <v-col cols="12" sm="6">
          <v-select
            v-model="store.language"
            :items="[
              { title: 'Chinese', value: 'zh-CN' },
              { title: 'English', value: 'en-US' },
            ]"
            item-title="title"
            item-value="value"
            label="Language"
            variant="outlined"
            density="comfortable"
            hide-details
          />
        </v-col>

        <v-col cols="12" sm="6">
          <v-text-field
            v-model="store.topicFilter"
            label="Topic / Chapter (optional)"
            placeholder="e.g. Machine Learning"
            variant="outlined"
            density="comfortable"
            hide-details
          />
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>
```

- [ ] **Step 3: Create GenerateView**

Create `frontend/src/views/GenerateView.vue`:
```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useExamStore } from '@/stores/exam'
import { useConfigStore } from '@/stores/config'
import FileUploader from '@/components/generate/FileUploader.vue'
import ParamForm from '@/components/generate/ParamForm.vue'

const router = useRouter()
const examStore = useExamStore()
const configStore = useConfigStore()

const isTauri = '__TAURI__' in window
const error = ref('')
const fileSelected = ref(false)

const canGenerate = computed(() => {
  return fileSelected.value && examStore.questionTypes.length > 0 && examStore.count > 0 && configStore.configured
})

function onFileSelected(file: File | null, path: string) {
  fileSelected.value = !!(file || path)
  examStore.selectedFile = file
  examStore.filePath = path
}

async function handleGenerate() {
  error.value = ''
  try {
    await examStore.generate()
    router.push('/preview')
  } catch (e: any) {
    error.value = e.message || String(e)
  }
}
</script>

<template>
  <div>
    <h2 class="text-h5 mb-4">Generate Exam Questions</h2>

    <v-row>
      <v-col cols="12" md="6">
        <FileUploader :is-tauri="isTauri" @file-selected="onFileSelected" />
      </v-col>

      <v-col cols="12" md="6">
        <ParamForm />
      </v-col>
    </v-row>

    <v-alert
      v-if="error"
      type="error"
      variant="tonal"
      closable
      class="mt-4"
    >
      {{ error }}
    </v-alert>

    <div class="text-center mt-6">
      <v-btn
        size="large"
        color="primary"
        variant="flat"
        :loading="examStore.generating"
        :disabled="!canGenerate"
        prepend-icon="mdi-magic-staff"
        @click="handleGenerate"
      >
        {{ examStore.generating ? 'Generating...' : 'Generate Questions' }}
      </v-btn>
    </div>

    <v-progress-linear
      v-if="examStore.generating"
      indeterminate
      color="primary"
      class="mt-4"
    />
  </div>
</template>
```

- [ ] **Step 4: Fix FileUploader for web compatibility**

The file `frontend/src/components/generate/FileUploader.vue` must not statically import `@tauri-apps/plugin-dialog`. Rewrite the script section:

`frontend/src/components/generate/FileUploader.vue` (complete):
```vue
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const props = defineProps<{ isTauri: boolean }>()
const emit = defineEmits<{ fileSelected: [file: File | null, path: string] }>()

const file = ref<File | null>(null)
const filePath = ref('')
const fileInput = ref<HTMLInputElement>()
let openDialogFn: any = null

onMounted(async () => {
  if (props.isTauri) {
    try {
      const mod = await import('@tauri-apps/plugin-dialog')
      openDialogFn = mod.open
    } catch {}
  }
})

const fileName = computed(() => {
  if (file.value) return file.value.name
  if (filePath.value) {
    const parts = filePath.value.replace(/\\/g, '/').split('/')
    return parts[parts.length - 1] || filePath.value
  }
  return ''
})

async function handleTauriPick() {
  if (!openDialogFn) return
  const selected = await openDialogFn({
    multiple: false,
    filters: [{ name: 'Documents', extensions: ['txt', 'docx', 'pdf'] }],
  })
  if (selected) {
    filePath.value = selected as string
    emit('fileSelected', null, filePath.value)
  }
}

function handleWebPick() {
  fileInput.value?.click()
}

function onWebFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  if (input.files?.length) {
    file.value = input.files[0]
    emit('fileSelected', file.value, '')
  }
}
</script>

<template>
  <v-card variant="outlined" class="pa-4">
    <template v-if="isTauri">
      <v-btn
        block
        variant="outlined"
        prepend-icon="mdi-file-upload"
        @click="handleTauriPick"
      >
        Select Document (TXT, DOCX, PDF)
      </v-btn>
    </template>
    <template v-else>
      <input
        ref="fileInput"
        type="file"
        accept=".txt,.docx,.pdf"
        style="display: none"
        @change="onWebFileChange"
      />
      <v-btn
        block
        variant="outlined"
        prepend-icon="mdi-file-upload"
        @click="handleWebPick"
      >
        Select Document (TXT, DOCX, PDF)
      </v-btn>
    </template>

    <div v-if="fileName" class="mt-2 text-body-2 font-weight-medium">
      Selected: {{ fileName }}
    </div>
  </v-card>
</template>
```

- [ ] **Step 5: Re-verify build**

Run: `cd frontend && pnpm build`
Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: implement exam generation page"
```

---

### Task 13: Implement Vue Frontend — PreviewView

**Files:**
- Create: `frontend/src/views/PreviewView.vue`
- Create: `frontend/src/components/preview/QuestionTable.vue`

- [ ] **Step 1: Create QuestionTable component**

Create `frontend/src/components/preview/QuestionTable.vue`:
```vue
<script setup lang="ts">
import { computed } from 'vue'
import type { Question } from '@exambot/shared'

const props = defineProps<{ questions: Question[] }>()

const headers = [
  { title: '#', key: 'id', width: 80 },
  { title: 'Type', key: 'type', width: 120 },
  { title: 'Question', key: 'stem' },
  { title: 'Options', key: 'options' },
  { title: 'Answer', key: 'answer', width: 150 },
  { title: 'Analysis', key: 'analysis', width: 200 },
]

const items = computed(() =>
  props.questions.map((q, i) => ({
    id: q.id || `${i + 1}`,
    type: q.type,
    stem: q.stem,
    options: q.options.join(' | '),
    answer: q.answer,
    analysis: q.analysis,
  })),
)
</script>

<template>
  <v-data-table
    :headers="headers"
    :items="items"
    density="compact"
    hover
    class="elevation-1"
  >
    <template v-slot:item.stem="{ value }">
      <div style="max-width: 300px; white-space: normal;">{{ value }}</div>
    </template>
    <template v-slot:item.analysis="{ value }">
      <div style="max-width: 200px; white-space: normal;">{{ value || '-' }}</div>
    </template>
  </v-data-table>
</template>
```

- [ ] **Step 2: Create PreviewView**

Create `frontend/src/views/PreviewView.vue`:
```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useExamStore } from '@/stores/exam'
import { api } from '@/api'
import QuestionTable from '@/components/preview/QuestionTable.vue'

const router = useRouter()
const examStore = useExamStore()
const isTauri = '__TAURI__' in window
const exportError = ref('')

async function handleExport() {
  exportError.value = ''
  try {
    if (isTauri) {
      let saveDialog: any
      try {
        saveDialog = (await import('@tauri-apps/plugin-dialog')).save
      } catch {}
      const savePath = saveDialog
        ? await saveDialog({
            defaultPath: 'exambot_questions.csv',
            filters: [{ name: 'CSV', extensions: ['csv'] }],
          })
        : null
      if (!savePath) return
      await api.exportCsv(examStore.questions, savePath as string)
    } else {
      await api.exportCsv(examStore.questions)
    }
  } catch (e: any) {
    exportError.value = e.message || String(e)
  }
}

function handleBack() {
  examStore.reset()
  router.push('/generate')
}
</script>

<template>
  <div v-if="!examStore.generated">
    <v-empty-state
      title="No Questions Yet"
      text="Generate questions first from the Generate page."
      icon="mdi-alert-circle-outline"
    >
      <template v-slot:actions>
        <v-btn color="primary" variant="flat" @click="router.push('/generate')">
          Go to Generate
        </v-btn>
      </template>
    </v-empty-state>
  </div>

  <div v-else>
    <div class="d-flex align-center mb-4 ga-2">
      <h2 class="text-h5">Generated Questions ({{ examStore.questions.length }})</h2>
      <v-spacer />
      <v-btn variant="outlined" prepend-icon="mdi-arrow-left" @click="handleBack">
        Back
      </v-btn>
      <v-btn
        color="primary"
        variant="flat"
        prepend-icon="mdi-download"
        @click="handleExport"
      >
        Export CSV
      </v-btn>
    </div>

    <v-alert
      v-if="exportError"
      type="error"
      variant="tonal"
      closable
      class="mb-4"
    >
      {{ exportError }}
    </v-alert>

    <QuestionTable :questions="examStore.questions" />
  </div>
</template>
```

- [ ] **Step 3: Install tauri plugin dialog for frontend**

Run: `cd frontend && pnpm add @tauri-apps/plugin-dialog@^2`

- [ ] **Step 4: Verify build**

Run: `cd frontend && pnpm build`
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: implement preview and export page"
```

---

### Task 14: Integration — Polish, Update index.html, and Final Verification

**Files:**
- Modify: `frontend/index.html`
- Modify: `frontend/src/main.ts` (import order check)
- Modify: `src-tauri/tauri.conf.json` (verify build config)

- [ ] **Step 1: Update index.html**

Replace `frontend/index.html`:
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>ExamBot</title>
    <style>
      body { margin: 0; font-family: Roboto, sans-serif; }
    </style>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 2: Verify all builds**

Run: `cargo check --workspace`
Expected: All Rust code compiles.

Run: `cd frontend && pnpm build`
Expected: Frontend builds successfully.

- [ ] **Step 3: Run full test suite**

Run: `cargo test --workspace`
Expected: All tests pass.

- [ ] **Step 4: Verify Tauri dev mode**

Run: `cargo tauri dev`
Expected: Tauri app launches with Vue frontend.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "chore: final integration polish and verification"
```

---
