<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useConfigStore } from '@/stores/config'
import AppShell from '@/components/layout/AppShell.vue'

const route = useRoute()
const auth = useAuthStore()
const configStore = useConfigStore()

// 登入頁唔應該有底部導航同 header
const isPublicRoute = computed(() => route.meta.public === true)

// 登入之後先至攞 AI 設定 —— 未登入嗰陣 /api/config/load 會 401
watch(
  () => auth.isAuthenticated,
  async (ok) => {
    if (ok) await configStore.loadSaved()
  },
  { immediate: true },
)
</script>

<template>
  <RouterView v-if="isPublicRoute" />
  <AppShell v-else />
</template>
