import type { AIConfig, AnswerResult, ExamParams, JudgeParams, JudgeResult, ModelInfo, Question, VisionConfig } from '@exambot/shared'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export interface GenerateResult {
  questions: Question[]
}

export const httpApi = {
  async getModels(endpoint: string, apiKey: string): Promise<ModelInfo[]> {
    const url = `${BASE_URL}/api/models?endpoint=${encodeURIComponent(endpoint)}&api_key=${encodeURIComponent(apiKey)}`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`)
    return res.json()
  },

  async generateExam(
    file: File,
    params: ExamParams,
    config: AIConfig,
    signal?: AbortSignal,
  ): Promise<GenerateResult> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('params', JSON.stringify(params))
    formData.append('endpoint', config.endpoint)
    formData.append('api_key', config.api_key)
    formData.append('model', config.model)

    const res = await fetch(`${BASE_URL}/api/generate`, {
      method: 'POST',
      body: formData,
      signal,
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`)
    return res.json()
  },

  async exportCsv(questions: Question[], filename: string = 'exambot_questions.csv'): Promise<void> {
    const csvContent = generateCsvContent(questions)
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  },

  async exportXlsx(questions: Question[], filename: string = 'exambot_questions.xlsx'): Promise<void> {
    const res = await fetch(`${BASE_URL}/api/export/xlsx`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(questions),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`)
    const blob = await res.blob()
    const objectUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = objectUrl
    a.download = filename
    a.click()
    URL.revokeObjectURL(objectUrl)
  },

  async answerQuestion(
    question: string,
    language: string,
    config: AIConfig,
    signal?: AbortSignal,
  ): Promise<AnswerResult> {
    const res = await fetch(`${BASE_URL}/api/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question,
        language,
        endpoint: config.endpoint,
        api_key: config.api_key,
        model: config.model,
      }),
      signal,
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`)
    return res.json()
  },

  async judgeAnswer(
    params: JudgeParams,
    language: string,
    config: AIConfig,
    signal?: AbortSignal,
  ): Promise<JudgeResult> {
    const res = await fetch(`${BASE_URL}/api/judge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stem: params.stem,
        reference_answer: params.reference_answer,
        analysis: params.analysis,
        user_answer: params.user_answer,
        language,
        endpoint: config.endpoint,
        api_key: config.api_key,
        model: config.model,
      }),
      signal,
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`)
    return res.json()
  },

  async saveConfig(config: AIConfig): Promise<void> {
    const res = await fetch(`${BASE_URL}/api/config/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    })
    if (!res.ok) {
      localStorage.setItem('exambot_config', JSON.stringify(config))
    }
  },

  async loadConfig(): Promise<AIConfig | null> {
    try {
      const res = await fetch(`${BASE_URL}/api/config/load`)
      if (res.ok) {
        const data = await res.json()
        return data
      }
    } catch {}
    const stored = localStorage.getItem('exambot_config')
    return stored ? JSON.parse(stored) : null
  },

  async saveVisionConfig(config: VisionConfig): Promise<void> {
    try {
      const res = await fetch(`${BASE_URL}/api/config/vision/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      if (res.ok) return
    } catch {}
    localStorage.setItem('exambot_vision_config', JSON.stringify(config))
  },

  async loadVisionConfig(): Promise<VisionConfig | null> {
    try {
      const res = await fetch(`${BASE_URL}/api/config/vision/load`)
      if (res.ok) {
        const data = await res.json()
        if (data) return data
      }
    } catch {}
    const stored = localStorage.getItem('exambot_vision_config')
    return stored ? JSON.parse(stored) : null
  },

  async extractQuestionText(
    imageDataUrl: string,
    config: VisionConfig,
    signal?: AbortSignal,
  ): Promise<string> {
    const res = await fetch(`${BASE_URL}/api/extract-question`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_data_url: imageDataUrl,
        endpoint: config.endpoint,
        api_key: config.api_key,
        model: config.model,
      }),
      signal,
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`)
    const data = await res.json()
    return data.text
  },
}

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
