<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useConfigStore } from '@/stores/config'
import { useCoursesStore } from '@/stores/courses'
import AppShell from '@/components/layout/AppShell.vue'

const route = useRoute()
const auth = useAuthStore()
const configStore = useConfigStore()
const coursesStore = useCoursesStore()

// 登入頁唔應該有底部導航同 header
const isPublicRoute = computed(() => route.meta.public === true)

// 登入之後先至攞 AI 設定 —— 未登入嗰陣 /api/config/load 會 401。
// 登出就清走課程 cache —— 唔清嘅話，同一個分頁換第二個用戶登入,
// 日後用 store 嘅 `loaded` cache（例如 `ensureLoaded()`）嗰啲頁
// 會短暫閃返舊用戶嘅課程列表
watch(
  () => auth.isAuthenticated,
  async (ok) => {
    if (ok) {
      await configStore.loadSaved()
    } else {
      coursesStore.reset()
    }
  },
  { immediate: true },
)
</script>

<template>
  <RouterView v-if="isPublicRoute" />
  <AppShell v-else />
</template>
