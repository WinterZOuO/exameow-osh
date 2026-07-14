import type { AIConfig, ExamParams, ModelInfo } from '@exambot/shared'
import { tauriApi, type GenerateResult as TauriGenerateResult } from './bridge'
import { httpApi, type GenerateResult as HttpGenerateResult } from './http'

let _isTauri: boolean | null = null

function isTauri(): boolean {
  if (_isTauri === null) {
    _isTauri = '__TAURI__' in window || '__TAURI_INTERNALS__' in window
  }
  return _isTauri
}

export const api = {
  async getModels(config: AIConfig): Promise<ModelInfo[]> {
    if (isTauri()) {
      return tauriApi.getModels(config.endpoint, config.api_key)
    }
    return httpApi.getModels(config.endpoint, config.api_key)
  },

  async generateExam(
    fileOrPath: File | string,
    params: ExamParams,
    config: AIConfig,
  ): Promise<{ questions: import('@exambot/shared').Question[] }> {
    if (isTauri()) {
      return tauriApi.generateExam(
        fileOrPath as string,
        params,
        config.endpoint,
        config.api_key,
        config.model,
      )
    }
    return httpApi.generateExam(fileOrPath as File, params, config)
  },

  async exportCsv(
    questions: import('@exambot/shared').Question[],
    savePath?: string,
    filename?: string,
  ): Promise<void> {
    if (isTauri()) {
      return tauriApi.exportCsv(questions, savePath!)
    }
    return httpApi.exportCsv(questions, filename)
  },

  async exportKaoshibao(
    questions: import('@exambot/shared').Question[],
    savePath?: string,
    filename?: string,
  ): Promise<void> {
    if (isTauri()) {
      return tauriApi.exportKaoshibao(questions, savePath!)
    }
    return httpApi.exportKaoshibao(questions, filename)
  },

  async exportXlsxData(
    questions: import('@exambot/shared').Question[],
  ): Promise<string> {
    return tauriApi.exportXlsxData(questions)
  },

  async saveConfig(config: AIConfig): Promise<void> {
    if (isTauri()) {
      return tauriApi.saveConfig(config)
    }
    return httpApi.saveConfig(config)
  },

  async loadConfig(): Promise<AIConfig | null> {
    if (isTauri()) {
      return tauriApi.loadConfig()
    }
    return httpApi.loadConfig()
  },
}
