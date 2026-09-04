# Fork 說明

呢個係 [heshengtao/exameow](https://github.com/heshengtao/exameow) 嘅 fork，
改造成 OSH 課程嘅多人共享 MC 題溫習平台。

設計文件同決策記錄喺另一個 repo：`class_review_web/docs/design.md`。
填 LLM endpoint / key 撞到問題睇 [PROVIDERS.md](PROVIDERS.md)。

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

（W6 落地已經補返 `questions.material_id` 刪教材時嘅手動 `SET NULL` 清理，
見下面 W6 段落。）

### W6（已完成）共享題庫

新增 `packages/server/src/questions.rs`：`questions` 表，掛喺 `courses`
底下，課程內所有成員共享同一份池（同教材相反 —— 教材原文私有，題目一入
庫就係大家嘅嘢）。`POST /api/courses/{id}/questions/bulk` 一次過插入一批
題目，撞 `(course_id, stem_hash)` 嘅重複題用 `INSERT OR IGNORE` 拋走；
`GET /api/courses/{id}/questions` 列出 `status='active'` 嘅共享池。

- **刻意冇跟設計文件 §6.4 嘅 `POST /api/courses/{id}/generate`**。設計文件
  原意係「server 直接用 `material_ids` 生成」，但生成管線（chunk 切分、
  batch、PDF/圖片解析）已經成套喺前端 `stores/exam.ts` 度，仲要處理埋
  Tauri 本機檔案路徑，Rust 側重寫一次唔化算。改法：`stores/exam.ts`
  嘅生成流程完全冇變，淨係「生成完之後點存」呢一步分岔 —— 有 `courseTarget`
  就 bulk insert 入共享題庫，冇就沿用返舊時嗰種存落 `localStorage` 嘅本機
  bank（`practiceStore.saveGeneratedAsBank`）。獨立（冇課程 context）嘅
  `/generate` 頁行為完全冇變，零 regression 風險
- **教材照舊借用現成嘅檔案解析管線,唔開多一條路**。GenerateView 揀咗某份
  教材生成，就將佢個 `content`（已經解碼好嘅字串）包做一個 `File`
  （`new File([content], filename)`），推入同一個 `fileInputsRef` —— 同直接
  拖一個 `.md` 檔上嚟行足全同一條路（`parseBrowserFile` 見 `.md` 就
  `file.text()`），前端零新解析代碼
- **`material_id` 淨係生成自單一份教材先有值**。揀咗教材生成先傳呢個
  id（等日後可以話俾你知「呢條題出自邊份筆記」），獨立檔案上傳或者未揀
  教材就傳 `null` —— 冇話得埋邊一個先係「出處」
- **material-scoped 嘅 bulk insert 要重做一次 ACL 檢查，唔可以信前端**。
  `material_id` 有值,server 要自己查返嗰份教材屬唔屬於呢個課程、你係唔係
  上傳者或 admin —— 唔係就 403/404（同 materials.rs 一樣嘅兩層邏輯）。
  淨係喺前端擋（例如淨係俾你揀自己嘅教材）唔夠，request body 可以隨便砌
- **去重 hash 摺埋空白同大小楷**：`normalize_stem()` 用 `split_whitespace()`
  摺走連續空白、`to_lowercase()` 轉細楷先 sha256。測試證咗「兩個人揸住
  同一份筆記,各自生成」呢個真實情景 —— 題幹字眼一模一樣但空白/大小楷有
  少少出入,一樣撞得中同一條 index
- **答案/選項曾經想過收埋唔畀睇，最後冇做**。第一版就兩個人、互相信任，
  收埋反而唔方便核對答案啱唔啱；`SharedQuestion` 照樣帶埋 `answer`/
  `options`。日後多人版先再諗要唔要留返俾 W7 嘅練習模式先解鎖
- **依家張表冚唔到設計文件 §6.2 嘅 `source_excerpt`/`model_used`**。
  `exameow_core::exam::Question` 呢個核心型別本身冇呢兩個欄，強行加即係
  自己另外維護一份型別，值博率唔高，第一期跳過，日後真係要再加

前端：`stores/questions.ts`（新）跟 `stores/materials.ts` 一樣用
`courseId -> SharedQuestion[]` map 存；`stores/exam.ts` 嘅 `generate()`
加一個可選嘅 `courseTarget` 參數，生成完視乎有冇呢個 target 分岔存去邊度
（見上面）。`/courses/:id` 頁新增「共享題庫」卡：題目數量、生成掣、
每條題撳一下展開睇選項/答案/解析；教材列表每行加多一粒「用呢份生成」
掣，帶 `?course=<id>&material=<id>` 跳去 `GenerateView`，嗰邊自動攞返
教材內容包做 File 塞入輸入框，生成完直接推入嗰個課程嘅共享題庫、彈返
「X 條新題目、Y 條重複已省略」嘅結果。同 W4/W5 一樣要喺 `App.vue` 登出
watcher 加 `questionsStore.reset()`。

### W7（已完成）練習流程

新增 `packages/server/src/attempts.rs`：`attempts`（答題記錄）同
`question_flags`（🚩 標記）兩張表，都掛喺 `questions`／`courses` 底下。
`POST /api/courses/{id}/questions/{qid}/attempts` 記一次答題結果；
`POST /api/courses/{id}/questions/{qid}/flag` toggle 🚩（撞
`(question_id, user_id)` unique index，撳一下標記、再撳一下取消）；
`GET /api/courses/{id}/attempts/me/summary` 攞返自己嘅聚合
`{attempted, correct}`。`questions.rs` 嘅 `list_questions_handler`
加多兩個 subquery 出嚟嘅欄：`flag_count`（呢條題俾幾多人 🚩 咗）、
`flagged_by_me`（自己有冇標記過）。

前端新增 `stores/coursePractice.ts`（抽題／判分／session 狀態）同
`views/CoursePracticeView.vue`（畫面），`/courses/:id` 加返一粒
「開始練習」掣同一句「你已作答 X 次，啱 Y 次」摘要；`QuestionCard.vue`
加咗個 `flagged`/`flagCount` prop + `toggleFlag` emit（冇傳 `flagged`
prop 就唔顯示,`PracticeView.vue` 嗰套本機 bank 練習完全冇受影響）。

**設計文件冇寫、但實作時要決定嘅嘢：**

- **抽題完全喺前端做,冇 server-side「開一個 practice session」嘅
  endpoint**。W6 嘅 `GET .../questions` 已經成個 `status='active'` 池
  攞晒落嚟,`coursePractice.ts` 淨係喺呢堆入面隨機抽 N 條——server 唔使
  知「呢次抽咗邊幾題」,少一條 API,亦冇「session id」呢個要另外管理嘅
  概念
- **session 純粹喺記憶體度,唔似 `practice.ts` 咁存 localStorage**。
  重新整頁就要由頭嚟過——呢個係刻意收窄嘅 scope：W7 嘅要求淨係「抽題
  → 答 → 對答案 → 寫 attempts」,跨 reload 保存進度中途嘅 session 唔喺
  呢張 checklist 度,唔使為咗呢樣嘢加多一層持久化邏輯
- **判分喺前端做（照抄 `practice.ts` 嗰套邏輯）,server 淨係信落嚟嘅
  結果寫低**,唔重新判一次。呢個唔係計分競賽,`is_correct` 亂報自己
  揾自己笨,冇必要為咗防呢種情況喺 server 度重寫一次判分邏輯
- **「A 同 B 嘅答題進度互相睇唔到」要喺 API 層做到,唔淨係前端唔顯示**。
  成個模組冇任何一條路由可以攞到第二個用戶嘅 `attempts`,`/attempts/me/summary`
  淨係聚合自己嘅——呢個唔係前端揀唔揀顯示嘅問題,而係伺服器根本冇畀
  呢條路
- **AI 判分／解釋喺 course practice 入面完整駁埋**（`api.judgeAnswer`／
  `api.explainQuestion` 本身就同 bank/localStorage 冇關,`PracticeView.vue`
  點用就照抄嗰套嚟用）,但 AI 解釋攞返嚟嘅內容淨係喺嗰次 session 顯示,
  **唔會寫返去共享題庫**——一開始諗過持久化,但 W6 已經刻意跳過
  `source_excerpt`/`model_used` 呢類擴充欄,加返一條「AI 解釋要唔要
  存」嘅寫入路徑唔化算,留返俾人自己再撳一次生成
- **順手修**：`courses.rs` 刪 course 嗰段之前得 `course_members`
  行手動清（W4 已知嘅 SQLite 冇開 `foreign_keys` gotcha),`materials`/
  `questions` 一直漏喺度冇清——W7 加埋 `attempts`/`question_flags`
  之後索性一次過補晒四張表,唔留 orphan row
