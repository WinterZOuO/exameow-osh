<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useScreenRecordStore } from '@/stores/screenRecord'

const store = useScreenRecordStore()
const visible = ref(true)

const unlistenFns: Array<() => void> = []

onMounted(async () => {
  const { listen } = await import('@tauri-apps/api/event')

  const unlisten1 = await listen('screen-record:overlay-toggle', () => {
    store.toggleOverlay()
  })
  unlistenFns.push(unlisten1)

  const unlisten2 = await listen('screen-record:overlay-visibility', (event: any) => {
    visible.value = event.payload.visible
  })
  unlistenFns.push(unlisten2)
})

onUnmounted(() => {
  for (const fn of unlistenFns) fn()
})
</script>

<template>
  <div
    v-if="visible"
    class="w-full h-full rounded-lg border-2 pointer-events-none"
    style="border-color: rgb(var(--md-primary)); background: rgba(var(--md-primary), 0.08);"
  >
  </div>
  <div v-else class="w-full h-full" />
</template>
