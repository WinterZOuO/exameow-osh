# 考试发布/参加功能 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 教师可将生成的试卷发布到 Cloudflare 中转服务获得 6 位校验码，学生凭码参加限时考试，教师凭管理链接查看成绩，数据在 R2 缓存 7 天。

**Architecture:** 同一 exameow Worker 增加 R2 binding `EXAM_BUCKET` 和 4 个 `/api/exam/*` 端点（发布/取题/交卷/成绩），自定义域 `exam.superagentparty.com`。前端新增独立的 `api/relay.ts`（不经平台路由分发，三端统一 HTTPS 调用），GenerateView 加两个按钮，新增 `#/take/:code` 答题页和 `#/manage/:code` 成绩页。

**Tech Stack:** Cloudflare Workers (Hono 4.7) + R2、Vue 3 + Pinia + Vue Router (hash) + Tailwind、TypeScript。

**Spec:** `docs/superpowers/specs/2026-07-24-exam-publish-design.md`

## Global Constraints

- **无测试套件**。验证手段：workers 用 `cd workers && pnpm typecheck` + `npx wrangler dev` 本地 curl 手测；frontend 用 `cd frontend && pnpm run type-check`。
- 字符集 `ABCDEFGHJKMNPQRSTUVWXYZ23456789`（31 字符，排除 0O1IL），6 位码。
- 数据有效期 7 天：应用层按 `createdAt` 判定过期（权威），不依赖 R2 生命周期规则。
- 未交卷前答案/解析**绝不下发**；管理 token 只存 SHA-256 哈希。
- workers 与 shared 的类型保持同步（Rust/TS parity 惯例：本次纯 TS 功能，同步 `workers/src/types.ts` 与 `packages/shared/src/types.ts`）。
- 版本号最终 bump 到 1.1.0，四处同步：root `package.json`、`src-tauri/Cargo.toml`、`src-tauri/tauri.conf.json`、`workers/package.json`。
- i18n key 必须在 `frontend/src/i18n/locales.ts` 三处同步：`LocaleMessages` 接口、`zh` 对象、`en` 对象。
- 代码不加注释（除非已有文件风格如此）。

---

### Task 1: Worker — 类型定义 + relay 模块（发布端点）+ R2 配置

**Files:**
- Modify: `workers/src/types.ts`（追加类型）
- Modify: `packages/shared/src/types.ts`（追加相同类型，保持 parity）
- Create: `workers/src/relay.ts`
- Modify: `workers/src/index.ts:11-16`（Bindings 加 EXAM_BUCKET）及路由区
- Modify: `workers/wrangler.toml`

**Interfaces:**
- Produces（后续任务依赖）:
  - `handlePublish(bucket: R2Bucket, body: unknown, origin: string): Promise<Response>`
  - `handleGetExam(bucket: R2Bucket, code: string): Promise<Response>`（Task 2 实现，本任务仅占位导出可省略）
  - 类型 `StoredExam`、`PublishedExamInfo`、`PublishExamRequest`、`PublishExamResponse`、`SubmitExamRequest`、`SubmitExamResponse`、`GradedQuestion`、`ExamResultEntry`、`PublicQuestion`
  - 工具函数 `generateCode()`、`randomToken()`、`sha256Hex()`、`isExpired()`

- [ ] **Step 1: 追加类型到 `workers/src/types.ts`**

在文件末尾追加：

```ts
export interface PublicQuestion {
  id: string
  type: QuestionType
  stem: string
  options: string[]
}

export interface PublishExamRequest {
  title: string
  questions: Question[]
  startAt: number
  endAt: number
  durationMinutes: number
}

export interface PublishExamResponse {
  code: string
  adminToken: string
  manageUrl: string
}

export interface PublishedExamInfo {
  title: string
  questions: PublicQuestion[]
  startAt: number
  endAt: number
  durationMinutes: number
}

export interface StoredExam {
  title: string
  questions: Question[]
  startAt: number
  endAt: number
  durationMinutes: number
  createdAt: number
  adminTokenHash: string
}

export interface SubmitExamRequest {
  name: string
  answers: Record<string, string>
  durationSec: number
}

export interface GradedQuestion {
  question: Question
  userAnswer: string | null
  isCorrect: boolean | null
}

export interface SubmitExamResponse {
  score: number
  totalScore: number
  correctCount: number
  totalCount: number
  pendingCount: number
  graded: GradedQuestion[]
}

export interface ExamResultEntry {
  name: string
  answers: Record<string, string>
  score: number
  totalScore: number
  correctCount: number
  totalCount: number
  pendingCount: number
  durationSec: number
  submittedAt: number
}

export interface ExamResultsResponse {
  title: string
  questions: Question[]
  results: ExamResultEntry[]
}
```

- [ ] **Step 2: 同步到 `packages/shared/src/types.ts`**

把上面除 `StoredExam` 外的所有类型追加到该文件末尾（`QuestionType` 已存在，直接引用）。

- [ ] **Step 3: 创建 `workers/src/relay.ts`**

