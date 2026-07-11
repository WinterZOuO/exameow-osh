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

const isTauri = '__TAURI__' in window

export const useExamStore = defineStore('exam', () => {
  const selectedFile = ref<File | null>(null)
  const filePath = ref(isTauri ? '' : '')
  const questionTypes = ref<QuestionType[]>([])
  const typeCounts = reactive<Record<string, number>>(
    Object.fromEntries(ALL_TYPES.map((t) => [t, 0])),
  )
  const difficulty = ref<Difficulty>('medium' as Difficulty)
  const language = ref('zh-CN')
  const topicFilter = ref('')
  const questions = ref<Question[]>([])
  const generating = ref(false)
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

  async function generate() {
    const configStore = useConfigStore()
    generating.value = true
    try {
      const fileOrPath = isTauri ? filePath.value : selectedFile.value
      if (!fileOrPath) throw new Error('No file selected')

      const params = getParams()
      const config = configStore.getConfig()

      console.log('[exam] generating with filePath:', typeof fileOrPath, fileOrPath)
      console.log('[exam] params:', JSON.stringify(params))
      console.log('[exam] config endpoint:', config.endpoint)

      const result = await api.generateExam(fileOrPath!, params, config)
      questions.value = result.questions
    } finally {
      generating.value = false
    }
  }

  function reset() {
    selectedFile.value = null
    filePath.value = ''
    questions.value = []
  }

  return {
    selectedFile, filePath, questionTypes, typeCounts, totalCount,
    difficulty, language, topicFilter, questions, generating, generated,
    getParams, generate, reset,
  }
})
