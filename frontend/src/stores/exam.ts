import { defineStore } from 'pinia'
import { ref, reactive, computed } from 'vue'
import type { ExamParams, Question, QuestionType, Difficulty } from '@exambot/shared'
import { api } from '@/api'
import { useConfigStore } from './config'

const ALL_TYPES: QuestionType[] = [
  'single_choice' as QuestionType,
  'multi_choice' as QuestionType,
  'true_false' as QuestionType,
  'fill_blank' as QuestionType,
  'short_answer' as QuestionType,
]

export const useExamStore = defineStore('exam', () => {
  const questionTypes = ref<QuestionType[]>([])
  const typeCounts = reactive<Record<string, number>>(
    Object.fromEntries(ALL_TYPES.map((t) => [t, 0])),
  )
  const difficulty = ref<Difficulty>('medium' as Difficulty)
  const language = ref('zh-CN')
  const topicFilter = ref('')
  const questions = ref<Question[]>(loadCachedQuestions())
  const sourceFileName = ref(loadCachedSourceFile())
  const generating = ref(false)
  const progress = ref({ current: 0, total: 0, message: '' })
  const generated = computed(() => questions.value.length > 0)
  const totalCount = computed(() =>
    Object.values(typeCounts).reduce((s, c) => s + c, 0),
  )

  function getParams(): ExamParams {
    const tc: Record<string, number> = {}
    for (const t of questionTypes.value) {
      tc[t] = typeCounts[t] || 0
    }
    return {
      question_types: questionTypes.value,
      count: totalCount.value || 1,
      type_counts: Object.keys(tc).length > 0 ? tc : undefined,
      difficulty: difficulty.value,
      language: language.value,
      topic_filter: topicFilter.value || undefined,
    }
  }

  function chunkText(text: string, chunkCount: number): string[] {
    const paragraphs = text.split(/\n\n+/).filter((p) => p.trim().length > 10)
    if (paragraphs.length === 0) return [text]
    if (chunkCount <= 1) return [text]

    // Distribute paragraphs round-robin to ensure each chunk gets unique, diverse content
    const chunks: string[] = Array.from({ length: chunkCount }, () => '')
    for (let i = 0; i < paragraphs.length; i++) {
      const chunkIdx = i % chunkCount
      chunks[chunkIdx] += (chunks[chunkIdx] ? '\n\n' : '') + paragraphs[i]!.trim()
    }

    // If some chunks are too small, merge them back into the first few
    const result = chunks.filter(c => c.length > 0)
    if (result.length < chunks.length / 2) {
      // Fewer chunks than expected - use full text for all batches (AI will vary)
      return Array.from({ length: chunkCount }, () => text)
    }

    while (result.length < chunkCount) {
      result.push(text) // fallback to full text for remaining
    }
    return result.slice(0, chunkCount)
  }

  function buildBatches(baseParams: ExamParams, chunkCount: number): ExamParams[] {
    const typeEntries = Object.entries(baseParams.type_counts || {})
    if (typeEntries.length === 0) return [baseParams]

    const MAX_PER_BATCH = 10
    const batches: { counts: Record<string, number> }[] = []
    for (const [qtype, total] of typeEntries) {
      let remaining = total
      let batchIdx = 0
      while (remaining > 0) {
        while (batches.length <= batchIdx) batches.push({ counts: {} })
        const take = Math.min(remaining, Math.ceil(MAX_PER_BATCH / typeEntries.length) || 1)
        const batch = batches[batchIdx]!
        batch.counts[qtype] = (batch.counts[qtype] || 0) + take
        remaining -= take
        batchIdx++
      }
    }

    const totalBatches = batches.length
    const textChunks = chunkText(baseParams.text || '', totalBatches)

    return batches.map((b, i) => {
      const batchCounts = b.counts
      let batchTotal = 0
      for (const v of Object.values(batchCounts)) batchTotal += v
      return {
        ...baseParams,
        count: batchTotal,
        type_counts: batchCounts,
        text: textChunks[i % textChunks.length],
        batch_index: i + 1,
        batch_total: totalBatches,
      } as ExamParams
    })
  }

  function loadCachedQuestions(): Question[] {
    try {
      const cached = localStorage.getItem('exambot-questions')
      if (cached) return JSON.parse(cached)
    } catch {}
    return []
  }

  function loadCachedSourceFile(): string {
    return localStorage.getItem('exambot-sourcefile') || ''
  }

  function saveCachedQuestions() {
    try {
      localStorage.setItem('exambot-questions', JSON.stringify(questions.value))
      localStorage.setItem('exambot-sourcefile', sourceFileName.value)
    } catch {}
  }

  function extractFileName(inputs: (string | File)[]): string {
    if (inputs.length === 0) return ''
    const first = inputs[0]!
    const rawName = first instanceof File
      ? first.name
      : first.replace(/\\/g, '/').split('/').pop() || first
    const dot = rawName.lastIndexOf('.')
    const base = dot > 0 ? rawName.substring(0, dot) : rawName
    return inputs.length > 1 ? `${base}等文件` : base
  }

  async function generate(inputs: (string | File)[]) {
    const configStore = useConfigStore()
    generating.value = true
    progress.value = { current: 0, total: 0, message: 'Preparing...' }
    questions.value = []
    sourceFileName.value = extractFileName(inputs)

    try {
      const config = configStore.getConfig()
      const baseParams = getParams()

      // Parse all files and concatenate text
      let fullText = ''
      const hasTauriPaths = inputs.some(i => typeof i === 'string')

      if (hasTauriPaths) {
        progress.value.message = 'Extracting document text...'
        const { tauriApi } = await import('@/api/bridge')
        for (const input of inputs) {
          if (typeof input === 'string') {
            const text = await tauriApi.parseFileText(input)
            if (text) fullText += (fullText ? '\n\n---\n\n' : '') + text
          }
        }
      } else {
        for (const input of inputs) {
          const file = input as File
          const text = await (file as File).text()
          if (text) fullText += (fullText ? '\n\n---\n\n' : '') + text
        }
      }

      baseParams.text = fullText
      const totalQ = Object.values(baseParams.type_counts || {}).reduce((s, c) => s + c, 0)
      const needBatching = totalQ > 10
      const batches = needBatching ? buildBatches(baseParams, Math.ceil(totalQ / 10)) : [baseParams]

      progress.value = { current: 0, total: batches.length, message: 'Generating...' }

      for (let i = 0; i < batches.length; i++) {
        progress.value = { current: i, total: batches.length, message: `Generating batch ${i + 1}/${batches.length}...` }
        const batch = batches[i]
        if (!batch) continue
        const result = await api.generateExam('', batch, config)
        questions.value.push(...result.questions)
      }

      progress.value = { current: batches.length, total: batches.length, message: 'Complete!' }
      saveCachedQuestions()
    } finally {
      generating.value = false
    }
  }

  function reset() {
    questions.value = []
    sourceFileName.value = ''
    try { localStorage.removeItem('exambot-questions'); localStorage.removeItem('exambot-sourcefile') } catch {}
  }

  return {
    questionTypes, typeCounts, totalCount,
    difficulty, language, topicFilter, questions, generating, generated,
    sourceFileName, progress, getParams, generate, reset,
  }
})
