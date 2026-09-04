# LLM Provider 設定備忘

呢份係俾**用緊呢個站嘅人**（同埋日後嘅自己）睇嘅：條 endpoint 到底要填咩、
點解 Gemini 同人哋唔同、填錯咗會見到咩訊息。

設定頁（`/mine/config`，`/config` 會轉過去）→「自定義 API」，三格嘢：**Endpoint**、**API Key**、**型號**。
撳「獲取模型」會先即刻存低設定，再由 **server** 攞你條 key 去問 provider 攞型號列表
——唔係瀏覽器直接問，條 key 由頭到尾唔會離開 server（見 [FORK-NOTES.md](FORK-NOTES.md) W3）。

## 兩個 provider 嘅確實 endpoint

| Provider | Endpoint | 備註 |
|---|---|---|
| **DeepSeek** | `https://api.deepseek.com/v1` | 原生 OpenAI 相容，最省事 |
| **Google Gemini** | `https://generativelanguage.googleapis.com/v1beta/openai/` | **唔係**原生 OpenAI 相容，一定要行官方相容層 |
| OpenAI | `https://api.openai.com/v1` | |

Gemini 條 path 咁長唔係打多咗嘢：Google 自己嗰套 API（`models/xxx:generateContent`）
同 OpenAI 完全唔同形狀，`/v1beta/openai/` 呢層先係佢哋專門開俾 OpenAI SDK 用嘅相容層。
淨係填 `https://generativelanguage.googleapis.com` 係去唔到嘅。

型號名唔使死記——存完設定撳「獲取模型」，個下拉會列返 provider 手上有咩。

## Endpoint 要填「base」，唔係完整 URL

server 自己會喺你填嘅 endpoint 後面接：

- `GET  {endpoint}/models` — 攞型號列表
- `POST {endpoint}/chat/completions` — 生成題目 / 解釋 / AI 判分

（`packages/core/src/ai/client.rs`）

所以填 `https://api.deepseek.com/v1` 就啱，唔好填到 `.../v1/chat/completions`。
不過真係填咗都救得返，見下面。

## 自動修正：`normalizeEndpoint` / `withV1Suffix`

`frontend/src/utils/endpoint.ts` 兩個 helper，容錯用：

**`normalizeEndpoint`** —— 每次存設定都行：剝走尾隨嘅 `/`，同埋剝走尾隨嘅 `/chat/completions`。

| 你填 | 實際存低 |
|---|---|
| `https://api.deepseek.com/v1/` | `https://api.deepseek.com/v1` |
| `https://api.deepseek.com/v1/chat/completions` | `https://api.deepseek.com/v1` |

（尾隨個 `/` server 嗰邊 `validate_endpoint()` 都會再剝一次，所以
`https://generativelanguage.googleapis.com/v1beta/openai/` 存低會變咗
`.../v1beta/openai` —— 正常，唔使理。）

**`withV1Suffix`** —— 淨係喺「獲取模型」**第一次失敗之後**先行：如果條 endpoint
嘅 path **完全冇版本段**，就補多個 `/v1` 再試多次。試完都唔掂就**還原返你原本填嗰條**。

| 你填 | 第一次失敗之後會試 |
|---|---|
| `https://api.deepseek.com` | `https://api.deepseek.com/v1` ✅ 救得返 |
| `https://api.deepseek.com/v1` | 唔會 retry（已經有版本段） |
| `https://generativelanguage.googleapis.com/v1beta/openai` | 唔會 retry（`v1beta` 已經係版本段） |

「版本段」係指 path 入面任何一段係 `v` 加數字開頭 —— `v1`、`v2`、`v1beta`、`v1alpha`
都算。host 唔計（`https://v2.example.com/api` 嗰個 `v2` 係 host label）。

> **點解要咁：** 本來呢度淨係睇結尾（`/\/v\d+$/`），Gemini 條
> `.../v1beta/openai` 結尾係 `/openai` 唔係 `/v1`，就會俾人補成
> `.../v1beta/openai/v1` —— 一條唔存在嘅路徑。而 `fetchModels()` 係
> **先存低**個改咗嘅 endpoint 先至 retry，舊版 retry 失敗都唔還原，
> allowlist 又只睇 host 唔睇 path 攔佢唔住 —— 即係「獲取模型」失敗過一次
> （貼錯 key、超時、rate limit 都算）個設定就永久壞咗。兩樣都修咗
> （`utils/endpoint.ts` + `stores/config.ts`），詳情見
> [FORK-NOTES.md](FORK-NOTES.md) W8。

