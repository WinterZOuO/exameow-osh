import { invoke } from '@tauri-apps/api/core'
import type { AIConfig, ExamParams, ModelInfo, Question } from '@exambot/shared'

export interface GenerateResult {
  questions: Question[]
}

export const tauriApi = {
  async getModels(endpoint: string, apiKey: string): Promise<ModelInfo[]> {
    return invoke<ModelInfo[]>('get_models', { endpoint, apiKey })
  },

  async generateExam(
    filePath: string,
    params: ExamParams,
    endpoint: string,
    apiKey: string,
    model: string,
  ): Promise<GenerateResult> {
    if (typeof filePath !== 'string' || !filePath) {
      throw new Error(`generateExam: filePath must be a non-empty string, got ${typeof filePath}: ${JSON.stringify(filePath)}`)
    }
    return invoke<GenerateResult>('generate_exam', {
      filePath,
      paramsJson: JSON.stringify(params),
      endpoint,
      apiKey,
      model,
    })
  },

  async exportCsv(questions: Question[], savePath: string): Promise<void> {
    return invoke<void>('export_csv', { questionsJson: JSON.stringify(questions), savePath })
  },

  async saveConfig(config: AIConfig): Promise<void> {
    return invoke<void>('save_config', { endpoint: config.endpoint, apiKey: config.api_key, model: config.model })
  },

  async loadConfig(): Promise<AIConfig | null> {
    return invoke<AIConfig | null>('load_config')
  },
}