```ts
import type {
  Question,
  PublishExamRequest,
  PublishExamResponse,
  StoredExam,
} from './types'

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const CODE_LENGTH = 6
export const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000
const MAX_QUESTIONS = 500
const MAX_WINDOW_MS = 7 * 24 * 60 * 60 * 1000

export function generateCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH))
  let code = ''
  for (const b of bytes) code += CODE_ALPHABET[b % CODE_ALPHABET.length]
  return code
}

export function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function isExpired(exam: StoredExam): boolean {
  return Date.now() - exam.createdAt > MAX_AGE_MS
}

export async function readExam(bucket: R2Bucket, code: string): Promise<StoredExam | null> {
  const obj = await bucket.get(`exams/${code}.json`)
  if (!obj) return null
  const exam = (await obj.json()) as StoredExam
  if (isExpired(exam)) {
    await bucket.delete(`exams/${code}.json`)
    return null
  }
  return exam
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export async function handlePublish(
  bucket: R2Bucket,
  body: unknown,
  origin: string,
): Promise<Response> {
  const req = body as Partial<PublishExamRequest>
  const title = (req.title || '').trim()
  const questions = req.questions
  const { startAt, endAt, durationMinutes } = req

  if (!title) return json({ error: 'Title is required' }, 400)
  if (!Array.isArray(questions) || questions.length === 0 || questions.length > MAX_QUESTIONS) {
    return json({ error: `Questions must be 1-${MAX_QUESTIONS}` }, 400)
  }
  if (
    typeof startAt !== 'number' ||
    typeof endAt !== 'number' ||
    typeof durationMinutes !== 'number' ||
    !(startAt < endAt) ||
    durationMinutes <= 0 ||
    endAt - startAt > MAX_WINDOW_MS
  ) {
    return json({ error: 'Invalid time window or duration' }, 400)
  }
  if (JSON.stringify(questions).length > 5 * 1024 * 1024) {
    return json({ error: 'Payload too large' }, 400)
  }

  let code = generateCode()
  for (let i = 0; i < 5; i++) {
    const head = await bucket.head(`exams/${code}.json`)
    if (!head) break
    code = generateCode()
  }

  const adminToken = randomToken()
  const stored: StoredExam = {
    title,
    questions: questions as Question[],
    startAt,
    endAt,
    durationMinutes,
    createdAt: Date.now(),
    adminTokenHash: await sha256Hex(adminToken),
  }
  await bucket.put(`exams/${code}.json`, JSON.stringify(stored))

  const res: PublishExamResponse = {
    code,
    adminToken,
    manageUrl: `${origin}/#/manage/${code}?token=${adminToken}`,
  }
  return json(res)
}
```

- [ ] **Step 4: 修改 `workers/src/index.ts`**

Bindings 类型（11-16 行）改为：

```ts
type Bindings = {
  AI: Ai
  ASSETS: Fetcher
  EXAM_BUCKET: R2Bucket
  CF_ACCOUNT_ID?: string
  CF_API_TOKEN?: string
}
```

`R2Bucket` 加入第 3 行的 `@cloudflare/workers-types` import。顶部加：

```ts
import { handlePublish } from './relay'
```

在 `/api/health` 路由之前插入：

```ts
app.post('/api/exam/publish', async (c) => {
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400)
  }
  const origin = new URL(c.req.url).origin
  return handlePublish(c.env.EXAM_BUCKET, body, origin)
})
```

- [ ] **Step 5: 修改 `workers/wrangler.toml`**

在 `[observability]` 之前追加：

```toml
[[r2_buckets]]
binding = "EXAM_BUCKET"
bucket_name = "exameow-exams"

workers_dev = true

[[routes]]
custom_domain = "exam.superagentparty.com"
```

注意：`superagentparty.com` 域名必须已在该 CF 账号的 Zone 中，否则 deploy 报 route 错误；届时需先在 CF Dashboard 添加站点或改回仅 workers.dev。

- [ ] **Step 6: typecheck + 本地手测发布端点**

```bash
cd workers && pnpm typecheck
npx wrangler r2 bucket create exameow-exams 2>/dev/null || true
npx wrangler dev &
sleep 5
curl -s -X POST http://localhost:8787/api/exam/publish \
  -H 'Content-Type: application/json' \
  -d '{"title":"测试","questions":[{"id":"q1","type":"single_choice","stem":"1+1=?","options":["1","2","3","4"],"answer":"B","analysis":"基础加法"}],"startAt":1000,"endAt":9999999999999,"durationMinutes":60}'
```

预期：typecheck 通过；curl 返回含 6 位 `code`、64 位 hex `adminToken`、`manageUrl`。

- [ ] **Step 7: Commit**

```bash
git add workers/src/types.ts workers/src/relay.ts workers/src/index.ts workers/wrangler.toml packages/shared/src/types.ts
git commit -m "feat(worker): exam publish endpoint with R2 storage"
```

---

### Task 2: Worker — 取题/交卷/成绩端点 + 服务端判分

**Files:**
- Modify: `workers/src/relay.ts`
- Modify: `workers/src/index.ts`（追加 3 条路由）

**Interfaces:**
- Consumes: Task 1 的 `readExam`、`sha256Hex`、`json`（Task 1 中 `json` 未导出，本任务将其改为 export）、`StoredExam`、各响应类型
- Produces（前端 Task 3 依赖的 HTTP 契约）:
  - `GET /api/exam/code/{code}` → `PublishedExamInfo`（无答案）| 404 `{error}` | 403 `{error: 'not_started'|'ended', startAt?}`
  - `POST /api/exam/code/{code}/submit` → `SubmitExamResponse` | 403
  - `GET /api/exam/code/{code}/results?token=` → `ExamResultsResponse` | 403

- [ ] **Step 1: `workers/src/relay.ts` 中 `function json` 改为 `export function json`，并追加判分与三个 handler**

```ts
import type {
  ExamResultEntry,
  ExamResultsResponse,
  GradedQuestion,
  PublicQuestion,
  PublishedExamInfo,
  Question,
  SubmitExamRequest,
  SubmitExamResponse,
} from './types'

function normalizeChoice(s: string): string {
  return s.trim().toUpperCase().replace(/[^A-H]/g, '').split('').sort().join('')
}

function isTrueAnswer(a: string): boolean {
  const t = a.trim()
  return ['A', '√', '对', '正确', 'TRUE', 'T', '是', 'YES', 'Y', '1'].some(
    (v) => t.toUpperCase() === v.toUpperCase() || t.includes(v),
  )
}

function grade(q: Question, user: string | undefined): boolean | null {
  if (q.type === 'short_answer') return null
  if (!user || !user.trim()) return false
  switch (q.type) {
    case 'single_choice':
    case 'multi_choice':
      return normalizeChoice(user) === normalizeChoice(q.answer)
    case 'true_false':
      return isTrueAnswer(user) === isTrueAnswer(q.answer)
    case 'fill_blank':
      return user.trim().toLowerCase() === q.answer.trim().toLowerCase()
    default:
      return false
  }
}

function windowCheck(exam: StoredExam): Response | null {
  const now = Date.now()
  if (now < exam.startAt) return json({ error: 'not_started', startAt: exam.startAt }, 403)
  if (now > exam.endAt) return json({ error: 'ended' }, 403)
  return null
}

export async function handleGetExam(bucket: R2Bucket, code: string): Promise<Response> {
  const exam = await readExam(bucket, code)
  if (!exam) return json({ error: 'not_found' }, 404)
  const deny = windowCheck(exam)
  if (deny) return deny
  const publicQuestions: PublicQuestion[] = exam.questions.map(
    ({ id, type, stem, options }) => ({ id, type, stem, options }),
  )
  const info: PublishedExamInfo = {
    title: exam.title,
    questions: publicQuestions,
    startAt: exam.startAt,
    endAt: exam.endAt,
    durationMinutes: exam.durationMinutes,
  }
  return json(info)
}

