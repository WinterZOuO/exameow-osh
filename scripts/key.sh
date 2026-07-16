#!/usr/bin/env bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_DIR/.env"

if [ -f "$ENV_FILE" ] && grep -q '^API_KEY=' "$ENV_FILE" 2>/dev/null; then
  source "$ENV_FILE"
  echo "API Key: $API_KEY"
else
  echo "No API Key found. Run ./scripts/deploy.sh first to generate one."
  exit 1
fi
