<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useScreenRecordStore } from '@/stores/screenRecord'

const store = useScreenRecordStore()
const visible = ref(true)

onMounted(async () => {
  const { listen } = await import('@tauri-apps/api/event')
  const { getCurrentWindow } = await import('@tauri-apps/api/window')

  await listen('screen-record:overlay-toggle', () => {
    store.toggleOverlay()
  })

  const unlisten = await listen('screen-record:overlay-visibility', (event: any) => {
    visible.value = event.payload.visible
  })

  const win = getCurrentWindow()
  win.onResized(() => {
    // No-op: keep transparent size
  })
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
