import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '@/api'
import type { CourseDetail, CourseSummary } from '@/api/http'

/**
 * 課程列表同詳情（W4）。
 *
 * 呢個 store 淨係管「我加入咗邊啲課程」呢件事 —— 教材上傳、共享題庫
 * 分別留返 W5 / W6 先綁上嚟。
 */
export const useCoursesStore = defineStore('courses', () => {
  const courses = ref<CourseSummary[]>([])
  const loaded = ref(false)
  const loading = ref(false)

  async function fetchCourses() {
    loading.value = true
    try {
      courses.value = await api.listCourses()
      loaded.value = true
    } finally {
      loading.value = false
    }
  }

  async function ensureLoaded() {
    if (!loaded.value) await fetchCourses()
  }

  async function createCourse(code: string, title: string): Promise<CourseSummary> {
    const course = await api.createCourse(code, title)
    courses.value = [course, ...courses.value]
    return course
  }

  async function joinCourse(joinCode: string): Promise<CourseSummary> {
    const course = await api.joinCourse(joinCode)
    // 幂等：已經係成員嘅話唔好推重複
    const idx = courses.value.findIndex(c => c.id === course.id)
    if (idx === -1) courses.value = [course, ...courses.value]
    else courses.value[idx] = course
    return course
  }

  async function getCourse(id: string): Promise<CourseDetail> {
    return api.getCourse(id)
  }

  async function leaveCourse(id: string) {
    await api.leaveCourse(id)
    courses.value = courses.value.filter(c => c.id !== id)
  }

  async function deleteCourse(id: string) {
    await api.deleteCourse(id)
    courses.value = courses.value.filter(c => c.id !== id)
  }

  /** 登出時要叫呢個 —— 唔清嘅話下一個喺同一個分頁登入嘅人會靠 `ensureLoaded()`
   *  嘅 cache 短暫見到上一個用戶嘅課程列表 */
  function reset() {
    courses.value = []
    loaded.value = false
  }

  return { courses, loaded, loading, fetchCourses, ensureLoaded, createCourse, joinCourse, getCourse, leaveCourse, deleteCourse, reset }
})
