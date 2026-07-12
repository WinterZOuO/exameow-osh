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
  const questions = ref<Question[]>([])
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
    const paragraphs = text.split(/\n\n+/).filter((p) => p.trim().length > 20)
    if (paragraphs.length === 0) return [text]
    if (paragraphs.length <= chunkCount) return paragraphs.map((p) => p.trim())

    const chunks: string[] = []
    const perChunk = Math.ceil(paragraphs.length / chunkCount)
    for (let i = 0; i < paragraphs.length; i += perChunk) {
      chunks.push(paragraphs.slice(i, i + perChunk).join('\n\n'))
    }
    return chunks.slice(0, chunkCount)
  }

  function buildBatches(baseParams: ExamParams, chunkCount: number): ExamParams[] {
    const typeEntries = Object.entries(baseParams.type_counts || {})
    if (typeEntries.length === 0) return [baseParams]

    const MAX_PER_BATCH = 10
    // distribute each type across batches, max 10 per batch
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

    const textChunks = chunkText(baseParams.text || '', batches.length || 1)

    return batches.map((b, i) => {
      const batchCounts = b.counts
      let batchTotal = 0
      for (const v of Object.values(batchCounts)) batchTotal += v
      return {
        ...baseParams,
        count: batchTotal,
        type_counts: batchCounts,
        text: textChunks[i % textChunks.length],
      } as ExamParams
    })
  }

  async function generate(fileOrPath: string | File) {
    const configStore = useConfigStore()
    generating.value = true
    progress.value = { current: 0, total: 0, message: 'Preparing...' }
    questions.value = []

    try {
      const config = configStore.getConfig()
      const baseParams = getParams()

      // Get document text
      let fullText: string
      if (typeof fileOrPath === 'string') {
        progress.value.message = 'Extracting document text...'
        const { tauriApi } = await import('@/api/bridge')
        fullText = await tauriApi.parseFileText(fileOrPath)
      } else {
        fullText = await fileOrPath.text()
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
    } finally {
      generating.value = false
    }
  }

  function reset() {
    questions.value = []
  }

  return {
    questionTypes, typeCounts, totalCount,
    difficulty, language, topicFilter, questions, generating, generated,
    progress, getParams, generate, reset,
  }
})
