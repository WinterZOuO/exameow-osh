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

### W2（已完成）帳號同 session

新增 `packages/server/src/auth.rs`：

- `users` / `sessions` 表，密碼用 **argon2id**，session token 喺 DB **只存 SHA-256 hash**，明文只出現喺 HttpOnly cookie
- `require_auth` middleware 掛喺除咗 `/api/auth/login` 同 `/logout` 之外嘅**所有** `/api` 路由；靜態檔唔攔（登入頁要載到）
- admin 由 `ADMIN_USERNAME` / `ADMIN_PASSWORD` 種子建立；冇設密碼就隨機生成並喺 log 印一次
- admin-only：`GET/POST /api/auth/users`、`DELETE /api/auth/users/{id}`
- 登入失敗訊息「用戶唔存在」同「密碼錯」**完全一樣**，唔泄漏邊個 username 有效
- cookie 預設帶 `Secure`，本機用 HTTP 測試設 `COOKIE_SECURE=0`

**CORS 收緊**：由 `allow_origin(Any)` 改成預設**完全唔開**（生產同源就夠），
只有設咗 `CORS_ORIGIN` 先開，而且帶 credentials 要逐個 origin 列明、唔可以用萬用字元。

**順帶修咗 S1**：`/api/config/load` 而家冇 session 就 401，唔會再明文交出 API key。
（S2 `/api/models` query string 同 S3 SSRF 留返 W3。）

前端：`stores/auth.ts`、`views/LoginView.vue`、router `beforeEach` guard、
`http.ts` 統一 `apiFetch`（帶 credentials + 401 就彈返登入頁）、MineView 帳號區同登出掣。

順手修咗一個 W1 整出嚟嘅 bug：`AppShell.vue` 個 `navSearch` 導航項仲指住已刪嘅
`/search`（字串路徑，type-check 捉唔到）。

### W3（已完成）每人 LLM 設定 + 伺服器端加密

新增 `packages/server/src/llm.rs`。

**請求流程反轉（修 S1 根源）**

上游每次 generate / explain / judge 都由瀏覽器喺 body 帶住 `endpoint` + `api_key`，
所以 server 必須有辦法將條 key 交返俾瀏覽器 —— `/api/config/load` 明文回傳條 key
唔係疏忽，係嗰個架構嘅必然結果。

而家反轉：條 key 淨係喺「儲存」嗰一刻上傳一次，加密入 `user_llm_config`；
之後每次 AI 呼叫，server 按 session user 自己查返、解密、call LLM。
request body 只帶 `model`（型號唔係秘密）。

`/api/config/save` 同 `/api/config/load` 兩條路由**整條刪走**。

- `GET /api/llm-config` → `{ configured, endpoint, model, key_hint }`，**永遠冇 key**
- `PUT /api/llm-config` → `api_key` 留空 = 沿用已存嗰條（改型號唔使重貼 key）
- `DELETE /api/llm-config`
- `POST /api/llm-config/models` → **修 S2**：上游係 `GET /api/models?api_key=...`，
  條 key 入晒反向代理 access log 同瀏覽器歷史。而家係 POST，而且根本唔收 key

**加密**

AES-256-GCM，直接用返 `packages/core` 現成而且有測試嘅 `seal` / `open_sealed`
（原本係 private，今次改成 `pub`）。每行獨立 nonce。master key 由 `MASTER_KEY`
env 讀，**唔入 DB** —— DB 單獨洩漏解唔開啲 key，前提係兩者分開備份。

- 冇設 `MASTER_KEY` 直接停機，順手生成一條印出嚟俾人貼（同 W2 `ADMIN_PASSWORD` 一樣用 `fatal()`，唔用 `panic!`）
- 解密失敗（多數係換咗 `MASTER_KEY`）回 400 「請重新填」，唔回 500 —— 500 只會令人以為部 server 壞咗
- `key_hint` 係 `sk-a…4f2a`；12 字元或以下嘅 key 淨係顯示 `…`，露頭等於露晒
- `ResolvedLlm` 刻意**唔** derive `Serialize`，免得手殘 `Json(cfg)` 就送咗條 key 出街

