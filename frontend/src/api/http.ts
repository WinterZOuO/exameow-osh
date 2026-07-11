import type { AIConfig, ExamParams, ModelInfo, Question } from '@exambot/shared'

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
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`)
    return res.json()
  },

  async exportCsv(questions: Question[]): Promise<void> {
    const csvContent = generateCsvContent(questions)
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'exambot_questions.csv'
    a.click()
    URL.revokeObjectURL(url)
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
}

function generateCsvContent(questions: Question[]): string {
  const headers = ['id', 'type', 'stem', 'options', 'answer', 'analysis']
  const rows = questions.map((q) => [
    q.id,
    q.type,
    q.stem.replace(/"/g, '""'),
    q.options.join('|'),
    q.answer.replace(/"/g, '""'),
    q.analysis.replace(/"/g, '""'),
  ])
  const csvRows = [headers, ...rows].map((r) =>
    r.map((c) => `"${c}"`).join(','),
  )
  return '\uFEFF' + csvRows.join('\n')
}
