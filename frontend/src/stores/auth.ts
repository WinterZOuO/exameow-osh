import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface CurrentUser {
  id: string
  username: string
  role: string
}

const BASE_URL = import.meta.env.VITE_API_URL || ''

export const useAuthStore = defineStore('auth', () => {
  const user = ref<CurrentUser | null>(null)
  /** 已經同 server 確認過未 —— router guard 靠佢避免每次導航都問一次 */
  const checked = ref(false)

  const isAuthenticated = computed(() => user.value !== null)
  const isAdmin = computed(() => user.value?.role === 'admin')

  async function fetchMe(): Promise<boolean> {
    try {
      const res = await fetch(`${BASE_URL}/api/auth/me`, { credentials: 'include' })
      user.value = res.ok ? await res.json() : null
    } catch {
      user.value = null
    }
    checked.value = true
    return user.value !== null
  }

  async function login(username: string, password: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, password }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}) as { error?: string })
      throw new Error(body.error || `HTTP ${res.status}`)
    }
    user.value = await res.json()
    checked.value = true
  }

  async function logout(): Promise<void> {
    try {
      await fetch(`${BASE_URL}/api/auth/logout`, { method: 'POST', credentials: 'include' })
    } catch {
      /* 就算 server 唔通都照清本地狀態 */
    }
    user.value = null
    checked.value = true
  }

  /** 任何 API 回 401 時由 http 層叫，令 guard 下次導航會重新驗證 */
  function markLoggedOut() {
    user.value = null
    checked.value = true
  }

  return { user, checked, isAuthenticated, isAdmin, fetchMe, login, logout, markLoggedOut }
})