**Endpoint allowlist（修 S3）**

13 個已知 provider host，只准 https、只准 443。額外 host 由 `LLM_EXTRA_HOSTS` 加
（呢啲准 http，因為加嘅人係管理員，自己知做緊咩）。

用 allowlist 而唔係 blocklist —— blocklist 永遠補唔切（IPv6、十進位 IP、
`169.254.169.254`、DNS rebinding…）。URL 用 `url` crate 解，唔自己手寫 parser，
順手擋埋 `https://api.openai.com@evil.com/` 呢類 userinfo 扮 host。

**redirect 都要擋**（allowlist 唔講但唔做就白做）：`reqwest` 預設跟到 10 次
redirect，一個准用嘅 host 回 `302 → http://169.254.169.254/` 就繞過晒個 allowlist。
`AIClient` 改成只跟**同一個 host** 嘅 redirect，跨 host 唔跟。

**前端**

- `stores/config.ts` 重寫：`apiKey` 變成只寫嘅 `apiKeyInput`，存完即刻清走；
  介面改為顯示 `keyHint`。換部機／清 cache 都唔使重新貼 key —— server 有就得
- `api/cf.ts`、`api/cf-models.ts`、`utils/aiClient.ts`、`utils/answerClient.ts`、
  `utils/modelList.ts` **刪走** —— 呢五個係「瀏覽器直駁 LLM」嘅路，
  必須喺前端揸住條 key 先做得嘢，同「key 只存 server」直接相沖。
  `api/index.ts` 唔再按平台分岔 AI 呼叫，Tauri 只留低檔案／匯出
- i18n 「Key 存在浏览器本地不会泄露」/「Key stays in your browser」**已經係大話**，
  改成講清楚 key 加密存喺伺服器，而且老實講埋「架站嗰位揸住 MASTER_KEY，
  技術上解得開」

### W4（已完成）課程同成員

新增 `packages/server/src/courses.rs`：`courses` + `course_members` 表。
任何已登入用戶都可以開新課程並自動成為 `owner`；其他人憑 `join_code` 加入
成為 `member`。所有課程範圍嘅路由都經 `require_member()` 先查成員資格。

- `join_code` 8 位（32^8 ≈ 1.1 萬億種組合），刻意同 `relay.rs` 嘅 6 位即棄
  exam code 分開諗 —— join_code 係長期入場券，唔係派一次即用嘅
- 唔係成員一律當「課程唔存在」回 404，唔會分 403/404 兩種訊息漏出「呢個
  course_id 其實存在」
- owner 唔可以直接離開，要用刪除 —— 唔想留低冇人揸嘅課程
- join_code 輸入前會 normalize（去空格、大楷化），用戶打錯大小寫或者手多打
  咗個 `-` 都照樣入到
- 刪課程要手動清 `course_members` —— SQLite 預設冇開 `foreign_keys`，
  schema 寫嘅 `ON DELETE CASCADE` 唔會自動生效，同 W2 刪 user 果度一樣

前端：新增 `/courses`（列表 + 開課 + 加入）同 `/courses/:id`（join code、
成員列表、離開／刪除），MineView 加返個入口。

**測試揪出一個前端 store cache bug**：`stores/courses.ts` 原本嘅
`ensureLoaded()` 靠 `loaded` flag 避免重複拉 API，但登出換第二個帳號登入
（同一個分頁）之後 flag 唔會重置，新用戶一入 `/courses` 會短暫閃返舊用戶嘅
課程列表。改用每次入頁都 `fetchCourses()`，加埋 `App.vue` 監聽登出時
`coursesStore.reset()` 兩層修。單用戶測試完全影唔到，一定要真係換帳號先見到。

### W5（已完成）教材上傳同 ACL

