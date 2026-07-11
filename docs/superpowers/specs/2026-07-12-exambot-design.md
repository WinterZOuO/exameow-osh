# ExamBot Design Spec

## Overview

ExamBot is a cross-platform AI exam question generation application. Users upload documents (TXT/DOCX/text PDF), configure question parameters, and the AI generates questions based on document content. Results are previewed in a Material Design 3 UI and exported as CSV.

**Platforms:** Web, Desktop (Win/Mac/Linux), Mobile (Android/iOS)
**Tech Stack:** Vue 3 + TypeScript + Vite + Tauri v2 + Rust + Vuetify 3

## User Flow

```
[AI Config Page] -> [Exam Generation Page] -> [Preview & Export Page]
   (once setup)        (file + params)         (review + CSV download)

1. User opens app, configures AI endpoint (URL, API Key, select Model from auto-fetched list)
2. Config persists encrypted locally (desktop/mobile) or in localStorage (web)
3. User selects source document (TXT, DOCX, PDF) via file picker
4. User sets parameters: question types, count, difficulty, language, topic filter (optional)
5. Click "Generate" — document text is extracted, sent to AI with prompt
6. Questions are displayed in preview table
7. User clicks "Export CSV" to download
```

## Architecture

```
┌──────────────────────────────────────────────────────┐
│              Vue 3 Frontend (shared)                   │
│  Vuetify 3 MD3 UI — responsive layout                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────────┐  │
│  │ Config   │ │ Generate │ │ Preview & Export     │  │
│  │ Page     │ │ Page     │ │ Page                 │  │
│  └──────────┘ └──────────┘ └──────────────────────┘  │
│  ┌─────────────────────────────────────────────────┐ │
│  │         API Abstraction Layer                    │ │
│  │   bridge.ts (Tauri invoke) / http.ts (REST)      │ │
│  └─────────────────────────────────────────────────┘ │
├──────────────────┬───────────────────────────────────┤
│  Desktop/Mobile  │  Web                              │
│  Tauri IPC       │  Axum HTTP Server                 │
├──────────────────┴───────────────────────────────────┤
│                  Rust Core Library                     │
│  parser/  ai/  exam/  export/  config/                │
└──────────────────────────────────────────────────────┘
```

## Monorepo Structure

```
exambot/
├── packages/
│   ├── core/                    # Rust shared library
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── lib.rs
│   │       ├── parser/          # File text extraction
│   │       │   ├── mod.rs
│   │       │   ├── txt.rs       # Plain text reader
│   │       │   ├── docx.rs      # DOCX XML parsing
│   │       │   └── pdf.rs       # PDF text extraction
│   │       ├── ai/              # OpenAI-compatible client
│   │       │   ├── mod.rs
│   │       │   ├── client.rs    # HTTP client (reqwest)
│   │       │   └── models.rs    # /models endpoint
│   │       ├── exam/            # Exam generation engine
│   │       │   ├── mod.rs
│   │       │   ├── types.rs     # Question structs
│   │       │   └── prompt.rs    # Prompt builder
│   │       ├── export/          # CSV generation
│   │       │   ├── mod.rs
│   │       │   └── writer.rs
│   │       └── config/          # Encrypted config storage
│   │           ├── mod.rs
│   │           └── store.rs
│   ├── server/                  # Axum web server (web platform only)
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── main.rs
│   │       └── routes.rs
│   └── shared/                  # TypeScript shared types
│       ├── package.json
│       └── src/
│           ├── types.ts         # API request/response types
│           └── index.ts
├── frontend/                    # Vue 3 + TS + Vuetify
│   ├── package.json
│   ├── vite.config.ts
│   ├── index.html
│   └── src/
│       ├── main.ts
│       ├── App.vue
│       ├── router.ts
│       ├── api/
│       │   ├── bridge.ts       # Tauri invoke wrapper
│       │   ├── http.ts         # REST fetch wrapper
│       │   └── index.ts        # Unified API (auto-detect platform)
│       ├── stores/
│       │   ├── config.ts       # AI config store
│       │   ├── exam.ts         # Exam generation store
│       │   └── preview.ts      # Preview state store
│       ├── views/
│       │   ├── ConfigView.vue
│       │   ├── GenerateView.vue
│       │   └── PreviewView.vue
│       └── components/
│           ├── layout/
│           │   ├── AppShell.vue        # Responsive shell
│           │   ├── TopNav.vue          # Desktop top nav
│           │   └── BottomNav.vue       # Mobile bottom nav
│           ├── config/
│           │   ├── ApiSettings.vue
│           │   └── ModelSelector.vue
│           ├── generate/
│           │   ├── FileUploader.vue
│           │   ├── ParamForm.vue
│           │   └── GenerateButton.vue
│           └── preview/
│               ├── QuestionTable.vue
│               └── ExportButton.vue
├── src-tauri/                   # Tauri desktop/mobile config
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   ├── capabilities/
│   │   └── default.json
│   └── src/
│       └── lib.rs               # Tauri commands -> core
├── Cargo.toml                   # Workspace root
└── docs/
    └── superpowers/
        └── specs/
            └── 2026-07-12-exambot-design.md
```

