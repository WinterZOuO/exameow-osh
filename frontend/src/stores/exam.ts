import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ExamParams, Question, QuestionType, Difficulty } from '@exambot/shared'
import { api } from '@/api'
import { useConfigStore } from './config'

export const useExamStore = defineStore('exam', () => {
  const selectedFile = ref<File | null>(null)
  const filePath = ref('')
  const questionTypes = ref<QuestionType[]>([])
  const count = ref(5)
  const difficulty = ref<Difficulty>('medium' as Difficulty)
  const language = ref('zh-CN')
  const topicFilter = ref('')
  const questions = ref<Question[]>([])
  const generating = ref(false)
  const generated = computed(() => questions.value.length > 0)

  function getParams(): ExamParams {
    return {
      question_types: questionTypes.value,
      count: count.value,
      difficulty: difficulty.value,
      language: language.value,
      topic_filter: topicFilter.value || undefined,
    }
  }

  async function generate() {
    const configStore = useConfigStore()
    generating.value = true
    try {
      const fileOrPath = filePath.value || selectedFile.value!
      const result = await api.generateExam(fileOrPath, getParams(), configStore.getConfig())
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

  return { selectedFile, filePath, questionTypes, count, difficulty, language, topicFilter, questions, generating, generated, getParams, generate, reset }
})