export async function handleSubmit(
  bucket: R2Bucket,
  code: string,
  body: unknown,
): Promise<Response> {
  const exam = await readExam(bucket, code)
  if (!exam) return json({ error: 'not_found' }, 404)
  const deny = windowCheck(exam)
  if (deny) return deny

  const req = body as Partial<SubmitExamRequest>
  const name = (req.name || '').trim()
  if (!name) return json({ error: 'Name is required' }, 400)
  const answers = req.answers && typeof req.answers === 'object' ? req.answers : {}
  const durationSec = typeof req.durationSec === 'number' ? Math.max(0, Math.round(req.durationSec)) : 0

  const graded: GradedQuestion[] = exam.questions.map((q) => {
    const userAnswer = answers[q.id] ?? null
    return { question: q, userAnswer, isCorrect: grade(q, userAnswer ?? undefined) }
  })
  const objective = graded.filter((g) => g.isCorrect !== null)
  const correctCount = objective.filter((g) => g.isCorrect === true).length
  const pendingCount = graded.filter((g) => g.isCorrect === null).length

  const entry: ExamResultEntry = {
    name,
    answers,
    score: correctCount,
    totalScore: objective.length,
    correctCount,
    totalCount: exam.questions.length,
    pendingCount,
    durationSec,
    submittedAt: Date.now(),
  }
  await bucket.put(`results/${code}/${crypto.randomUUID()}.json`, JSON.stringify(entry))

  const res: SubmitExamResponse = {
    score: entry.score,
    totalScore: entry.totalScore,
    correctCount,
    totalCount: entry.totalCount,
    pendingCount,
    graded,
  }
  return json(res)
}

export async function handleResults(
  bucket: R2Bucket,
  code: string,
  token: string,
): Promise<Response> {
  const exam = await readExam(bucket, code)
  if (!exam) return json({ error: 'not_found' }, 404)
  if (!token || (await sha256Hex(token)) !== exam.adminTokenHash) {
    return json({ error: 'unauthorized' }, 403)
  }
  const listed = await bucket.list({ prefix: `results/${code}/`, limit: 500 })
  const results: ExamResultEntry[] = []
  for (const obj of listed.objects) {
    const o = await bucket.get(obj.key)
    if (o) results.push((await o.json()) as ExamResultEntry)
  }
  results.sort((a, b) => b.score - a.score || a.submittedAt - b.submittedAt)
  const res: ExamResultsResponse = { title: exam.title, questions: exam.questions, results }
  return json(res)
}
```

- [ ] **Step 2: `workers/src/index.ts` 追加路由**

import 行改为：

```ts
import { handlePublish, handleGetExam, handleSubmit, handleResults } from './relay'
```

在 publish 路由之后插入：

```ts
app.get('/api/exam/code/:code', (c) => handleGetExam(c.env.EXAM_BUCKET, c.req.param('code')))

app.post('/api/exam/code/:code/submit', async (c) => {
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400)
  }
  return handleSubmit(c.env.EXAM_BUCKET, c.req.param('code'), body)
})

app.get('/api/exam/code/:code/results', (c) =>
  handleResults(c.env.EXAM_BUCKET, c.req.param('code'), c.req.query('token') || ''),
)
```

- [ ] **Step 3: typecheck + wrangler dev 全流程 curl 手测**

```bash
cd workers && pnpm typecheck
npx wrangler dev &
sleep 5
# 1. 发布
RESP=$(curl -s -X POST http://localhost:8787/api/exam/publish -H 'Content-Type: application/json' -d '{"title":"测试","questions":[{"id":"q1","type":"single_choice","stem":"1+1=?","options":["1","2","3","4"],"answer":"B","analysis":"加法"},{"id":"q2","type":"short_answer","stem":"简述加法","options":[],"answer":"略","analysis":"略"}],"startAt":1000,"endAt":9999999999999,"durationMinutes":60}')
CODE=$(echo $RESP | python3 -c 'import sys,json;print(json.load(sys.stdin)["code"])')
TOKEN=$(echo $RESP | python3 -c 'import sys,json;print(json.load(sys.stdin)["adminToken"])')
# 2. 取题：响应中不得出现 "answer"/"analysis" 字段值
curl -s http://localhost:8787/api/exam/code/$CODE | grep -c '"answer"' # 预期 0
# 3. 交卷（q1 答 B 正确）
curl -s -X POST http://localhost:8787/api/exam/code/$CODE/submit -H 'Content-Type: application/json' -d '{"name":"张三","answers":{"q1":"B"},"durationSec":120}'
# 预期 score=1, totalScore=1, totalCount=2, pendingCount=1
# 4. 成绩：无 token 403，有 token 返回列表
curl -s -o /dev/null -w '%{http_code}' http://localhost:8787/api/exam/code/$CODE/results
curl -s "http://localhost:8787/api/exam/code/$CODE/results?token=$TOKEN"
```

预期：typecheck 通过；步骤 2 grep 计数为 0；步骤 3 返回正确分数；步骤 4 先 403 后 200 且含张三成绩。

- [ ] **Step 4: Commit**

```bash
git add workers/src/relay.ts workers/src/index.ts
git commit -m "feat(worker): exam take/submit/results endpoints with server-side grading"
```

---

### Task 3: 前端 — `api/relay.ts` 中转 API 模块

**Files:**
- Create: `frontend/src/api/relay.ts`

**Interfaces:**
- Consumes: `packages/shared/src/types.ts` 中的新类型（Task 1 已加）
- Produces（Task 4/5/6 依赖）:
  - `publishExam(req: PublishExamRequest): Promise<PublishExamResponse>`
  - `fetchExam(code: string): Promise<PublishedExamInfo>`
  - `submitExam(code: string, req: SubmitExamRequest): Promise<SubmitExamResponse>`
  - `fetchResults(code: string, token: string): Promise<ExamResultsResponse>`
  - 错误处理约定：非 2xx 时 throw `RelayError`，带 `status` 和 `code`（服务端 error 字段）

- [ ] **Step 1: 创建 `frontend/src/api/relay.ts`**

```ts
import type {
  ExamResultsResponse,
  PublishExamRequest,
  PublishExamResponse,
  PublishedExamInfo,
  SubmitExamRequest,
  SubmitExamResponse,
} from '@exameow/shared'

const RELAY_BASE: string =
  (import.meta.env.VITE_EXAM_RELAY as string | undefined) || 'https://exam.superagentparty.com'

export class RelayError extends Error {
  constructor(
    public status: number,
    public code: string,
    public startAt?: number,
  ) {
    super(code)
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${RELAY_BASE}${path}`, init)
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
  if (!res.ok) {
    throw new RelayError(
      res.status,
      typeof data.error === 'string' ? data.error : 'unknown',
      typeof data.startAt === 'number' ? data.startAt : undefined,
    )
  }
  return data as T
}

export function publishExam(req: PublishExamRequest): Promise<PublishExamResponse> {
  return request('/api/exam/publish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })
}

export function fetchExam(code: string): Promise<PublishedExamInfo> {
  return request(`/api/exam/code/${encodeURIComponent(code)}`)
}

export function submitExam(code: string, req: SubmitExamRequest): Promise<SubmitExamResponse> {
  return request(`/api/exam/code/${encodeURIComponent(code)}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })
}

