# Fork 說明

呢個係 [heshengtao/exameow](https://github.com/heshengtao/exameow) 嘅 fork，
改造成 OSH 課程嘅多人共享 MC 題溫習平台。

設計文件同決策記錄喺另一個 repo：`class_review_web/docs/design.md`。

## 同 upstream 嘅分歧

### W1（已完成）

**刪走用唔著嘅部分**
- `src-tauri/`、`plugins/screenrecord/` — 桌面同流動 app（Cargo workspace members 已同步移除）
- `test/` — 5MB 嘅 apk / dmg 二進制
- `ota.json` — Tauri OTA manifest
- 前端嘅 OCR / 拍照搜題 / 螢幕錄影 / 相機即時搜題成組功能，連帶 `onnxruntime-web`、`ppu-paddle-ocr` 兩個重型依賴
- `scripts/fetch-ocr-models.mjs` 同 `predev` / `prebuild` hook —— 呢個 script 下載失敗會 `throw` 直接炸咗成個 build，係外部網絡依賴，對 CI 唔可靠

**Dockerfile**
- 拆走清華 TUNA 鏡像設定。apk 嗰段本身有 fallback，但 cargo 嘅 `[source.tuna] replace-with` 係無條件覆蓋 crates.io，喺 GitHub Actions（境外 runner）會極慢甚至失敗
- 拆走 `sed -i '/src-tauri/d; ...'` hack —— Cargo.toml 已經冇咗嗰兩個 member
- runtime 加 `/app/data`，俾 SQLite 用

**CI**
- 移除 `release-desktop.yml`、`release-mobile.yml`、`release-docker.yml`
  （後者推去 upstream 作者嘅 Docker Hub，用一個我哋冇嘅 secret）
- 新增 `build-image.yml`：push 到 `main` 就 build 同推 image 上 **GHCR**，
  用內建 `GITHUB_TOKEN`，唔使設定任何 secret。amd64 + arm64 雙架構。
  注意 GHCR 只收全小寫 image name，workflow 內有一步將 `github.repository` 轉小楷。

**docker-compose.prod.yml**
- 原本指住本地 image 名 `exameow-server:latest`，而且**冇 volume** —— 一 restart 就冇晒個 DB。
  改為 pull GHCR image + 掛 `exameow-data` volume
- port 改為只 bind `127.0.0.1`，由 Caddy 反向代理，唔直接曝露

### 之後仲要做（見設計文件 §8）

- W2 帳號同 session
- W3 每用戶 LLM 設定 + 伺服器端加密 + 反轉請求流程 + endpoint allowlist（修 SSRF）
- W4 課程同成員（join code）
- W5 教材上傳同 ACL
- W6 共享題庫（`stores/practice.ts`、`stores/exam.ts` 由 localStorage 改 server）
- W7 練習流程

`api/bridge.ts`（Tauri）同 `api/cf.ts`（Cloudflare Workers）暫時保留 ——
喺 web build 係惰性嘅、唔阻編譯，W3 重寫 config 層時一齊處理。

## 部署

```bash
export ADMIN_TOKEN='<自己改一個>'
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```
