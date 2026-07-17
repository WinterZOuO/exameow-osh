import { invoke } from '@tauri-apps/api/core'
import type { AIConfig, AnswerResult, ExamParams, JudgeParams, JudgeResult, ModelInfo, Question, VisionConfig } from '@exameow/shared'

export interface GenerateResult {
  questions: Question[]
}

export const tauriApi = {
  async parseFileText(filePath: string): Promise<string> {
    return invoke<string>('parse_file_text', { filePath })
  },

  async parseFileBytes(base64Data: string, fileExt: string): Promise<string> {
    return invoke<string>('parse_file_bytes', { base64Data, fileExt })
  },

  async getModels(endpoint: string, apiKey: string): Promise<ModelInfo[]> {
    return invoke<ModelInfo[]>('get_models', { endpoint, apiKey })
  },

  async generateExam(
    filePath: string,
    params: ExamParams,
    endpoint: string,
    apiKey: string,
    model: string,
    signal?: AbortSignal,
  ): Promise<GenerateResult> {
    if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError')
    const fpType = typeof filePath
    const fpVal = fpType === 'string' ? filePath : JSON.stringify(filePath)
    console.log('[bridge] generateExam filePath type:', fpType, 'val:', fpVal)
    const safePath = typeof filePath === 'string' ? filePath : String(filePath || 'file')
    console.log('[bridge] safePath:', safePath)
    try {
      return await invoke<GenerateResult>('generate_exam', {
        filePath: safePath,
        paramsJson: JSON.stringify(params),
        endpoint,
        apiKey,
        model,
      })
    } catch (e: any) {
      const detail = `[DIAG] filePath type=${fpType} val=${fpVal} safePath=${safePath} | ${e?.message || e}`
      console.error(detail)
      throw new Error(detail)
    }
  },

  async exportCsv(questions: Question[], savePath: string): Promise<void> {
    return invoke<void>('export_csv', { questionsJson: JSON.stringify(questions), savePath })
  },

  async exportXlsx(questions: Question[], savePath: string): Promise<void> {
    return invoke<void>('export_xlsx', { questionsJson: JSON.stringify(questions), savePath })
  },

  async exportXlsxData(questions: Question[]): Promise<string> {
    return invoke<string>('export_xlsx_data', { questionsJson: JSON.stringify(questions) })
  },

  async saveToDownloads(filename: string, contentBase64: string): Promise<string> {
    return invoke<string>('save_to_downloads', { filename, contentBase64 })
  },

  async answerQuestion(
    question: string,
    language: string,
    endpoint: string,
    apiKey: string,
    model: string,
  ): Promise<AnswerResult> {
    return invoke<AnswerResult>('answer_question', { question, language, endpoint, apiKey, model })
  },

  async judgeAnswer(
    params: JudgeParams,
    language: string,
    endpoint: string,
    apiKey: string,
    model: string,
  ): Promise<JudgeResult> {
    return invoke<JudgeResult>('judge_answer', {
      stem: params.stem,
      referenceAnswer: params.reference_answer,
      analysis: params.analysis ?? '',
      userAnswer: params.user_answer,
      language,
      endpoint,
      apiKey,
      model,
    })
  },

  async saveConfig(config: AIConfig): Promise<void> {
    return invoke<void>('save_config', { endpoint: config.endpoint, apiKey: config.api_key, model: config.model })
  },

  async loadConfig(): Promise<AIConfig | null> {
    return invoke<AIConfig | null>('load_config')
  },

  async saveVisionConfig(config: VisionConfig): Promise<void> {
    return invoke<void>('save_vision_config', {
      mode: config.mode,
      endpoint: config.endpoint,
      apiKey: config.api_key,
      model: config.model,
    })
  },

  async loadVisionConfig(): Promise<VisionConfig | null> {
    return invoke<VisionConfig | null>('load_vision_config')
  },

  async extractQuestionText(
    imageDataUrl: string,
    config: VisionConfig,
  ): Promise<string> {
    return invoke<string>('extract_question_text', {
      imageDataUrl,
      endpoint: config.endpoint,
      apiKey: config.api_key,
      model: config.model,
    })
  },

  async captureScreen(x: number, y: number, w: number, h: number): Promise<string> {
    return invoke<string>('capture_screen', { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) })
  },
}