- **順手修一個判斷題判分 bug**：`normalizeTF`（`stores/practice.ts`）同
  `QuestionCard.vue` 嘅 `correctAnswerSet` 都用 `.includes()` 撞子字串
  嚟認「呢個答案係啱定錯」,但 `"FALSE"` 呢個字本身就藏咗個 `"A"`,會俾
  TRUE 嗰組嘅單字母 token `'A'` 誤中副車——一條答案存做完整字 `"FALSE"`
  嘅判斷題,會俾人判到「啱」。起呢個 store 測試新練習流程嗰陣直接撞到
  （bulk insert 咗一條 `answer: "FALSE"` 嘅題,答啱咗都話你錯）,順手喺
  `practice.ts`／`QuestionCard.vue`／新嘅 `coursePractice.ts` 三處一齊
  改成「exact token match 優先,得多過一個字嘅 token 先做 substring
  fallback」

### W8（已完成）Provider 設定備忘

新增 [PROVIDERS.md](PROVIDERS.md)：兩個 provider 嘅確實 endpoint、endpoint 容錯
helper 實際點行、allowlist 規矩、錯誤訊息對照表、條 key 存喺邊。

**設計文件冇寫、但寫嗰陣先發現嘅嘢**

- **放 root，唔放 `docs/`**。upstream `.gitignore` 第 21 行將成個 `docs/` 排除咗
  （「Internal tooling (not part of the open-source release)」），擺入去就唔會 commit 到。
  root 已經有 `FORK-NOTES.md` 呢個 fork 專屬檔，多一個唔算亂
