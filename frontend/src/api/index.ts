import type { AnswerResult, ExamParams, ExplainParams, ExplainResult, JudgeParams, JudgeResult, ModelInfo, Question } from '@exameow/shared'
import { tauriApi } from './bridge'
import {
  httpApi,
  type CourseDetail,
  type CourseSummary,
  type MaterialDetail,
  type MaterialSummary,
  type SharedQuestion,
  type BulkInsertResult,
  type ServerConfigInfo,
} from './http'

let _isTauri: boolean | null = null

function isTauri(): boolean {
  if (_isTauri === null) {
    _isTauri = '__TAURI__' in window || '__TAURI_INTERNALS__' in window
  }
  return _isTauri
}

/**
 * W3 之後所有 AI 呼叫都行 server，唔再按平台分岔。
 *
 * 上游有三條路：Tauri（單機）、Cloudflare Worker（瀏覽器直駁 LLM）、HTTP server。
 * 前兩條都要喺瀏覽器手上揸住條 API key 先做得嘢，同「key 只存 server」直接相沖，
 * 所以 CF 嗰條整條拆走，Tauri 淨低檔案／匯出嗰部分。
 */
export const api = {
  getModels(): Promise<ModelInfo[]> {
    return httpApi.getModels()
  },

  getLlmConfig() {
    return httpApi.getLlmConfig()
  },

  saveLlmConfig(input: Parameters<typeof httpApi.saveLlmConfig>[0]) {
    return httpApi.saveLlmConfig(input)
  },

  deleteLlmConfig() {
    return httpApi.deleteLlmConfig()
  },

  generateExam(
    file: File,
    params: ExamParams,
    model: string,
    signal?: AbortSignal,
  ): Promise<{ questions: Question[] }> {
    return httpApi.generateExam(file, params, model, signal)
  },

  answerQuestion(
    question: string,
    language: string,
    model: string,
    signal?: AbortSignal,
  ): Promise<AnswerResult> {
    return httpApi.answerQuestion(question, language, model, signal)
  },

  judgeAnswer(
    params: JudgeParams,
    language: string,
    model: string,
    signal?: AbortSignal,
  ): Promise<JudgeResult> {
    return httpApi.judgeAnswer(params, language, model, signal)
  },

  explainQuestion(
    params: ExplainParams,
    language: string,
    model: string,
    signal?: AbortSignal,
  ): Promise<ExplainResult> {
    return httpApi.explainQuestion(params, language, model, signal)
  },

  // ------------------------------------------------ 匯出（Tauri 要寫入本機路徑）

  async exportCsv(questions: Question[], savePath?: string, filename?: string): Promise<void> {
    if (isTauri()) {
      return tauriApi.exportCsv(questions, savePath!)
    }
    return httpApi.exportCsv(questions, filename)
  },

  async exportXlsx(questions: Question[], savePath?: string, filename?: string): Promise<void> {
    if (isTauri()) {
      return tauriApi.exportXlsx(questions, savePath!)
    }
    return httpApi.exportXlsx(questions, filename)
  },

  async exportXlsxData(questions: Question[]): Promise<string> {
    return tauriApi.exportXlsxData(questions)
  },

  async getServerInfo(): Promise<ServerConfigInfo | null> {
    if (isTauri()) return null
    return httpApi.getServerInfo()
  },

  // ------------------------------------------------ 課程（W4，server-only 概念）

  listCourses(): Promise<CourseSummary[]> {
    return httpApi.listCourses()
  },

  createCourse(code: string, title: string): Promise<CourseSummary> {
    return httpApi.createCourse(code, title)
  },

  joinCourse(joinCode: string): Promise<CourseSummary> {
    return httpApi.joinCourse(joinCode)
  },

  getCourse(id: string): Promise<CourseDetail> {
    return httpApi.getCourse(id)
  },

  leaveCourse(id: string): Promise<void> {
    return httpApi.leaveCourse(id)
  },

  deleteCourse(id: string): Promise<void> {
    return httpApi.deleteCourse(id)
  },

  // ------------------------------------------------ 教材（W5）

  listMaterials(courseId: string): Promise<MaterialSummary[]> {
    return httpApi.listMaterials(courseId)
  },

  uploadMaterial(courseId: string, file: File): Promise<MaterialSummary> {
    return httpApi.uploadMaterial(courseId, file)
  },

  getMaterial(id: string): Promise<MaterialDetail> {
    return httpApi.getMaterial(id)
  },

  deleteMaterial(id: string): Promise<void> {
    return httpApi.deleteMaterial(id)
  },

  // ------------------------------------------------ 共享題庫（W6）

  listCourseQuestions(courseId: string): Promise<SharedQuestion[]> {
    return httpApi.listCourseQuestions(courseId)
  },

  bulkInsertQuestions(courseId: string, materialId: string | null, questions: Question[]): Promise<BulkInsertResult> {
    return httpApi.bulkInsertQuestions(courseId, materialId, questions)
  },
}
