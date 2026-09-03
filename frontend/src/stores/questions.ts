import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Question } from '@exameow/shared'
import { api } from '@/api'
import type { BulkInsertResult, SharedQuestion } from '@/api/http'

/**
 * 共享題庫（W6）—— 課程內所有成員見到嘅同一份題目池,存喺 server,
 * 唔再係 `stores/practice.ts` 舊時嗰種一人一份 `localStorage` 題庫。
 *
 * 同 `stores/materials.ts` 一樣用 `courseId -> ...[]` 嘅 map 存,
 * 因為題目本身就係掛住某個課程先有意義。
 */
export const useQuestionsStore = defineStore('questions', () => {
  const byCourse = ref<Record<string, SharedQuestion[]>>({})
  const loading = ref(false)

  async function fetchQuestions(courseId: string) {
    loading.value = true
    try {
      byCourse.value[courseId] = await api.listCourseQuestions(courseId)
    } finally {
      loading.value = false
    }
  }

  /**
   * 生成完之後推入共享題庫。撞咗題幹 hash 嘅重複題會俾 server 用
   * `INSERT OR IGNORE` 拋走 —— `result.duplicates` 話你知拋咗幾多條。
   */
  async function pushGenerated(
    courseId: string,
    questions: Question[],
    materialId: string | null,
  ): Promise<BulkInsertResult> {
    const result = await api.bulkInsertQuestions(courseId, materialId, questions)
    // 唔喺度重砌返個 diff——直接 refetch 一次,保證同 server 嘅去重結果一致
    await fetchQuestions(courseId)
    return result
  }

  /**
   * 🚩 標記／取消標記（W7,toggle）。就地更新 `byCourse` 個 cache,
   * 唔使成個 list 再 refetch 一次。
   */
  async function toggleFlag(courseId: string, questionId: string): Promise<boolean> {
    const result = await api.toggleQuestionFlag(courseId, questionId)
    const q = byCourse.value[courseId]?.find(q => q.id === questionId)
    if (q) {
      q.flagged_by_me = result.flagged
      q.flag_count += result.flagged ? 1 : -1
    }
    return result.flagged
  }

  function reset() {
    byCourse.value = {}
  }

  return { byCourse, loading, fetchQuestions, pushGenerated, toggleFlag, reset }
})
