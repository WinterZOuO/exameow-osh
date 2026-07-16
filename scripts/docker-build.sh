#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_DIR/.env"

echo "=== 1/3: Building frontend ==="
(cd "$PROJECT_DIR/frontend" && pnpm install && pnpm build)

echo ""
echo "=== 2/3: Building Docker image ==="
(cd "$PROJECT_DIR" && docker build -t exambot-server:latest .)

echo ""
echo "=== 3/3: Exporting image ==="
IMAGE_FILE="$PROJECT_DIR/exambot-server.tar.gz"
(cd "$PROJECT_DIR" && docker save exambot-server:latest | gzip > "$IMAGE_FILE")
echo "Image exported: $IMAGE_FILE ($(du -h "$IMAGE_FILE" | cut -f1))"

if [ -f "$ENV_FILE" ] && grep -q '^API_KEY=' "$ENV_FILE" 2>/dev/null; then
  source "$ENV_FILE"
  echo ""
  echo "API Key: $API_KEY"
fi

echo ""
echo "Next steps:"
echo "  1. Upload exambot-server.tar.gz and docker-compose.prod.yml to your server"
echo "  2. On server: gunzip -c exambot-server.tar.gz | docker load"
echo "  3. On server: cd ~/exambot && API_KEY=xxx docker compose up -d"