- **「呢兩個 host 應該係 allowlist 嘅預設值」呢項 W3 已經做咗**，W8 淨係覆核：
  `DEFAULT_ALLOWED_HOSTS` 兩個都在，`cargo test -p exameow-server llm::` 7 passed，
  入面 `allows_known_https_providers` 直接 assert 咗 Gemini 條長 path 通過
- **`withV1Suffix` 對 Gemini 唔止救唔到，仲會將個設定改壞**。設計文件寫住
  「`normalizeEndpoint` / `withV1Suffix` 會自動試 `/v1` 後綴，填錯少少都救得返」——
  對 DeepSeek 啱，對 Gemini 係反話。**修咗**，見下面
- **env `AI_ENDPOINT` 唔行 `validate_endpoint`**（`env_config()` 直接 `std::env::var`）。
  睇 code 覆核嗰陣先留意到 —— 呢個係合理嘅（管理員自己喺 compose file 寫，
  同「用戶隨手填一條 URL」唔同性質），但唔寫低就好易日後當咗係漏

**順手修個 `/v1` fallback bug**

寫 `PROVIDERS.md` 逐句覆核「填錯少少都救得返」呢句嗰陣撞出嚟，改兩處：

- `frontend/src/utils/endpoint.ts` 個 `withV1Suffix` 本來係 `/\/v\d+$/` 睇結尾。
  Gemini 條官方相容端點 `.../v1beta/openai` 結尾係 `/openai` 唔係 `/v1`，
  就會俾人補成 `.../v1beta/openai/v1` —— 一條唔存在嘅路徑。改成睇**成條
  path 有冇任何一段係 `v<數字>…`**（`v1`／`v2`／`v1beta`／`v1alpha` 都算），
  有就唔補。特登只 strip 走 scheme + authority 先 split，
  免得 `https://v2.example.com/api` 個 host label 當咗版本段
- `frontend/src/stores/config.ts` 個 `fetchModels()`：retry 之前要 `save()`
  存低個新 endpoint（server 攞自己嗰行去 call provider，唔存就試唔到），
  但**retry 都失敗嘅話冇還原**。加返還原 —— 唔係嘅話「獲取模型」失敗過一次
  （貼錯 key、超時、rate limit 都算），個設定就永久留咗條爛 endpoint。
  allowlist 亦攔佢唔住，只睇 host 唔睇 path

兩個方向嘅代價唔對等：唔補頂多係幫唔到手，補錯就整爛一條本身啱嘅 endpoint，
所以 `withV1Suffix` 拿不準就唔補。

前端冇 test runner，所以 `withV1Suffix` 用 node 行咗 13 個 case 對答案，
再開部 server 打真嘅 provider 驗兩條路：

- Gemini + 錯 key → Google 真係回 400 `INVALID_ARGUMENT`，
  存低嘅 endpoint 照樣係 `.../v1beta/openai`，冇被補 `/v1`
- `https://api.deepseek.com`（特登唔寫 `/v1`）+ 錯 key → DeepSeek 回 401，
  補 `/v1` 再試都 401，之後**還原返** `https://api.deepseek.com`

