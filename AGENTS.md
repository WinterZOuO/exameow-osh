# AGENTS.md

Architecture reference for AI agents working on **Exameow**. Read this before exploring the codebase.

## What Exameow Is

AI-powered exam question generator. Users upload study materials (PDF, DOCX, XLSX, PPTX, EPUB, ODT, TXT, CSV, HTML) and get exam questions generated via any OpenAI-compatible API. Includes a built-in practice/quiz mode with wrong-question tracking. Exports to XLSX/CSV.

Version `2.1.1` (kept in sync across root `package.json`, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`, `workers/package.json`).

## Tech Stack

- **Frontend**: Vue 3 + Vite + Pinia + Vue Router + TypeScript, Tailwind CSS 3.4 (custom Material You tonal palette)
- **Desktop/Mobile**: Tauri v2 (Rust shell)
- **Self-hosted backend**: Rust / Axum 0.8
- **Serverless backend**: Cloudflare Workers (Hono 4.7)
- **Shared core logic**: Rust crate `exameow-core` (parsing, AI client, exam gen, export, encrypted config)
- **Package mgmt**: pnpm workspace + Cargo workspace (monorepo)

## Three-Backend Architecture (KEY CONCEPT)

The **same Vue frontend** targets three interchangeable backends. `frontend/src/api/index.ts` auto-detects the platform at runtime and routes accordingly:

| Platform | Detector | API module | Backend |
|----------|----------|-----------|---------|
| Tauri desktop/mobile | `isTauri()` | `api/bridge.ts` → `invoke()` | `src-tauri/src/lib.rs` (Tauri commands) |
| Cloudflare | `isCloudflare()` | `api/cf.ts` → `fetch()` | `workers/src/index.ts` (Hono) |
| Web / Docker | fallback | `api/http.ts` → `fetch()` | `packages/server` (Axum) |

Platform detection lives in `frontend/src/utils/platform.ts`.

**Important consequence**: Core logic (file parsing, prompt building, export) is **duplicated** in Rust (`packages/core`) and TypeScript (`workers/src/*`, `frontend/src/utils/*`). When changing generation prompts, parsing, or export format, update BOTH the Rust and TS implementations to keep parity.

## Directory Map

```
frontend/              Vue 3 SPA (hash routing)
  src/
    api/               Platform-routed API layer (index.ts dispatches to bridge/http/cf)
    stores/            Pinia: exam.ts, practice.ts, config.ts, wrongQuestions.ts, fileInput.ts, i18n.ts
    views/             GenerateView, PracticeView, ConfigView, PreviewView
    utils/             Browser-side: fileParser, pdfParser, importParser, aiClient, platform
    components/        config/ generate/ layout/ practice/ preview/
  dist/                Build output (served by Axum or copied to workers/public)

packages/
  core/                Rust crate `exameow-core` (shared server logic)
    src/parser/        parse_file() dispatch → pdf/docx/pptx/excel/csv/epub/odt/html/txt
    src/ai/            OpenAI-compatible HTTP client (client.rs)
    src/exam/          types.rs (Question/ExamParams), prompt.rs (generate_exam + prompts)
    src/export/        writer.rs (CSV), xlsx.rs (manual ZIP+XML, no lib)
    src/config/        store.rs (AES-256-GCM encrypted config persistence)
  server/              Axum HTTP server; routes.rs has 6 handlers
  shared/              TS shared types (@exameow/shared) src/types.ts

src-tauri/             Tauri app; src/lib.rs = all Tauri commands; tauri.conf.json; capabilities/
workers/               Cloudflare Worker; src/{index,ai,exam,parser,export,types}.ts; wrangler.toml
scripts/               deploy-cf.sh, docker-build.sh, start-android-emulator.sh
.github/workflows/     release.yml (Tauri 3-OS builds + Docker to ghcr.io)
```

## Commands

| Task | Command |
|------|---------|
| Install deps | `pnpm install` |
| Frontend dev | `cd frontend && pnpm dev` (port 5273) |
| Frontend build | `cd frontend && pnpm build` |
| Frontend typecheck | `cd frontend && pnpm run type-check` |
| Axum server | `cargo run -p exameow-server` (port 3000) |
| Tauri dev | `pnpm tauri dev` |
| Tauri build | `pnpm tauri build` |
| CF Worker dev | `cd workers && pnpm dev` |
| CF Worker typecheck | `cd workers && pnpm typecheck` |
| CF deploy | `bash scripts/deploy-cf.sh` |
| Docker | `docker compose up -d --build` |
| Quick launcher | `./start.sh` (macOS/Linux) / `start.bat` |

**No test suite exists. No ESLint/rustfmt/clippy config files.** Use `pnpm run type-check` (frontend), `pnpm typecheck` (workers), and `cargo build` for verification.

## Data Models

Defined in `packages/shared/src/types.ts` (TS) and `packages/core/src/exam/types.rs` (Rust) — keep in sync.

- **Question**: `{ id, type, stem, options[], answer, analysis }`
- **QuestionType**: `SingleChoice | MultiChoice | TrueFalse | FillBlank | ShortAnswer`
- **Difficulty**: `Easy | Medium | Hard`
- **ExamParams**: `{ question_types, count, type_counts?, difficulty, language, topic_filter?, text?, batch_index?, batch_total?, source_name? }`
- **QuestionBank**: `{ id, name, questions[], createdAt, source }`
- **PracticeSession**: `{ bankId, mode, questions[], currentIndex, startedAt, finishedAt?, mockConfig? }`
- **WrongQuestionEntry**: `{ questionId, wrongCount, consecutiveCorrect, lastWrongAt, addedAt }`
- **AIConfig**: `{ endpoint, api_key, model }`

## Storage (no database)

- **Browser `localStorage`**: question banks, practice sessions, wrong questions, config. Keys: `exameow-banks`, `exameow-practice-session`, `exameow-wrong`, `exameow-questions`, `exameow-sourcefile`.
- **Native (Tauri/Axum)**: AI credentials encrypted with AES-256-GCM via `ConfigStore` in OS config dir (macOS `~/Library/Application Support/Exameow/`, Linux `~/.config/Exameow/`, Windows `%APPDATA%/Exameow/`).
- **Server is stateless** — only handles file parsing + AI calls.

## Environment Variables

| Var | Default | Used by | Notes |
|-----|---------|---------|-------|
| `AI_ENDPOINT` | `https://api.openai.com/v1` | Server | OpenAI-compatible endpoint |
| `AI_API_KEY` | (required) | Server | Provider API key |
| `AI_MODEL` | `gpt-4o` | Server | Default model |
| `PORT` | `3000` | Server | Axum port |
| `STATIC_DIR` | `../frontend/dist` (local) | Server | Built frontend path |
| `VITE_CLOUDFLARE` | — | Frontend | Set in deploy-cf.sh to trigger CF routing |
| `CF_ACCOUNT_ID` / `CF_API_TOKEN` | wrangler.toml | Workers | CF model listing |

## Data Flow (Generate)

1. Upload in `GenerateView` → `stores/exam.ts` calls `api.generateExam()`
2. `api/index.ts` routes by platform (Tauri invoke / Axum fetch / CF fetch)
3. Backend parses file → text (`parser`), builds prompt (`exam/prompt`), calls AI client
4. Returns JSON question array → parsed → back to frontend
5. `stores/exam.ts` persists to localStorage; `stores/practice.ts` creates a `QuestionBank`

**Batch/chunking**: Large text split into ~32K-char chunks (preserving markdown/table/section structure); ≤15 questions per batch, distributed proportionally. Multiple sequential AI calls per generation.

## Conventions / Gotchas

- **Rust ⇄ TS parity**: prompts, parsers, and XLSX export exist in both languages — change both.
- **XLSX has no library**: built manually as ZIP+XML in both `packages/core/src/export/xlsx.rs` and `workers/src/export.ts`.
- **Hash-based SPA routing** (`createWebHashHistory`); CF Worker + Axum both serve SPA fallback.
- **Material You theme** in `frontend/tailwind.config.js` (full tonal palette + custom animations).
- Docs: `README.md` (EN), `README_zh.md` (ZH). `frontend/README.md` is boilerplate.
- CI releases on `v*` tags: Tauri (linux/windows/macOS, x86_64+aarch64) + Docker to `ghcr.io/heshengtao/exameow`.