## Allowlist：唔係咩 URL 都填得

`packages/server/src/llm.rs` 嘅 `validate_endpoint()`。呢個係修 S3（SSRF）——
唔攔嘅話有人填 `http://169.254.169.254/` 就借得部 server 去打雲端 metadata。

預設准用嘅 host（`DEFAULT_ALLOWED_HOSTS`，13 個）：

```
api.openai.com          api.deepseek.com        generativelanguage.googleapis.com
api.anthropic.com       openrouter.ai           api.groq.com
api.mistral.ai          api.moonshot.cn         api.siliconflow.cn
dashscope.aliyuncs.com  ark.cn-beijing.volces.com
open.bigmodel.cn        api.x.ai
```

規矩：

- 預設 host **只准 `https`**、**只准 443 port**
- 唔准 URL 入面夾帶帳密（`https://api.openai.com@evil.com/` 呢類扮嘢）
- 子網域唔算數（`api.deepseek.com.evil.com` 過唔到）
- **只攔 host，唔攔 path** —— 所以 Gemini 條長 path 冇問題

要加自架 / 內網 model server：`LLM_EXTRA_HOSTS=host1,host2:8899`
（`docker-compose.prod.yml` 已經留咗格）。呢批**准行 http**，因為加嘅係管理員自己，
知自己做緊咩。

## 錯誤訊息對照

| 介面見到 | 即係 | 點救 |
|---|---|---|
| `endpoint host 'xxx' is not allowed. allowed: …` | 唔喺 allowlist | 打錯字，或者要管理員加 `LLM_EXTRA_HOSTS` |
| `endpoint must use https for this host` | 已知 host 但填咗 `http://` | 改 `https` |
| `endpoint port not allowed` | 已知 host 但寫咗 `:8080` | 剝走個 port |
| `endpoint must not contain credentials` | URL 入面有 `user@` / `user:pass@` | 剝走 |
| `endpoint is not a valid URL` / `endpoint is empty` | 根本唔係條 URL | 對返上面個表 |
| `api_key is required` | 未存過 key 就想淨係改型號 | 貼一次 key |
| `no LLM config — save your endpoint and API key first` | 完全未設定過 | 去設定頁填 |
| `no model selected` | 有 key 但冇揀型號 | 撳「獲取模型」再揀 |
| `HTTP 401: …` | 條 key 唔啱 / 過期 / 冇 quota | 去 provider 個台重新出一條 |
| `HTTP 404: …` | endpoint path 錯 | 對返最上面個 provider 表 —— Gemini 一定要有 `/v1beta/openai` |
| `stored API key cannot be decrypted (MASTER_KEY changed?) — please re-enter it` | server 換咗 `MASTER_KEY` | 重新貼一次 key |

## 條 key 存喺邊

- 貼低 → server 用 AES-256-GCM 加密入 `user_llm_config`。**API 永遠唔會將條 key 交返落嚟**，
  介面只見到 `sk-a…4f2a` 咁嘅 hint，夠你認得返自己貼咗邊條
- 換部機 / 清 cache 都唔使重新貼 —— server 手上有就得
- 撳個垃圾桶掣（`DELETE /api/llm-config`）即刻刪走成行
- **架站嗰位揸住 `MASTER_KEY`，技術上解得開你條 key。** 呢個係「key 存 server」嘅必然結果，
  唔係實作缺陷 —— 自己衡量要唔要放條 key 上嚟

## Server 自己一套 key（選填）

管理員設咗 `AI_ENDPOINT` / `AI_API_KEY` / `AI_MODEL` 嘅話，設定頁會多一個
「伺服器 AI」掣，用戶唔使自己貼 key 都用得。次序係**用戶自己存嗰條行先**，
冇先至跌落 env。

留意：呢條 env endpoint **唔行 allowlist**（`env_config()` 直接讀 env），
因為係管理員自己喺 compose file 寫嘅，同「用戶隨手填一條 URL」唔同性質。
