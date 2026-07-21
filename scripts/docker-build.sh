#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "=== 1/3: Building frontend ==="
(cd "$PROJECT_DIR/frontend" && pnpm install)
node "$PROJECT_DIR/scripts/fetch-ocr-models.mjs"
(cd "$PROJECT_DIR/frontend" && pnpm build)

echo ""
echo "=== 2/3: Building Docker image (linux/amd64) ==="
(cd "$PROJECT_DIR" && docker build --platform linux/amd64 -t quizseek-server:latest .)

echo ""
echo "=== 3/3: Exporting image ==="
IMAGE_FILE="$PROJECT_DIR/quizseek-server.tar.gz"
(cd "$PROJECT_DIR" && docker save quizseek-server:latest | gzip > "$IMAGE_FILE")
echo "Image exported: $IMAGE_FILE ($(du -h "$IMAGE_FILE" | cut -f1))"

echo ""
echo "Next steps:"
echo "  1. Upload quizseek-server.tar.gz and docker-compose.prod.yml to your server"
echo "  2. On server: gunzip -c quizseek-server.tar.gz | docker load"
echo "  3. On server: cd ~/quizseek && docker compose up -d"