### 安全補強（2026-09-04，開 tunnel 之前）

打算用 Cloudflare tunnel 將本機行緊嗰個 instance 穿出公網試,開之前逐條數返
個暴露面,揾到兩個窿。兩個都唔係 tunnel 特有 —— 本身就有,只係本機用嗰陣
睇唔出。詳細背景見設計文件 §4 S4／S5。

**S4 — 登入完全冇 rate limit**（`packages/server/src/auth.rs`）

新增 `LoginThrottle`：逐個 username 記連續失敗次數,過咗 `LOGIN_FREE_TRIES`(5)
就遞增延遲(1s→2s→4s…封頂 300s),15 分鐘冇再失敗清零,登入成功即刻清零。
Check 擺喺**查 DB／行 argon2 之前** —— 俾人狂試嗰陣連 CPU 都唔想燒。

三個特登揀嘅位:

- **按 username 記,唔按 IP** —— tunnel／反向代理後面 peer IP 全部係
  `127.0.0.1`,按 IP 等於冇記;而信 `X-Forwarded-For` 又開多條
  「自己填個 header 就繞過」嘅路
- **罰延遲,唔鎖帳號** —— 鎖死嘅話任何人都可以用個亂密碼將你鎖出街
- **個 map 爆 cap 要踢走最耐冇郁過嗰個,唔可以「爆咗就唔記」** ——
  後者噴夠假 username 就令真 username 完全冇節流。有個 test 專門守住呢點
  (`spraying_junk_usernames_cannot_evict_the_one_under_attack`)

存記憶體唔入 DB。失敗／成功兩邊都要記,**用戶唔存在嗰個 case 一樣要記** ——
淨係記存在嘅 username 就等於送個列舉工具俾人。

**S5 — 任何登入用戶都可以改 admin token**（`packages/server/src/relay.rs`）

`/api/exam/admin/*` 四條路由,`admin_reports` / `admin_delete` /
`admin_restore` 三條都有 `admin_token_valid()`,唯獨
`admin_change_token_handler` 冇。四條都掛咗 `require_auth`,但登入咗唔等於
係 admin —— 任何一個憑 join code 入嚟嘅同學都可以將 `ADMIN_TOKEN` 改成
自己知嘅值,跟住攞晒 reports、刪／復原 exam。加返一行 check(403,同其餘三條
一致)。

**驗證**：`cargo test -p exameow-server` 22 passed(7 條新嘅節流 test)。
再開部 server 用 curl 行咗一次:連環試錯密碼會由 401 變 429 並講返等幾多秒、
第二個 username 唔受連累、成功登入即刻清零;開咗個 `role=member` 嘅 bob
真正登入之後,冇 header／猜 `pass`／猜返舊 token 三種方式改 admin token
全部 403,token 完全冇被改到。

### W9（已完成）Admin 帳號管理介面

W2 就整咗 `GET/POST /api/auth/users` 同 `DELETE /api/auth/users/{id}`，但由頭到
尾冇接過上介面 —— `frontend/src` 搵 `auth/users` 零命中，開戶淨係得 curl 做到。
（`AdminView.vue` 係 upstream 嗰個 exam-relay 後台，reports／刪／復原，唔關帳號事。）

新增 `views/AdminUsersView.vue`（`/mine/users`），列表／開戶／刪戶三樣。
`MineView` 個入口淨係 admin 見到，router 加咗 `meta.admin` guard。

**實作時先發現嘅坑：刪 user 會靜靜雞整爛人哋個題庫**

`delete_user_handler` 原本淨係 `DELETE FROM sessions` 加 `DELETE FROM users`。
schema 上有六張表 `REFERENCES users(id) ON DELETE CASCADE`，但 **SQLite 預設
唔開 `foreign_keys` pragma**（呢個 repo 冇開），所以嗰啲 CASCADE 一句都唔會行。
以前要 curl 先刪到，冇人撞過；而家有個掣，唔補就等住出事。

分兩類處理：

- **清走** `sessions` / `user_llm_config` / `course_members` / `attempts` /
  `question_flags`。`user_llm_config` 最緊要 —— 入面係佢加密咗嘅 API key，
  唔清就永遠留喺 DB