export function fetchResults(code: string, token: string): Promise<ExamResultsResponse> {
  return request(`/api/exam/code/${encodeURIComponent(code)}/results?token=${encodeURIComponent(token)}`)
}
```

- [ ] **Step 2: type-check**

```bash
cd frontend && pnpm run type-check
```

预期：通过（`@exameow/shared` 已在 frontend 依赖中，`import.meta.env` 类型由 vite/client 提供）。

- [ ] **Step 3: Commit**

```bash
git add frontend/src/api/relay.ts
git commit -m "feat(frontend): relay API module for exam publish/take"
```

---

### Task 4: 前端 — i18n key + GenerateView 两个按钮 + 发布弹窗

**Files:**
- Modify: `frontend/src/i18n/locales.ts`（三处：接口、zh、en）
- Create: `frontend/src/components/exam/PublishExamDialog.vue`
- Create: `frontend/src/components/exam/JoinExamDialog.vue`
- Modify: `frontend/src/views/GenerateView.vue`
- Create: `frontend/src/stores/published.ts`

**Interfaces:**
- Consumes: `api/relay.ts` 的 `publishExam`、`PublishExamRequest`
- Produces:
  - `usePublishedStore()`：`{ list: PublishedRecord[], add(rec), remove(code) }`，localStorage key `exameow-published`
  - `PublishedRecord = { code: string; title: string; manageUrl: string; publishedAt: number }`
  - `PublishExamDialog` props: `{ questions: Question[] }`，emits `(e: 'close')`

- [ ] **Step 1: `frontend/src/i18n/locales.ts` 接口追加 key**

在 `LocaleMessages` 接口内（参照 `genTitle: string` 附近）追加：

```ts
  pubPublish: string
  pubJoin: string
  pubDialogTitle: string
  pubFieldTitle: string
  pubFieldTitlePlaceholder: string
  pubFieldStart: string
  pubFieldEnd: string
  pubFieldDuration: string
  pubConfirm: string
  pubPublishing: string
  pubCancel: string
  pubSuccessTitle: string
  pubCodeLabel: string
  pubManageLinkLabel: string
  pubCopy: string
  pubCopied: string
  pubClose: string
  pubErrorInvalid: string
  pubMyPublished: string
  joinDialogTitle: string
  joinCodeLabel: string
  joinNameLabel: string
  joinConfirm: string
  takeLoading: string
  takeNotFound: string
  takeNotStarted: string
  takeEnded: string
  takeTimeLeft: string
  takeSubmit: string
  takeSubmitConfirm: string
  takeSubmitting: string
  takeScore: string
  takePendingReview: string
  takeYourAnswer: string
  takeCorrectAnswer: string
  takeUnanswered: string
  takeBackHome: string
  manageTitle: string
  manageUnauthorized: string
  manageNoResults: string
  manageColName: string
  manageColScore: string
  manageColCorrect: string
  manageColDuration: string
  manageColTime: string
```

zh 对象追加：

```ts
  pubPublish: '发布考试',
  pubJoin: '参加考试',
  pubDialogTitle: '发布考试',
  pubFieldTitle: '考试名称',
  pubFieldTitlePlaceholder: '例如：高三数学期末模拟',
  pubFieldStart: '开始时间',
  pubFieldEnd: '结束时间',
  pubFieldDuration: '考试时长（分钟）',
  pubConfirm: '发布',
  pubPublishing: '发布中...',
  pubCancel: '取消',
  pubSuccessTitle: '发布成功！',
  pubCodeLabel: '学生校验码',
  pubManageLinkLabel: '成绩管理链接（仅你可见，请保存）',
  pubCopy: '复制',
  pubCopied: '已复制',
  pubClose: '完成',
  pubErrorInvalid: '请完整填写所有字段，且结束时间必须晚于开始时间',
  pubMyPublished: '我发布的考试',
  joinDialogTitle: '参加考试',
  joinCodeLabel: '6 位校验码',
  joinNameLabel: '你的姓名',
  joinConfirm: '进入考试',
  takeLoading: '加载考试中...',
  takeNotFound: '考试不存在或已过期',
  takeNotStarted: '考试尚未开始，开始时间：{time}',
  takeEnded: '考试已结束',
  takeTimeLeft: '剩余时间',
  takeSubmit: '交卷',
  takeSubmitConfirm: '确定交卷吗？还有 {n} 题未作答。',
  takeSubmitting: '交卷中...',
  takeScore: '得分',
  takePendingReview: '{n} 道简答题待教师评阅，未计入得分',
  takeYourAnswer: '你的作答',
  takeCorrectAnswer: '参考答案',
  takeUnanswered: '未作答',
  takeBackHome: '返回首页',
  manageTitle: '成绩管理',
  manageUnauthorized: '管理链接无效',
  manageNoResults: '暂无学生交卷',
  manageColName: '姓名',
  manageColScore: '得分',
  manageColCorrect: '答对',
  manageColDuration: '用时',
  manageColTime: '交卷时间',
