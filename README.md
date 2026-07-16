# ExamBot

AI-powered exam question generator. Upload study materials, generate professional exam questions in seconds.

[中文文档](README_zh.md)

## Features

- **Document Parsing** — Supports PDF, DOCX, XLSX, PPTX, EPUB, ODT, TXT, CSV, HTML
- **AI Question Generation** — Compatible with any OpenAI-format API (OpenAI, DeepSeek, Qwen, GLM, etc.)
- **Multiple Question Types** — Single choice, multiple choice, true/false, fill-in-the-blank, short answer
- **Export** — Download results as XLSX or CSV
- **Practice Mode** — Built-in quiz system with wrong-question tracking
- **Multi-Platform** — Desktop (macOS/Windows/Linux), Mobile (iOS/Android), Web, Docker, Cloudflare

## Installation

Pre-built binaries for all platforms are available on the [GitHub Releases](https://github.com/heshengtao/exambot/releases) page.

### Docker (Self-Hosted)

```bash
git clone https://github.com/heshengtao/exambot.git
cd exambot

# Build frontend
cd frontend && pnpm install && pnpm build && cd ..

# Configure AI provider
export AI_ENDPOINT=https://api.openai.com/v1
export AI_API_KEY=sk-your-key-here
export AI_MODEL=gpt-4o

# Build and run
docker compose up -d --build
```

Open `http://localhost:3000`.

### Docker (Pre-Built Image)

```bash
docker pull ghcr.io/heshengtao/exambot:latest
docker run -d -p 3000:3000 \
  -e AI_ENDPOINT=https://api.openai.com/v1 \
  -e AI_API_KEY=sk-your-key-here \
  -e AI_MODEL=gpt-4o \
  ghcr.io/heshengtao/exambot:latest
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `AI_ENDPOINT` | `https://api.openai.com/v1` | OpenAI-compatible API endpoint |
| `AI_API_KEY` | — | Your AI API key |
| `AI_MODEL` | `gpt-4o` | Default model to use |
| `PORT` | `3000` | Server listen port |
| `STATIC_DIR` | `/app/static` | Static files directory |
| `RUST_LOG` | `info` | Log level |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/models` | List available AI models |
| `POST` | `/api/generate` | Upload file + generate exam questions |
| `GET` | `/api/export` | Export questions as CSV |
| `POST` | `/api/export/xlsx` | Export questions as XLSX |
| `POST` | `/api/config/save` | Save AI configuration |
| `GET` | `/api/config/load` | Load saved AI configuration |

### Generate Exam

```bash
curl -X POST http://localhost:3000/api/generate \
  -F "file=@study-material.pdf" \
  -F 'params={"question_types":["single_choice","multi_choice"],"count":10,"difficulty":"medium","language":"Chinese"}'
```

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  Frontend (Vue 3 + Vite + Pinia)                    │
│  Served as static files from the Rust server        │
├─────────────────────────────────────────────────────┤
│  Server (Rust / Axum)                               │
│  ├── File Parser   (PDF, DOCX, XLSX, PPTX, EPUB…)  │
│  ├── AI Client     (OpenAI-compatible API)          │
│  ├── Exam Builder  (Prompt engineering + parsing)   │
│  └── Export        (XLSX, CSV)                     │
├─────────────────────────────────────────────────────┤
│  Deploy Targets                                     │
│  ├── Docker (self-hosted)                           │
│  ├── Tauri Desktop (macOS / Windows / Linux)        │
│  ├── Tauri Mobile (iOS / Android)                   │
│  └── Cloudflare Pages + Worker                      │
└─────────────────────────────────────────────────────┘
```

## Development

```bash
# Rust server
cargo run -p exambot-server

# Frontend dev server
cd frontend && pnpm dev

# Tauri desktop app
pnpm tauri dev
```

### Project Structure

```
exambot/
├── frontend/          # Vue 3 SPA
├── packages/
│   ├── core/          # Rust shared library (AI, parser, export, config)
│   ├── server/        # Axum HTTP server
│   └── shared/        # TypeScript shared types
├── src-tauri/         # Tauri desktop + mobile app
├── workers/           # Cloudflare Workers (Hono)
├── scripts/           # Build and deploy scripts
├── Dockerfile
└── docker-compose.yml
```

## License

Apache-2.0
