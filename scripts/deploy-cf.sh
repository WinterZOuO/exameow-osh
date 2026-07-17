#!/bin/bash
set -e

echo "=== ExamBot Cloudflare Deploy ==="
echo ""

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Step 1: Build frontend for Cloudflare
echo "[1/3] Building frontend for Cloudflare..."
cd "$PROJECT_DIR/frontend"

VITE_CLOUDFLARE=true npx vite build
echo "  Frontend built successfully."

# Step 2: Copy frontend dist to worker public directory
echo ""
echo "[2/3] Copying frontend to worker..."
cd "$PROJECT_DIR/workers"
rm -rf public
mkdir -p public
cp -R "$PROJECT_DIR/frontend/dist/"* public/
rm -rf public/ocr public/ort
echo "  Removed local OCR assets (CF uses CDN)."
echo "  Files copied to workers/public/"

# Step 3: Deploy worker
echo ""
echo "[3/3] Deploying to Cloudflare..."
npx wrangler deploy

echo ""
echo "=== Deploy complete ==="
echo ""
echo "Your app is live at the URL shown above."
echo "To test the API: curl <YOUR_URL>/api/health"
