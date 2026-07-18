<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, ref } from 'vue'
import { useConfigStore } from '@/stores/config'
import AppShell from '@/components/layout/AppShell.vue'

const configStore = useConfigStore()

const childWindow = ref<string | null>(null)

function detectChildWindow() {
  const hash = window.location.hash
  if (hash === '#/src-windows/record-overlay') return 'record-overlay'
  if (hash === '#/src-windows/answer-float') return 'answer-float'
  return null
}

childWindow.value = detectChildWindow()

const childComponent = computed(() => {
  if (childWindow.value === 'record-overlay') {
    return defineAsyncComponent(() => import('@/components/search/RecordOverlay.vue'))
  }
  if (childWindow.value === 'answer-float') {
    return defineAsyncComponent(() => import('@/components/search/AnswerFloat.vue'))
  }
  return null
})

onMounted(async () => {
  if (childWindow.value) {
    const theme = localStorage.getItem('exameow-theme') || 'system'
    const dark = theme === 'dark'
      || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    document.documentElement.classList.toggle('dark', dark)
    return
  }
  await configStore.loadSaved()
})
</script>

<template>
  <AppShell v-if="!childWindow" />
  <component v-else :is="childComponent" />
</template>