## Data Models

### Question Struct (Rust + TS shared)

```rust
struct Question {
    id: String,           // UUID
    qtype: QuestionType,  // single_choice, multi_choice, true_false, fill_blank, short_answer
    stem: String,         // question text
    options: Vec<String>, // choices (empty for non-choice types)
    answer: String,       // correct answer
    analysis: String,     // explanation (optional)
}
```

### Exam Generation Params

```rust
struct ExamParams {
    question_types: Vec<QuestionType>,
    count: u32,
    difficulty: Difficulty,  // easy, medium, hard
    language: String,        // "zh-CN", "en-US", etc.
    topic_filter: Option<String>,  // chapter/section keyword filter
}
```

### AI Config

```rust
struct AIConfig {
    endpoint: String,   // OpenAI-compatible base URL
    api_key: String,    // encrypted at rest
    model: String,      // selected model name
}
```

## Component Details

### parser module
- `txt.rs`: Simple UTF-8 file reader, returns `String`
- `docx.rs`: Parse DOCX XML (zip + quick-xml), extract `<w:t>` text elements
- `pdf.rs`: Use `lopdf` to extract text content streams, skip binary/image PDFs
- Exposes unified `parse(path: &str, format: FileFormat) -> Result<String>`

### ai module  
- `client.rs`: `reqwest::Client` with configurable base URL
- `models.rs`: `GET {base_url}/models` → `Vec<ModelInfo>`
- Chat completion: `POST {base_url}/chat/completions` with JSON body
- Streaming support optional, prefer non-streaming for batch generation
- Error handling: connection timeout (30s), HTTP errors mapped to domain errors

### exam module
- `types.rs`: QuestionType enum, Difficulty enum, Question struct with Serialize/Deserialize
- `prompt.rs`: Build system prompt + user prompt from extracted text + ExamParams
  - System prompt instructs AI to output JSON array of questions
  - User prompt includes document text (truncated to ~32k chars if needed) + params
- Parse AI response JSON → `Vec<Question>`
- Validate: check count matches, each question has required fields

### export module
- `writer.rs`: Use `csv` crate with Serde
- Headers: id, type, stem, options (pipe-joined), answer, analysis
- Write to file path provided by save dialog

### config module
- `store.rs`: On desktop/mobile, save to `app_data_dir` with XChaCha20-Poly1305 encryption (using `ring` or `chacha20poly1305` crate)
- On web: `localStorage` (encryption optional, key handled server-side)
- Load config on app startup

### Vue Views

**ConfigView** — AI endpoint settings
- URL input with validation
- API Key input (password field)
- "Fetch Models" button calling `/models`
- Model dropdown (populated from fetched list)
- Save button → persists config

