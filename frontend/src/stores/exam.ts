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

  const MAX_CHARS_PER_CHUNK = 32000
  const MAX_Q_PER_CHUNK = 15

  function chunkTextBySize(text: string, chunkCount: number): string[] {
    let paragraphs = text.split(/\n\n+/).filter((p) => p.trim().length > 10)
    if (paragraphs.some(p => p.length > MAX_CHARS_PER_CHUNK) || paragraphs.length < chunkCount) {
      paragraphs = text.split(/\n+/).filter((p) => p.trim().length > 10)
    }
    if (paragraphs.length === 0 || chunkCount <= 1) return [text]

    const targetSize = Math.ceil(text.length / chunkCount)
    const chunks: string[] = []
    let current = ''

    for (const para of paragraphs) {
      if (current.length + para.length > targetSize && current.length > 0 && chunks.length < chunkCount - 1) {
        chunks.push(current.trim())
        current = para
      } else {
        current += (current ? '\n\n' : '') + para
      }
    }
    if (current.trim()) chunks.push(current.trim())
    if (chunks.length === 0) return [text]
    return chunks
  }

  function buildBatches(baseParams: ExamParams): ExamParams[] {
    const typeEntries = Object.entries(baseParams.type_counts || {}).filter(([, count]) => count > 0)
    if (typeEntries.length === 0) return [{ ...baseParams }]

    const totalQ = typeEntries.reduce((s, [, c]) => s + c, 0)
    const textLen = (baseParams.text || '').length

    const docChunks = Math.max(1, Math.ceil(textLen / MAX_CHARS_PER_CHUNK))
    const qChunks = Math.max(1, Math.ceil(totalQ / MAX_Q_PER_CHUNK))
    const chunkCount = Math.min(Math.max(docChunks, qChunks), totalQ)

    if (chunkCount <= 1) return [{ ...baseParams }]

    const textChunks = chunkTextBySize(baseParams.text || '', chunkCount)
    const remaining: Record<string, number> = {}
    for (const [k, v] of typeEntries) remaining[k] = v

    const batches: ExamParams[] = []
    let chunkIdx = 0
    while (Object.values(remaining).some(c => c > 0)) {
      const chunk = textChunks[chunkIdx % textChunks.length]!
      const counts: Record<string, number> = {}
      let batchTotal = 0

      let typeRound = 0
      while (batchTotal < MAX_Q_PER_CHUNK) {
        const active = typeEntries.filter(([q]) => (remaining[q] ?? 0) > 0)
        if (active.length === 0) break
        const [qtype] = active[typeRound % active.length]!
        counts[qtype] = (counts[qtype] || 0) + 1
        batchTotal++
        remaining[qtype]!--
        typeRound++
      }

      if (batchTotal > 0) {
        batches.push({
          ...baseParams,
          count: batchTotal,
          type_counts: counts,
          text: chunk,
          batch_index: batches.length + 1,
          batch_total: 0,
        } as ExamParams)
      }
      chunkIdx++
    }

    const totalBatches = batches.length
    for (const b of batches) {
      b.batch_total = totalBatches
    }

    return batches
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
      const batches = buildBatches(baseParams)
      const firstInput = inputs[0]!
      const fileRef = hasTauriPaths ? (firstInput as string) : (firstInput as File)

      progress.value = { current: 0, total: batches.length, message: 'Generating...' }

      const uniqueTexts = new Set(batches.map(b => b.text)).size
      const chunkSizes = [...new Set(batches.map(b => b.text || ''))].map(t => t.length)
      console.log(
        `[ExamBot] ${batches.length} batches, ${uniqueTexts} unique text chunks, sizes: ${JSON.stringify(chunkSizes)}`,
      )

      for (let i = 0; i < batches.length; i++) {
        progress.value = { current: i, total: batches.length, message: `Generating batch ${i + 1}/${batches.length}...` }
        const batch = batches[i]
        if (!batch) continue

        const textLen = (batch.text || '').length
        const textPreview = (batch.text || '').slice(0, 80).replace(/\n/g, '\\n')
        console.log(
          `[ExamBot] Batch ${batch.batch_index}/${batch.batch_total}: ` +
          `${JSON.stringify(batch.type_counts)} | ${textLen} chars | "${textPreview}..."`,
        )

        const result = await api.generateExam(fileRef, batch, config)
        questions.value.push(...result.questions)
        console.log(`[ExamBot] Batch ${batch.batch_index} done: ${result.questions.length} questions generated`)
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
