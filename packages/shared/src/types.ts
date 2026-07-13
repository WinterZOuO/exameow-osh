export enum QuestionType {
  SingleChoice = 'single_choice',
  MultiChoice = 'multi_choice',
  TrueFalse = 'true_false',
  FillBlank = 'fill_blank',
  ShortAnswer = 'short_answer',
}

export enum Difficulty {
  Easy = 'easy',
  Medium = 'medium',
  Hard = 'hard',
}

export interface Question {
  id: string
  type: QuestionType
  stem: string
  options: string[]
  answer: string
  analysis: string
}

export interface ExamParams {
  question_types: QuestionType[]
  count: number
  type_counts?: Record<string, number>
  difficulty: Difficulty
  language: string
  topic_filter?: string
  text?: string
  batch_index?: number
  batch_total?: number
}

export interface AIConfig {
  endpoint: string
  api_key: string
  model: string
}

export interface ModelInfo {
  id: string
}