- **擋住唔准刪**：`courses.owner_id` / `materials.uploader_id` /
  `questions.contributor_id`。呢三張表全部係 `JOIN users` 讀（`courses.rs:150`、
  `materials.rs:102`、`questions.rs:242`），而且係 **INNER** JOIN —— 刪咗個 user，
  佢開嘅課程、上傳嘅教材、貢獻嘅題目就會喺所有人個列表度消失：資料仲喺 DB，
  但 API 攞唔返，個題庫少咗一橛而冇人知。回 409 同埋講返卡住嘅係咩
  （`user still owns content (courses: 1)`），admin 自己處理咗啲內容先

六張表一次過刪，用 `unchecked_transaction`（只有 `&Connection`，喺 MutexGuard
後面）—— 中途仆街唔好剩低半個 user：登入唔到但仲喺列表度。

**驗證**：`cargo test` 全綠（4 條新 test：擋住條件、purge 掃乾淨、唔會掃到
第二個人、API key 一定跟住走）。再喺 tunnel 上真人行過一次：開戶→重覆用戶名
409→密碼太短 400→刪自己 400→俾 student01 開個課程→刪佢 409→佢刪咗個課程→
再刪 204，DB 度六張表全部歸零。用 `role=member` 登入，`/mine` 冇咗個入口，
直接打 `#/mine/users` 會彈返去 `/mine`。

一個知道嘅缺口：**冇改密碼／重設密碼**。用戶唔記得密碼，admin 而家淨係得
「刪咗再開過」，而佢名下有內容嘅話仲要刪唔到。要補就係 server 加條
`PUT /api/auth/users/{id}/password`。

### 本機起動腳本（`scripts/start-tunnel.ps1`）

一個掣：build → 起 server → 開 Cloudflare quick tunnel → 印公網網址 → Ctrl+C
兩個一齊收。以前每次試機都要自己 set 一堆 env var、開兩個 terminal，好易漏嘢。

```powershell
scripts\start-tunnel.bat              # 全套
scripts\start-tunnel.bat -SkipBuild   # 唔重新 build
scripts\start-tunnel.bat -NoTunnel    # 淨係 server
```

（`.bat` 只係個 wrapper —— PowerShell 預設 ExecutionPolicy 唔俾行 `.ps1`。）

幾個特登嘅決定：

- **Secret 生成一次就 keep 住**，存喺 `%LOCALAPPDATA%\exameow-osh\secrets\local.env`
  （`icacls /inheritance:r` 鎖返自己一個，等同 `config/store.rs` 個 `0600`）。
  每次隨機生成嘅話 `MASTER_KEY` 一變，DB 入面加密咗嘅 API key 就全部解唔返
- **Secret 同 DB 分兩個資料夾**（`secrets\` vs `data\`）—— 你 backup `data\`
  嗰陣唔會順手抄埋條 key。同 `docker-compose.prod.yml` 個註解同一個原則
- **預設 port 3020 唔係 3000** —— 等你可以同時行返 docker 嗰個 instance
- **Env var 開完即刻還原**。`$env:X = ...` 係 process 級，會漏返出你個 shell；
  child 一 launch 就已經抄咗份 env，之後改唔關佢事
- **`-AllowPlainHttp` 先至設 `COOKIE_SECURE=0`**。session cookie 預設帶 `Secure`，
  用 LAN IP（`http://192.168.x.x:3020`）開嗰陣瀏覽器會靜靜雞丟咗個 cookie，
  表現係「登入好似成功，一 refresh 就彈返出去」而且**冇任何錯誤訊息** ——
  值得專登開個掣，唔係俾人 debug 半日。行 tunnel 就唔使（tunnel 本身係 HTTPS）
- **`.ps1` 帶 UTF-8 BOM**。PowerShell 5.1 讀冇 BOM 嘅 file 當 ANSI，啲中文會變亂碼
- 讀 cloudflared 個 log 要自己開 `FileShare::ReadWrite` —— 個 file 俾 child
  揸住寫，`Get-Content` 會撞鎖

**驗證**：行過四次 —— 全套（攞到網址、curl 過 tunnel 拎到 200、用生成嘅密碼
登入到 `/api/auth/me` 認得係 admin）、第二次行（確認冇重新生成 secret，密碼一樣）、
port 撞（回 exit 1 唔會亂起）、殺一個 child（另一個自動跟住收，冇孤兒 process）。

### 尚餘

- `api/bridge.ts`（Tauri）仲喺度但 AI 嗰部分已經冇人叫，web build 下係惰性。
- 冇重設密碼（見 W9）。
- Server 錯誤訊息一律係英文原文直出（`username taken`、`user still owns
  content (...)`…），介面唔會翻譯。同 W8 錯誤對照表嗰啲一致，暫時接受。

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