```

en 对象追加：

```ts
  pubPublish: 'Publish Exam',
  pubJoin: 'Join Exam',
  pubDialogTitle: 'Publish Exam',
  pubFieldTitle: 'Exam Title',
  pubFieldTitlePlaceholder: 'e.g. Final Math Mock',
  pubFieldStart: 'Start Time',
  pubFieldEnd: 'End Time',
  pubFieldDuration: 'Duration (minutes)',
  pubConfirm: 'Publish',
  pubPublishing: 'Publishing...',
  pubCancel: 'Cancel',
  pubSuccessTitle: 'Published!',
  pubCodeLabel: 'Access Code',
  pubManageLinkLabel: 'Results link (keep it private)',
  pubCopy: 'Copy',
  pubCopied: 'Copied',
  pubClose: 'Done',
  pubErrorInvalid: 'Fill in all fields; end time must be after start time',
  pubMyPublished: 'My Published Exams',
  joinDialogTitle: 'Join Exam',
  joinCodeLabel: '6-digit Code',
  joinNameLabel: 'Your Name',
  joinConfirm: 'Start',
  takeLoading: 'Loading exam...',
  takeNotFound: 'Exam not found or expired',
  takeNotStarted: 'Exam has not started. Starts at {time}',
  takeEnded: 'Exam has ended',
  takeTimeLeft: 'Time Left',
  takeSubmit: 'Submit',
  takeSubmitConfirm: 'Submit now? {n} question(s) unanswered.',
  takeSubmitting: 'Submitting...',
  takeScore: 'Score',
  takePendingReview: '{n} short-answer question(s) pending teacher review, not scored',
  takeYourAnswer: 'Your Answer',
  takeCorrectAnswer: 'Correct Answer',
  takeUnanswered: 'Unanswered',
  takeBackHome: 'Back Home',
  manageTitle: 'Exam Results',
  manageUnauthorized: 'Invalid management link',
  manageNoResults: 'No submissions yet',
  manageColName: 'Name',
  manageColScore: 'Score',
  manageColCorrect: 'Correct',
  manageColDuration: 'Time Used',
  manageColTime: 'Submitted At',
```

- [ ] **Step 2: 创建 `frontend/src/stores/published.ts`**

```ts
import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export interface PublishedRecord {
  code: string
  title: string
  manageUrl: string
  publishedAt: number
}

const KEY = 'exameow-published'

function load(): PublishedRecord[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]')
  } catch {
    return []
  }
}

export const usePublishedStore = defineStore('published', () => {
  const list = ref<PublishedRecord[]>(load())
  watch(list, (v) => localStorage.setItem(KEY, JSON.stringify(v)), { deep: true })

  function add(rec: PublishedRecord) {
    list.value.unshift(rec)
  }
  function remove(code: string) {
    list.value = list.value.filter((r) => r.code !== code)
  }
  return { list, add, remove }
})
```

- [ ] **Step 3: 创建 `frontend/src/components/exam/PublishExamDialog.vue`**

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useI18nStore } from '@/stores/i18n'
import { usePublishedStore } from '@/stores/published'
import { publishExam } from '@/api/relay'
import type { Question } from '@exameow/shared'

const props = defineProps<{ questions: Question[] }>()
const emit = defineEmits<{ (e: 'close'): void }>()

const i18n = useI18nStore()
const publishedStore = usePublishedStore()

function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const title = ref('')
const startAt = ref(toLocalInput(new Date()))
const endAt = ref(toLocalInput(new Date(Date.now() + 24 * 3600 * 1000)))
const durationMinutes = ref(60)
const publishing = ref(false)
const error = ref('')
const result = ref<{ code: string; manageUrl: string } | null>(null)
const copied = ref('')

async function handlePublish() {
  error.value = ''
  const start = new Date(startAt.value).getTime()
  const end = new Date(endAt.value).getTime()
  if (!title.value.trim() || !start || !end || !(start < end) || durationMinutes.value <= 0) {
    error.value = i18n.t('pubErrorInvalid')
    return
  }
  publishing.value = true
  try {
    const res = await publishExam({
      title: title.value.trim(),
      questions: props.questions,
      startAt: start,
      endAt: end,
      durationMinutes: durationMinutes.value,
    })
    result.value = { code: res.code, manageUrl: res.manageUrl }
    publishedStore.add({ code: res.code, title: title.value.trim(), manageUrl: res.manageUrl, publishedAt: Date.now() })
  } catch (e: any) {
    error.value = e.message || String(e)
  } finally {
    publishing.value = false
  }
}

async function copy(text: string, which: string) {
  try {
    await navigator.clipboard.writeText(text)
    copied.value = which
    setTimeout(() => (copied.value = ''), 1500)
  } catch {}
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background-color: rgba(0,0,0,0.4)" @click.self="emit('close')">
    <div class="card-filled w-full max-w-md p-5 space-y-4">
      <template v-if="!result">
        <h2 class="text-title-lg">{{ i18n.t('pubDialogTitle') }}</h2>
        <div>
          <label class="text-label-sm">{{ i18n.t('pubFieldTitle') }}</label>
          <input v-model="title" class="input-outlined w-full mt-1" :placeholder="i18n.t('pubFieldTitlePlaceholder')" />
        </div>
        <div>
          <label class="text-label-sm">{{ i18n.t('pubFieldStart') }}</label>
          <input v-model="startAt" type="datetime-local" class="input-outlined w-full mt-1" />
        </div>
        <div>
          <label class="text-label-sm">{{ i18n.t('pubFieldEnd') }}</label>
          <input v-model="endAt" type="datetime-local" class="input-outlined w-full mt-1" />
        </div>
        <div>
          <label class="text-label-sm">{{ i18n.t('pubFieldDuration') }}</label>
          <input v-model.number="durationMinutes" type="number" min="1" class="input-outlined w-full mt-1" />
        </div>
        <p v-if="error" class="text-sm" style="color: rgb(var(--md-error))">{{ error }}</p>
        <div class="flex gap-2 justify-end">
          <button class="btn-outlined" @click="emit('close')">{{ i18n.t('pubCancel') }}</button>
          <button class="btn-filled" :disabled="publishing" @click="handlePublish">
            {{ publishing ? i18n.t('pubPublishing') : i18n.t('pubConfirm') }}
          </button>
        </div>
      </template>
      <template v-else>
        <h2 class="text-title-lg text-center">{{ i18n.t('pubSuccessTitle') }}</h2>
        <div class="text-center">
          <div class="text-label-sm mb-1">{{ i18n.t('pubCodeLabel') }}</div>
          <div class="text-4xl font-bold tracking-[0.3em]" style="color: rgb(var(--md-primary))">{{ result.code }}</div>
          <button class="btn-tonal text-sm mt-2" @click="copy(result.code, 'code')">
            {{ copied === 'code' ? i18n.t('pubCopied') : i18n.t('pubCopy') }}
          </button>
        </div>
        <div>
          <div class="text-label-sm mb-1">{{ i18n.t('pubManageLinkLabel') }}</div>
          <div class="flex gap-2">
            <input :value="result.manageUrl" readonly class="input-outlined flex-1 text-xs" />
            <button class="btn-tonal text-sm shrink-0" @click="copy(result.manageUrl, 'link')">
              {{ copied === 'link' ? i18n.t('pubCopied') : i18n.t('pubCopy') }}
            </button>
          </div>
        </div>
        <button class="btn-filled w-full" @click="emit('close')">{{ i18n.t('pubClose') }}</button>
      </template>
    </div>
  </div>
</template>
```