新增 `packages/server/src/materials.rs`：`materials` 表，掛喺 `courses` 底下。
淨係接受 `.md` / `.markdown`，上限 300 KB；借用 `packages/core` 現成嘅
`parse_file`（已經做咗編碼偵測、去 BOM、拒絕 binary/空檔），唔重新寫一次。

- **兩層 ACL 要分開諗**：唔係課程成員 → 當「唔存在」回 404（同 W4 果句
  一樣嘅道理）；係成員但唔係上傳者/admin → 403（明確話俾你知「呢樣嘢私有」，
  同課程存唔存在冇關）。`list` 對非 admin 淨係回自己上傳嗰啲，連檔名都
  唔會漏俾其他成員 —— 教材原文私有呢件事,要落到 list endpoint 都守
- **`require_member()` 由 W4 嘅 `courses.rs` 攞出嚟做 `pub(crate)`**，
  materials.rs 直接攞嚟用，唔重複寫多次同一條「係咪成員」查詢
- **`size` 呢個欄位一定要諗清楚係 byte 定係字數**。SQLite 嘅
  `LENGTH(text_column)` 對 TEXT 欄位計嘅係字元數，多位元組 UTF-8（中文）
  一計就同 Rust `content.len()`（byte 數）唔啱數 —— 測試上傳一份中文
  筆記，list 話 52、detail 話 112，先發現呢個位。修法：SQL 用
  `LENGTH(CAST(content AS BLOB))` 逼佢計 byte
- **去重用 `(course_id, uploader_id, sha256)` 三欄 unique index**，hash 計
  喺解碼之後嘅內容（唔係原始 bytes）—— 同一份筆記換個編碼再上傳都會撞返
  同一條，幂等處理（原地攞返已有嗰行，唔會插入新行）

前端：`/courses/:id` 頁加返「教材」卡片 —— 上傳（隱藏 `<input type=file>`
夾 `accept=".md,.markdown"`）、列表（size 用 KB 顯示、admin 睇到上傳者）、
逐項刪除（inline 確認，唔用 native `confirm()`）。新增 `stores/materials.ts`，
用 `courseId -> MaterialSummary[]` 嘅 map 存（同 `stores/courses.ts` 嘅扁平
陣列唔同構造，因為教材本身就係掛住某個課程先有意義）。同 W4 一樣要喺
`App.vue` 登出 watcher 度加 `materialsStore.reset()`，唔係嘅話會重演 W4
揪出嗰個「換用戶但 cache 冇清」嘅 bug。

**W6 落地之後要記得**：`questions.material_id` 會 reference materials(id)，
刪教材嗰陣要手動 `SET NULL`（SQLite 冇開 `foreign_keys`，`ON DELETE
SET NULL` 唔會自動生效）—— 而家 W5 範圍未有呢張表，暫時淨係刪 materials
一行就夠。

### 之後仲要做（見設計文件 §8）

- W6 共享題庫（`stores/practice.ts`、`stores/exam.ts` 由 localStorage 改 server）
- W7 練習流程

`api/bridge.ts`（Tauri）仲喺度但 AI 嗰部分已經冇人叫，web build 下係惰性。

## Image

`ghcr.io/winterzouo/exameow-osh:latest`（同時有 `sha-<short>` tag）

- **public**，VPS `docker pull` 唔使認證
- `linux/amd64` + `linux/arm64`
- 壓縮後 **9.8 MB**（Alpine + 靜態 Rust binary + 前端 dist）

## 部署

```bash
export ADMIN_TOKEN='<自己改一個>'
export MASTER_KEY="$(openssl rand -hex 32)"   # 生成一次，之後唔好再變
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

`MASTER_KEY` 一定要獨立收好：**唔好 commit 入 git，亦唔好同 `exameow-data`
volume 擺埋一齊備份**。兩者分開放，DB 單獨洩漏先至解唔開啲 API key。
遺失咗就所有已存嘅 key 都救唔返（用戶重新填就得，唔算災難）。
