import { invoke } from '@tauri-apps/api/core'
import type { AIConfig, ExamParams, ModelInfo, Question } from '@exambot/shared'

export interface GenerateResult {
  questions: Question[]
}

export const tauriApi = {
  async getModels(endpoint: string, apiKey: string): Promise<ModelInfo[]> {
    return invoke<ModelInfo[]>('get_models', {
      endpoint: String(endpoint),
      api_key: String(apiKey ?? ''),
    })
  },

  async generateExam(
    filePath: string,
    params: ExamParams,
    endpoint: string,
    apiKey: string,
    model: string,
  ): Promise<GenerateResult> {
    return invoke<GenerateResult>('generate_exam', {
      file_path: String(filePath),
      params_json: String(JSON.stringify(params)),
      endpoint: String(endpoint),
      api_key: String(apiKey ?? ''),
      model: String(model),
    })
  },

  async exportCsv(questions: Question[], savePath: string): Promise<void> {
    return invoke<void>('export_csv', {
      questions_json: JSON.stringify(questions),
      save_path: String(savePath),
    })
  },

  async saveConfig(config: AIConfig): Promise<void> {
    return invoke<void>('save_config', {
      endpoint: String(config.endpoint),
      api_key: String(config.api_key),
      model: String(config.model),
    })
  },

  async loadConfig(): Promise<AIConfig | null> {
    return invoke<AIConfig | null>('load_config')
  },
}
