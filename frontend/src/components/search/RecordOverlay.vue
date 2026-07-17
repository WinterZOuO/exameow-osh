<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useScreenRecordStore } from '@/stores/screenRecord'

const store = useScreenRecordStore()
const visible = ref(true)

const unlistenFns: Array<() => void> = []

onMounted(async () => {
  const { listen } = await import('@tauri-apps/api/event')
  const { getCurrentWindow } = await import('@tauri-apps/api/window')

  const win = getCurrentWindow()

  const unlistenResize = await win.onResized(async () => {
    const factor = await win.scaleFactor()
    const size = await win.innerSize()
    const pos = await win.outerPosition()
    store.setRegion({
      x: Math.round(pos.x * factor),
      y: Math.round(pos.y * factor),
      w: Math.round(size.width * factor),
      h: Math.round(size.height * factor),
    })
  })
  unlistenFns.push(unlistenResize)

  const unlistenMove = await win.onMoved(async () => {
    const factor = await win.scaleFactor()
    const pos = await win.outerPosition()
    const size = await win.innerSize()
    store.setRegion({
      x: Math.round(pos.x * factor),
      y: Math.round(pos.y * factor),
      w: Math.round(size.width * factor),
      h: Math.round(size.height * factor),
    })
  })
  unlistenFns.push(unlistenMove)

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
  <div v-if="visible" class="w-full h-full flex flex-col">
    <div
      data-tauri-drag-region
      class="h-6 w-full shrink-0 cursor-grab active:cursor-grabbing"
      style="background: transparent;"
    />

    <div data-tauri-drag-region class="flex-1 flex pointer-events-none">
      <div
        class="w-2 h-full shrink-0"
        style="cursor: col-resize; pointer-events: auto;"
      />

      <div class="flex-1 pointer-events-none" />

      <div
        class="w-2 h-full shrink-0"
        style="cursor: col-resize; pointer-events: auto;"
      />
    </div>

    <div
      data-tauri-drag-region
      class="h-6 w-full shrink-0 cursor-grab active:cursor-grabbing flex items-end justify-center"
      style="background: transparent;"
    >
      <div
        class="h-2 w-2"
        style="cursor: nwse-resize; pointer-events: auto;"
      />
    </div>
  </div>
  <div v-else class="w-full h-full" />
</template>

<style>
html, body, #app {
  background: transparent !important;
}

body {
  margin: 0;
  padding: 0;
  overflow: hidden;
  border: 2px solid rgb(103, 80, 164) !important;
  box-sizing: border-box;
  box-shadow: inset 0 0 0 1px rgba(103, 80, 164, 0.4);
}
</style>