**GenerateView** — Main workflow
- FileUploader: drag-and-drop or click-to-browse (pdf/txt/docx filter)
- ParamForm: checkboxes for types, number input, difficulty radio, language select, optional topic textarea
- GenerateButton: disabled until file + params ready, shows loading state

**PreviewView** — Results review
- QuestionTable: Vuetify v-data-table with cols: #, Type, Question, Options, Answer, Analysis
- ExportButton: triggers save dialog → CSV download
- "Back to Generate" button to start over

## Platform Adaptation

### Desktop (Tauri — Win/Mac/Linux)
- Tauri commands call `core` library functions directly
- File dialog via `tauri-plugin-dialog`
- Config stored encrypted in app data directory
- Layout: side-nav or top-nav, wide content area

### Mobile (Tauri — Android/iOS)
- Same Vue frontend, Tauri WebView
- Bottom navigation bar
- Touch-optimized inputs
- Config stored in app sandbox

### Web
- Axum HTTP server wrapping `core` library
- REST API endpoints: `/api/config`, `/api/models`, `/api/generate`, `/api/export`
- Config stored in localStorage (with encryption)
- Layout: responsive, same as mobile on small screens

### Responsive Breakpoints
- Desktop: >= 960px — side navigation, two-column forms
- Tablet: 600-959px — top nav, full-width forms
- Mobile: < 600px — bottom nav, stacked layout

### API Abstraction Layer

```ts
// Detects platform at runtime
const adapter: ApiAdapter = '__TAURI__' in window ? new TauriAdapter() : new HttpAdapter()

// All views use adapter.generate(params) without caring about platform
interface ApiAdapter {
  getModels(config: AIConfig): Promise<ModelInfo[]>
  generateExam(file: File, params: ExamParams): Promise<Question[]>
  exportCsv(questions: Question[], path: string): Promise<void>
  saveConfig(config: AIConfig): Promise<void>
  loadConfig(): Promise<AIConfig | null>
}
```

## Error Handling

| Error Type | UI Behavior |
|---|---|
| File too large (>10MB) | Toast error, prevent upload |
| Unsupported file type | Toast error in FileUploader |
| PDF no extractable text | Warning toast + suggest OCR/plain text |
| AI endpoint unreachable | Toast with error detail, retry button |
| Invalid API key | Toast "Invalid API key / unauthorized" |
| AI response parse failure | Toast "AI returned unexpected format", retry |
| CSV write permission denied | Toast "Cannot write to selected location" |

## Security

- API Key encrypted at rest (XChaCha20-Poly1305)
- Key never sent to frontend logs or console
- No telemetry, no data sent anywhere except user-configured AI endpoint
- CSP enabled in Tauri config
- File system access scoped to user-selected files only (Tauri capabilities)

## Dependencies

### Rust (core)
- `reqwest` (HTTP client, json + rustls-tls features)
- `serde` + `serde_json` (serialization)
- `csv` (CSV export)
- `lopdf` (PDF text extraction)
- `quick-xml` + `zip` (DOCX parsing)
- `uuid` (question IDs)
- `ring` or `chacha20poly1305` (encryption)
- `thiserror` (error types)

### Rust (server)
- `axum` + `tokio` (HTTP server)
- `tower-http` (CORS)
- `core` (internal dependency)

### Frontend
- `vue` 3.x
- `vuetify` 3.x (Material Design 3)
- `vue-router` 4.x
- `pinia` (state management)
- `@tauri-apps/api` 2.x (Tauri bridge)
- `@tauri-apps/plugin-dialog` (file dialogs)

### Tauri Plugins
- `tauri-plugin-dialog`
- `tauri-plugin-fs`
- `tauri-plugin-opener`

## Non-Goals (v1)
- OCR for image-based PDFs
- Question editing in preview
- History of previous exams
- Batch file processing
- User accounts / auth
- Self-hosted AI models (Ollama/local)
