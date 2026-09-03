import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '@/api'
import type { MaterialSummary } from '@/api/http'

/**
 * 教材（W5）。同 `stores/courses.ts` 唔同，教材淨係喺某個課程入面先有意義，
 * 所以用 `courseId -> MaterialSummary[]` 嘅 map 存，唔係單一扁平陣列。
 *
 * 同 `stores/courses.ts` 一樣要留意登出/換用戶嘅 cache 問題 —— 呢個 store 亦
 * 要喺 `App.vue` 嘅登出 watcher 度 `reset()`，唔係嘅話換咗第二個用戶
 * 都可能短暫閃返舊用戶睇過嘅教材列表。
 */
export const useMaterialsStore = defineStore('materials', () => {
  const byCourse = ref<Record<string, MaterialSummary[]>>({})
  const loading = ref(false)

  async function fetchMaterials(courseId: string) {
    loading.value = true
    try {
      byCourse.value[courseId] = await api.listMaterials(courseId)
    } finally {
      loading.value = false
    }
  }

  async function uploadMaterial(courseId: string, file: File): Promise<MaterialSummary> {
    const material = await api.uploadMaterial(courseId, file)
    const list = byCourse.value[courseId] ?? []
    // 幂等上傳（同一份內容再上傳一次）會攞返同一個 id —— 更新嗰行,唔好推重複
    const idx = list.findIndex((m) => m.id === material.id)
    if (idx === -1) byCourse.value[courseId] = [material, ...list]
    else byCourse.value[courseId] = [...list.slice(0, idx), material, ...list.slice(idx + 1)]
    return material
  }

  async function deleteMaterial(courseId: string, id: string) {
    await api.deleteMaterial(id)
    byCourse.value[courseId] = (byCourse.value[courseId] ?? []).filter((m) => m.id !== id)
  }

  /** 登出時要叫呢個 —— 理由同 `stores/courses.ts` 嘅 `reset()` 一樣 */
  function reset() {
    byCourse.value = {}
  }

  return { byCourse, loading, fetchMaterials, uploadMaterial, deleteMaterial, reset }
})
