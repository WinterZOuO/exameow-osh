import type { AnswerResult, ExamParams, ExplainParams, ExplainResult, JudgeParams, JudgeResult, ModelInfo, Question } from '@exameow/shared'

const BASE_URL = import.meta.env.VITE_API_URL || ''

/** 任何 API 回 401 時叫，由 main.ts 接駁去 auth store + router */
let onUnauthorized: (() => void) | null = null
export function setUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn
}

/**
 * 統一嘅 fetch：帶 session cookie，撞到 401 就通知上層。
 * 生產環境同源，credentials 其實可有可無；
 * 但本機開發前端喺另一個 port，冇 include 就唔會帶 cookie。
 */
async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(input, { ...init, credentials: 'include' })
  if (res.status === 401) onUnauthorized?.()
  return res
}

/**
 * server 兩種錯誤格式都要照顧：llm.rs 回 `{"error": "..."}`，routes.rs 回純文字。
 * 直接掉個 JSON 落介面好核突。
 */
async function throwHttpError(res: Response): Promise<never> {
  const raw = await res.text()
  let message = raw
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed.error === 'string') message = parsed.error
  } catch {}
  throw new Error(message || `HTTP ${res.status}`)
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) await throwHttpError(res)
  return res.json()
}

export interface GenerateResult {
  questions: Question[]
}

export interface ServerConfigInfo {
  has_env_ai: boolean
  endpoint: string
  model: string
}

/**
 * W3：條 API key 淨係喺「儲存」嗰刻上傳一次，之後永遠唔會再落返瀏覽器。
 * `key_hint` 係 `sk-a…4f2a` 咁嘅樣，夠用戶認得返自己貼咗邊條，但砌唔返原文。
 */
export interface LlmConfigInfo {
  configured: boolean
  endpoint: string
  model: string
  key_hint: string
}

export interface SaveLlmConfigInput {
  endpoint: string
  model: string
  /** 留空 = 沿用 server 已存嗰條 */
  api_key?: string
}

export const httpApi = {
  // ---------------------------------------------------------------- LLM 設定

  async getLlmConfig(): Promise<LlmConfigInfo> {
    return json(await apiFetch(`${BASE_URL}/api/llm-config`))
  },

  async saveLlmConfig(input: SaveLlmConfigInput): Promise<LlmConfigInfo> {
    return json(
      await apiFetch(`${BASE_URL}/api/llm-config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }),
    )
  },

  async deleteLlmConfig(): Promise<void> {
    const res = await apiFetch(`${BASE_URL}/api/llm-config`, { method: 'DELETE' })
    if (!res.ok) await throwHttpError(res)
  },

  /**
   * 用 server 已存嘅 key 拉型號列表。
   * 上游係 `GET /api/models?api_key=...`（條 key 入晒 log），而家 POST 而且唔收 key。
   */
  async getModels(): Promise<ModelInfo[]> {
    return json(await apiFetch(`${BASE_URL}/api/llm-config/models`, { method: 'POST' }))
  },

  // ---------------------------------------------------------------- AI 呼叫
  // 全部只帶 model（型號唔係秘密）。endpoint / api_key 由 server 按 session user 自己查。

  async generateExam(
    file: File,
    params: ExamParams,
    model: string,
    signal?: AbortSignal,
  ): Promise<GenerateResult> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('params', JSON.stringify(params))
    formData.append('model', model)

    return json(
      await apiFetch(`${BASE_URL}/api/generate`, { method: 'POST', body: formData, signal }),
    )
  },

  async answerQuestion(
    question: string,
    language: string,
    model: string,
    signal?: AbortSignal,
  ): Promise<AnswerResult> {
    return json(
      await apiFetch(`${BASE_URL}/api/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, language, model }),
        signal,
      }),
    )
  },

  async judgeAnswer(
    params: JudgeParams,
    language: string,
    model: string,
    signal?: AbortSignal,
  ): Promise<JudgeResult> {
    return json(
      await apiFetch(`${BASE_URL}/api/judge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stem: params.stem,
          reference_answer: params.reference_answer,
          analysis: params.analysis,
          user_answer: params.user_answer,
          language,
          model,
        }),
        signal,
      }),
    )
  },

  async explainQuestion(
    params: ExplainParams,
    language: string,
    model: string,
    signal?: AbortSignal,
  ): Promise<ExplainResult> {
    return json(
      await apiFetch(`${BASE_URL}/api/explain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stem: params.stem,
          reference_answer: params.reference_answer,
          analysis: params.analysis,
          language,
          model,
        }),
        signal,
      }),
    )
  },

  // ---------------------------------------------------------------- 匯出

  async exportCsv(questions: Question[], filename: string = 'exameow_questions.csv'): Promise<void> {
    const csvContent = generateCsvContent(questions)
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  },

  async exportXlsx(questions: Question[], filename: string = 'exameow_questions.xlsx'): Promise<void> {
    const res = await apiFetch(`${BASE_URL}/api/export/xlsx`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(questions),
    })
    if (!res.ok) await throwHttpError(res)
    const blob = await res.blob()
    const objectUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = objectUrl
    a.download = filename
    a.click()
    URL.revokeObjectURL(objectUrl)
  },

  async getServerInfo(): Promise<ServerConfigInfo | null> {
    try {
      const res = await apiFetch(`${BASE_URL}/api/config/server`)
      if (res.ok) return await res.json()
    } catch {}
    return null
  },
};

export function generateCsvContent(questions: Question[]): string {
  const typeLabels: Record<string, string> = {
    single_choice: '单选题', multi_choice: '多选题',
    true_false: '判断题', fill_blank: '填空题',
    short_answer: '简答题',
  }
  const headers = ['题干', '题型', '选项A', '选项B', '选项C', '选项D', '选项E', '选项F', '选项G', '选项H', '正确答案', '解析', '章节', '难度']
  const rows = questions.map((q) => [
    q.stem,
    typeLabels[q.type] || q.type,
    q.options[0] || '',
    q.options[1] || '',
    q.options[2] || '',
    q.options[3] || '',
    q.options[4] || '',
    q.options[5] || '',
    q.options[6] || '',
    q.options[7] || '',
    q.answer,
    q.analysis,
    '',
    '',
  ])
  const csvRows = [headers, ...rows].map((r) =>
    r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','),
  )
  return '\uFEFF' + csvRows.join('\n')
}
