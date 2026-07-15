import { defineStore } from 'pinia'
import { ref, reactive, computed } from 'vue'
import type { ExamParams, Question, QuestionType, Difficulty } from '@exambot/shared'
import { api } from '@/api'
import { useConfigStore } from './config'
import { usePracticeStore } from './practice'

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
  const error = ref<string | null>(null)
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
    const fullText = baseParams.text || ''

    const chunkCount = Math.max(1, Math.ceil(totalQ / MAX_Q_PER_CHUNK))

    if (chunkCount <= 1) return [{ ...baseParams }]

    const fileSections = splitByFileSections(fullText)
    console.log('[ExamBot] File sections:', fileSections.length, '| sizes:', fileSections.map(s => s.label + ':' + s.text.length).join(', '))
    const textChunks = chunkByFileProportion(fileSections, chunkCount, fullText)
    console.log('[ExamBot] Chunks (should = chunkCount =', chunkCount, '):', textChunks.length, '| labels:', textChunks.map(c => c.substring(0, 50).replace(/\n/g, '\\n')).join(' | '))
    const remaining: Record<string, number> = {}
    for (const [k, v] of typeEntries) remaining[k] = v

    const chunks = textChunks
    const batches: ExamParams[] = []
    for (let i = 0; i < chunks.length && Object.values(remaining).some(c => c > 0); i++) {
      const chunk = chunks[i]!
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
    }

    const totalBatches = batches.length
    for (const b of batches) {
      b.batch_total = totalBatches
    }

    return batches
  }

  // File sections are separated by "\n\n---\n\n## "
  // Returns array of { text, label } for each file section.
  // If no file markers found, treat entire text as a single section.
  function splitByFileSections(text: string): { text: string; label: string }[] {
    const parts = text.split(/\n\n---\n\n(?=## )/)
    if (parts.length <= 1) return [{ text, label: '' }]
    return parts.map((p, i) => {
      // Extract the label from "## filename\n..."
      const nl = p.indexOf('\n')
      const label = nl > 0 ? p.substring(3, nl).trim() : `File ${i + 1}`
      const content = nl > 0 ? p.substring(nl + 1) : p
      return { text: content, label }
    })
  }

  // Allocate `chunkCount` chunks proportionally across file sections by their text length.
  function chunkByFileProportion(sections: { text: string; label: string }[], chunkCount: number, fallbackText: string): string[] {
    const sectionLengths = sections.map(s => s.text.length)
    const totalLen = sectionLengths.reduce((s, l) => s + l, 0)

    // Allocate chunks proportionally, ensuring at least 1 chunk per section if possible
    const allocated: number[] = sectionLengths.map((len) => Math.max(1, Math.round(chunkCount * len / totalLen)))

    // Adjust to match chunkCount exactly
    let sum = allocated.reduce((s, n) => s + n, 0)
    while (sum > chunkCount) {
      const maxIdx = allocated.indexOf(Math.max(...allocated))
      allocated[maxIdx]!--
      sum--
    }
    while (sum < chunkCount) {
      const minIdx = allocated.indexOf(Math.min(...allocated))
      allocated[minIdx]!++
      sum++
    }

    // Chunk each section using chunkTextBySize, prefix with label
    const result: string[] = []
    for (let i = 0; i < sections.length; i++) {
      const sectionChunks = chunkTextBySize(sections[i]!.text, Math.max(1, allocated[i]!))
      for (const chunk of sectionChunks) {
        const prefix = sections[i]!.label ? `## ${sections[i]!.label}\n` : ''
        result.push(prefix + chunk)
      }
    }

    // If we have fewer chunks than requested, split the largest chunk
    while (result.length < chunkCount) {
      let maxIdx = 0
      for (let i = 1; i < result.length; i++) {
        if (result[i]!.length > result[maxIdx]!.length) maxIdx = i
      }
      const [a, b] = splitTextChunk(result[maxIdx]!)
      result.splice(maxIdx, 1, a, b)
    }
    // If we have too many, merge the two shortest adjacent chunks
    while (result.length > chunkCount) {
      let minIdx = 0
      let minLen = result[0]!.length + (result[1]?.length ?? Infinity)
      for (let i = 1; i < result.length - 1; i++) {
        const combined = result[i]!.length + result[i + 1]!.length
        if (combined < minLen) { minLen = combined; minIdx = i }
      }
      result.splice(minIdx, 2, result[minIdx]! + '\n\n' + result[minIdx + 1]!)
    }
    if (result.length === 0) return [fallbackText]
    return result
  }

  function splitTextChunk(chunk: string): [string, string] {
    // Preserve "## label\n" header on both halves
    let header = ''
    let body = chunk
    if (chunk.startsWith('## ')) {
      const nl = chunk.indexOf('\n')
      if (nl > 0) {
        header = chunk.substring(0, nl + 1)
        body = chunk.substring(nl + 1)
      }
    }
    const mid = Math.floor(body.length / 2)
    const nl = body.indexOf('\n', mid)
    const split = nl > 0 && nl < body.length - 1 ? nl + 1 : mid
    return [header + body.substring(0, split).trim(), header + body.substring(split).trim()]
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
    const names = inputs.map(i => {
      const raw = i instanceof File ? i.name : i.replace(/\\/g, '/').split('/').pop() || i
      const dot = raw.lastIndexOf('.')
      return dot > 0 ? raw.substring(0, dot) : raw
    })
    return names.join('、')
  }

  function fileNameFromInput(input: string | File): string {
    const raw = input instanceof File ? input.name : input.replace(/\\/g, '/').split('/').pop() || input
    const dot = raw.lastIndexOf('.')
    return dot > 0 ? raw.substring(0, dot) : raw
  }

  function uint8ToBase64(bytes: Uint8Array): string {
    const CHUNK = 4096
    const parts: string[] = []
    for (let i = 0; i < bytes.length; i += CHUNK) {
      parts.push(String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK) as unknown as number[]))
    }
    return btoa(parts.join(''))
  }

  async function generate(inputs: (string | File)[]) {
    const configStore = useConfigStore()
    generating.value = true
    progress.value = { current: 0, total: 0, message: 'Preparing...' }
    questions.value = []
    sourceFileName.value = extractFileName(inputs)

    try {
      error.value = null
      const config = configStore.getConfig()
      const baseParams = getParams()

      // Parse all files and concatenate text
      let fullText = ''
      const hasTauriPaths = inputs.some(i => typeof i === 'string')
      const isTauriEnv = '__TAURI__' in window || '__TAURI_INTERNALS__' in window

      if (hasTauriPaths) {
        progress.value.message = 'Extracting document text...'
        const { readFile } = await import('@tauri-apps/plugin-fs')
        const { tauriApi } = await import('@/api/bridge')
        for (const input of inputs) {
          if (typeof input === 'string') {
            const fname = fileNameFromInput(input)
            const ext = fname.includes('.') ? fname.split('.').pop()!.toLowerCase() : 'txt'
            const buf = await readFile(input)
            const base64 = uint8ToBase64(new Uint8Array(buf))
            const text = await tauriApi.parseFileBytes(base64, ext)
            if (text) {
              const label = fileNameFromInput(input)
              fullText += (fullText ? `\n\n---\n\n## ${label}\n` : `## ${label}\n`) + text
            }
          }
        }
      } else if (isTauriEnv) {
        progress.value.message = 'Parsing files...'
        const { tauriApi } = await import('@/api/bridge')
        for (const input of inputs) {
          const file = input as File
          const ext = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : 'txt'
          const buf = await file.arrayBuffer()
          const base64 = uint8ToBase64(new Uint8Array(buf))
          const text = await tauriApi.parseFileBytes(base64, ext)
          if (text) {
            fullText += (fullText ? `\n\n---\n\n## ${file.name}\n` : `## ${file.name}\n`) + text
          }
        }
      } else {
        for (const input of inputs) {
          const file = input as File
          const text = await (file as File).text()
          if (text) {
            fullText += (fullText ? `\n\n---\n\n## ${file.name}\n` : `## ${file.name}\n`) + text
          }
        }
      }

      baseParams.text = fullText
      baseParams.source_name = sourceFileName.value
      const batches = buildBatches(baseParams)
      const firstInput = inputs[0]!
      console.log('[ExamBot] fileRef debug:', { hasTauriPaths, isTauriEnv, firstInputType: typeof firstInput, firstInputVal: firstInput })
      const fileRef = hasTauriPaths
        ? (firstInput as string)
        : (isTauriEnv
          ? (typeof firstInput === 'string' ? firstInput : (firstInput as File).name || 'file')
          : (firstInput as File))

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

      const practiceStore = usePracticeStore()
      practiceStore.saveGeneratedAsBank(questions.value, sourceFileName.value)
    } catch (e: any) {
      error.value = e?.message || e?.toString() || 'Unknown error'
      throw e
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
    sourceFileName, error, progress, getParams, generate, reset,
  }
})