注意：若项目全局 CSS 无 `.input-outlined` 类，先 grep `frontend/src` 确认现有输入框类名（如 `input-field`），替换为现有类。

- [ ] **Step 4: 创建 `frontend/src/components/exam/JoinExamDialog.vue`**

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18nStore } from '@/stores/i18n'

const emit = defineEmits<{ (e: 'close'): void }>()
const i18n = useI18nStore()
const router = useRouter()

const code = ref('')
const name = ref('')

function handleJoin() {
  const c = code.value.trim().toUpperCase()
  if (c.length !== 6 || !name.value.trim()) return
  router.push({ path: `/take/${c}`, query: { name: name.value.trim() } })
  emit('close')
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background-color: rgba(0,0,0,0.4)" @click.self="emit('close')">
    <div class="card-filled w-full max-w-sm p-5 space-y-4">
      <h2 class="text-title-lg">{{ i18n.t('joinDialogTitle') }}</h2>
      <div>
        <label class="text-label-sm">{{ i18n.t('joinCodeLabel') }}</label>
        <input v-model="code" maxlength="6" class="input-outlined w-full mt-1 text-center text-2xl tracking-[0.3em] uppercase" />
      </div>
      <div>
        <label class="text-label-sm">{{ i18n.t('joinNameLabel') }}</label>
        <input v-model="name" class="input-outlined w-full mt-1" />
      </div>
      <div class="flex gap-2 justify-end">
        <button class="btn-outlined" @click="emit('close')">{{ i18n.t('pubCancel') }}</button>
        <button class="btn-filled" :disabled="code.trim().length !== 6 || !name.trim()" @click="handleJoin">
          {{ i18n.t('joinConfirm') }}
        </button>
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 5: 修改 `frontend/src/views/GenerateView.vue`**

script 顶部 import 追加：

```ts
import PublishExamDialog from '@/components/exam/PublishExamDialog.vue'
import JoinExamDialog from '@/components/exam/JoinExamDialog.vue'
```

ref 区追加：

```ts
const showPublish = ref(false)
const showJoin = ref(false)
```

模板标题区（`<p class="text-body-lg mb-6">` 之后）插入「参加考试」入口：

```html
<div class="mb-6 flex justify-end">
  <button class="btn-tonal text-sm" @click="showJoin = true">{{ i18n.t('pubJoin') }}</button>
</div>
```

导出工具栏（`handleExportXlsx` 按钮所在 flex 容器内，XLSX 按钮之后）插入「发布考试」：

```html
<button class="btn-tonal text-sm" @click="showPublish = true">
  {{ i18n.t('pubPublish') }}
</button>
```

模板末尾（`</template>` 前）插入：

```html
    <PublishExamDialog v-if="showPublish" :questions="examStore.questions" @close="showPublish = false" />
    <JoinExamDialog v-if="showJoin" @close="showJoin = false" />
```

- [ ] **Step 6: type-check + 手动检查**

```bash
cd frontend && pnpm run type-check && pnpm dev
```

浏览器打开出题页，确认两个按钮渲染、弹窗可开关（发布需后端可达，可先只验证 UI）。type-check 必须通过。

- [ ] **Step 7: Commit**

```bash
git add frontend/src/i18n/locales.ts frontend/src/stores/published.ts frontend/src/components/exam/ frontend/src/views/GenerateView.vue
git commit -m "feat(frontend): publish/join exam dialogs and GenerateView entries"
```

---

### Task 5: 前端 — 答题页 `TakeExamView` + 路由

**Files:**
- Create: `frontend/src/views/TakeExamView.vue`
- Modify: `frontend/src/router/index.ts`

**Interfaces:**
- Consumes: `fetchExam`、`submitExam`、`RelayError`（Task 3）；i18n key（Task 4）
- Produces: 路由 `#/take/:code?name=xxx`，学生完整考试流程

- [ ] **Step 1: `frontend/src/router/index.ts` routes 数组追加**

```ts
    {
      path: '/take/:code',
      name: 'take-exam',
      component: () => import('@/views/TakeExamView.vue'),
      meta: { title: 'Take Exam' },
    },
```

- [ ] **Step 2: 创建 `frontend/src/views/TakeExamView.vue`**

```vue
<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18nStore } from '@/stores/i18n'
import { fetchExam, submitExam, RelayError } from '@/api/relay'
import type { PublishedExamInfo, SubmitExamResponse } from '@exameow/shared'

const route = useRoute()
const router = useRouter()
const i18n = useI18nStore()

const code = (route.params.code as string || '').toUpperCase()
const studentName = (route.query.name as string || '').trim()

const loading = ref(true)
const errorKey = ref<'not_found' | 'not_started' | 'ended' | ''>('')
const notStartedTime = ref('')
const exam = ref<PublishedExamInfo | null>(null)
const answers = ref<Record<string, string>>({})
const remainingSec = ref(0)
const startedAt = ref(0)
const submitting = ref(false)
const result = ref<SubmitExamResponse | null>(null)
let timer: ReturnType<typeof setInterval> | null = null

const unansweredCount = computed(() => {
  if (!exam.value) return 0
  return exam.value.questions.filter((q) => !(answers.value[q.id] || '').trim()).length
})

const timeText = computed(() => {
  const s = Math.max(0, remainingSec.value)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`
})

function isSelected(qid: string, label: string, multi: boolean): boolean {
  const a = answers.value[qid] || ''
  if (multi) return a.includes(label)
  return a === label
}

function select(qid: string, label: string, multi: boolean) {
  if (result.value) return
  if (!multi) {
    answers.value[qid] = label
    return
  }
  const cur = answers.value[qid] || ''
  const next = cur.includes(label) ? cur.replace(label, '') : (cur + label).split('').sort().join('')
  answers.value[qid] = next
}

async function doSubmit() {
  if (submitting.value || result.value || !exam.value) return
  submitting.value = true
  try {
    result.value = await submitExam(code, {
      name: studentName,
      answers: answers.value,
      durationSec: Math.round((Date.now() - startedAt.value) / 1000),
    })
    if (timer) clearInterval(timer)
  } catch (e) {
    if (e instanceof RelayError && e.code === 'ended') errorKey.value = 'ended'
  } finally {
    submitting.value = false
  }
}

function handleSubmitClick() {
  if (unansweredCount.value > 0 && !window.confirm(i18n.t('takeSubmitConfirm', { n: unansweredCount.value }))) return
  doSubmit()
}

onMounted(async () => {
  try {
    const info = await fetchExam(code)
    exam.value = info
    startedAt.value = Date.now()
    const durationSec = info.durationMinutes * 60
    const windowSec = Math.floor((info.endAt - Date.now()) / 1000)
    remainingSec.value = Math.min(durationSec, windowSec)
    timer = setInterval(() => {
      remainingSec.value--
      if (remainingSec.value <= 0) doSubmit()
    }, 1000)
  } catch (e) {
    if (e instanceof RelayError) {
      if (e.code === 'not_started') {
        errorKey.value = 'not_started'
        if (e.startAt) notStartedTime.value = new Date(e.startAt).toLocaleString()
      }
      else if (e.code === 'ended') errorKey.value = 'ended'
      else errorKey.value = 'not_found'
    } else {
      errorKey.value = 'not_found'
    }
  } finally {
    loading.value = false
  }
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

const optionLabels = 'ABCDEFGH'.split('')
const isMulti = (t: string) => t === 'multi_choice'
const isChoice = (t: string) => ['single_choice', 'multi_choice', 'true_false'].includes(t)
</script>

<template>
  <div class="max-w-2xl mx-auto">
    <p v-if="loading" class="text-center py-10">{{ i18n.t('takeLoading') }}</p>

    <div v-else-if="errorKey" class="card-filled p-6 text-center space-y-4">
      <p class="text-body-lg" style="color: rgb(var(--md-error))">
        <template v-if="errorKey === 'not_started'">{{ i18n.t('takeNotStarted', { time: notStartedTime }) }}</template>
        <template v-else-if="errorKey === 'ended'">{{ i18n.t('takeEnded') }}</template>
        <template v-else>{{ i18n.t('takeNotFound') }}</template>
      </p>
      <button class="btn-tonal" @click="router.push('/')">{{ i18n.t('takeBackHome') }}</button>
    </div>

    <template v-else-if="exam && !result">
      <div class="sticky top-0 z-10 card-filled p-4 mb-4 flex items-center justify-between elevation-1">
        <div>
          <h1 class="text-title-md">{{ exam.title }}</h1>
          <p class="text-label-sm">{{ studentName }}</p>
        </div>
        <div class="text-right">
          <div class="text-label-sm">{{ i18n.t('takeTimeLeft') }}</div>
          <div class="text-title-md tabular-nums" style="color: rgb(var(--md-primary))">{{ timeText }}</div>
        </div>
      </div>

      <div v-for="(q, i) in exam.questions" :key="q.id" class="card-outlined p-4 mb-3">
        <p class="text-sm mb-3"><span class="font-bold mr-1">{{ i + 1 }}.</span>{{ q.stem }}</p>
        <div v-if="isChoice(q.type)" class="space-y-2">
          <button
            v-for="(opt, oi) in q.options"
            :key="oi"
            class="w-full text-left px-3 py-2 rounded-xl text-sm transition-colors"
            :style="isSelected(q.id, optionLabels[oi], isMulti(q.type))
              ? { backgroundColor: 'rgb(var(--md-primary))', color: 'rgb(var(--md-on-primary))' }
              : { backgroundColor: 'rgba(var(--md-primary) / 0.08)' }"
            @click="select(q.id, optionLabels[oi], isMulti(q.type))"
          >
            {{ optionLabels[oi] }}. {{ opt }}
          </button>
        </div>
        <input
          v-else-if="q.type === 'fill_blank'"
          v-model="answers[q.id]"
          class="input-outlined w-full"
        />
        <textarea v-else v-model="answers[q.id]" rows="3" class="input-outlined w-full" />
      </div>

      <button class="btn-filled w-full !h-12 mb-8" :disabled="submitting" @click="handleSubmitClick">
        {{ submitting ? i18n.t('takeSubmitting') : i18n.t('takeSubmit') }}
      </button>
    </template>

    <template v-else-if="result">
      <div class="card-filled p-6 text-center mb-4">
        <div class="text-label-sm">{{ i18n.t('takeScore') }}</div>
        <div class="text-5xl font-bold my-2" style="color: rgb(var(--md-primary))">
          {{ result.score }} / {{ result.totalScore }}
        </div>
        <p v-if="result.pendingCount > 0" class="text-sm" style="color: rgb(var(--md-on-surface-variant))">
          {{ i18n.t('takePendingReview', { n: result.pendingCount }) }}
        </p>
      </div>
      <div v-for="(g, i) in result.graded" :key="g.question.id" class="card-outlined p-4 mb-3">
        <p class="text-sm mb-2"><span class="font-bold mr-1">{{ i + 1 }}.</span>{{ g.question.stem }}</p>
        <div class="text-label-sm">{{ i18n.t('takeYourAnswer') }}</div>
        <div class="text-sm mb-2" :style="{ color: g.isCorrect === false ? 'rgb(var(--md-error))' : 'rgb(var(--md-on-surface))' }">
          {{ g.userAnswer || i18n.t('takeUnanswered') }}
        </div>
        <div class="text-label-sm">{{ i18n.t('takeCorrectAnswer') }}</div>
        <div class="text-sm mb-2" style="color: rgb(var(--md-primary))">{{ g.question.answer }}</div>
        <div v-if="g.question.analysis" class="text-xs" style="color: rgb(var(--md-on-surface-variant))">{{ g.question.analysis }}</div>
      </div>
      <button class="btn-tonal w-full mb-8" @click="router.push('/')">{{ i18n.t('takeBackHome') }}</button>
    </template>
  </div>
</template>
```

- [ ] **Step 3: type-check**

```bash
cd frontend && pnpm run type-check
```

预期：通过。

- [ ] **Step 4: Commit**

```bash
git add frontend/src/views/TakeExamView.vue frontend/src/router/index.ts
git commit -m "feat(frontend): take-exam view with countdown and server grading"
```

---

### Task 6: 前端 — 成绩管理页 `ManageResultsView` + 路由

**Files:**
- Create: `frontend/src/views/ManageResultsView.vue`
- Modify: `frontend/src/router/index.ts`

**Interfaces:**
- Consumes: `fetchResults`（Task 3）、i18n key（Task 4）
- Produces: 路由 `#/manage/:code?token=xxx`

- [ ] **Step 1: `frontend/src/router/index.ts` routes 数组追加**

```ts
    {
      path: '/manage/:code',
      name: 'manage-exam',
      component: () => import('@/views/ManageResultsView.vue'),
      meta: { title: 'Exam Results' },
    },
```

- [ ] **Step 2: 创建 `frontend/src/views/ManageResultsView.vue`**

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useI18nStore } from '@/stores/i18n'
import { fetchResults, RelayError } from '@/api/relay'
import type { ExamResultsResponse } from '@exameow/shared'

const route = useRoute()
const i18n = useI18nStore()

const code = (route.params.code as string || '').toUpperCase()
const token = (route.query.token as string || '').trim()

const loading = ref(true)
const unauthorized = ref(false)
const data = ref<ExamResultsResponse | null>(null)

function fmtTime(ts: number): string {
  return new Date(ts).toLocaleString()
}

function fmtDuration(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

onMounted(async () => {
  try {
    data.value = await fetchResults(code, token)
  } catch (e) {
    if (e instanceof RelayError) unauthorized.value = true
    else unauthorized.value = true
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="max-w-3xl mx-auto">
    <p v-if="loading" class="text-center py-10">{{ i18n.t('takeLoading') }}</p>

    <div v-else-if="unauthorized" class="card-filled p-6 text-center">
      <p class="text-body-lg" style="color: rgb(var(--md-error))">{{ i18n.t('manageUnauthorized') }}</p>
    </div>

    <template v-else-if="data">
      <h1 class="text-display-sm mb-1">{{ i18n.t('manageTitle') }}</h1>
      <p class="text-body-lg mb-4" style="color: rgb(var(--md-on-surface-variant))">
        {{ data.title }} · {{ code }}
      </p>

      <p v-if="data.results.length === 0" class="text-center py-10" style="color: rgb(var(--md-on-surface-variant))">
        {{ i18n.t('manageNoResults') }}
      </p>

      <div v-else class="card-outlined overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left" style="color: rgb(var(--md-on-surface-variant))">
              <th class="p-3">{{ i18n.t('manageColName') }}</th>
              <th class="p-3">{{ i18n.t('manageColScore') }}</th>
              <th class="p-3">{{ i18n.t('manageColCorrect') }}</th>
              <th class="p-3">{{ i18n.t('manageColDuration') }}</th>
              <th class="p-3">{{ i18n.t('manageColTime') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(r, i) in data.results" :key="i" class="border-t" style="border-color: rgb(var(--md-outline-variant))">
              <td class="p-3">{{ r.name }}</td>
              <td class="p-3 font-bold" style="color: rgb(var(--md-primary))">{{ r.score }}/{{ r.totalScore }}</td>
              <td class="p-3">{{ r.correctCount }}/{{ r.totalCount }}</td>
              <td class="p-3">{{ fmtDuration(r.durationSec) }}</td>
              <td class="p-3">{{ fmtTime(r.submittedAt) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>
```

- [ ] **Step 3: type-check**

```bash
cd frontend && pnpm run type-check
```

预期：通过。

- [ ] **Step 4: Commit**

```bash
git add frontend/src/views/ManageResultsView.vue frontend/src/router/index.ts
git commit -m "feat(frontend): exam results management view"
```

---

### Task 7: 部署脚本 + 版本号 + 端到端手测

**Files:**
- Modify: `scripts/deploy-cf.sh`
- Modify: `package.json`、`workers/package.json`、`src-tauri/Cargo.toml`、`src-tauri/tauri.conf.json`（版本号 1.0.0 → 1.1.0）

- [ ] **Step 1: `scripts/deploy-cf.sh` 在 Step 3 之前插入 bucket 幂等创建**

```bash
echo "[2.5/3] Ensuring R2 bucket exists..."
cd "$PROJECT_DIR/workers"
if ! npx wrangler r2 bucket list 2>/dev/null | grep -q "exameow-exams"; then
  npx wrangler r2 bucket create exameow-exams
fi
```

- [ ] **Step 2: 四处版本号 bump 到 1.1.0**

逐个文件将 `"version": "1.0.0"`（Cargo.toml 中为 `version = "1.0.0"`）改为 `1.1.0`。

- [ ] **Step 3: 本地端到端手测**

```bash
cd workers && pnpm typecheck && npx wrangler dev &
cd frontend && pnpm run type-check && pnpm dev
```

手动走通：出题页生成题目 → 发布考试（设置窗口）→ 复制 6 位码 → 参加考试 → 作答交卷 → 看到分数与解析 → 打开管理链接看到成绩行。另验证：窗口外取题显示对应提示。

- [ ] **Step 4: Commit**

```bash
git add scripts/deploy-cf.sh package.json workers/package.json src-tauri/Cargo.toml src-tauri/tauri.conf.json
git commit -m "chore: bump version to 1.1.0 and add R2 bucket setup to deploy script"
```

---

## Self-Review 记录

- Spec 覆盖：R2 结构（T1）、4 端点（T1/T2）、判分规则含 `pendingCount`（T2）、7 天过期应用层判定（T1 `isExpired`/`readExam`）、前端四模块（T3-T6）、i18n（T4）、部署与版本（T7）均有对应任务。
- 类型一致性：`SubmitExamResponse.graded`、`ExamResultsResponse`、`RelayError.code` 在 T2 产出、T3/T5/T6 消费，签名一致。
- 已知取舍：Task 2 手测脚本依赖本地 R2 模拟（wrangler dev 自带），无需真实 bucket；`input-outlined` 类名在 T4 Step 3 标注了 fallback 检查。
