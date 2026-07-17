<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useScreenRecordStore } from '@/stores/screenRecord'

const store = useScreenRecordStore()
const unlistenFns: Array<() => void> = []

let win: any = null

onMounted(async () => {
  const { getCurrentWindow } = await import('@tauri-apps/api/window')
  const { listen } = await import('@tauri-apps/api/event')
  win = getCurrentWindow()

  const unlistenToggle = await listen('screen-record:overlay-toggle', () => {
    store.toggleOverlay()
  })
  unlistenFns.push(unlistenToggle)

  syncRegion()
})

onUnmounted(() => {
  for (const fn of unlistenFns) fn()
})

async function syncRegion() {
  if (!win) return
  const factor = await win.scaleFactor()
  const size = await win.innerSize()
  const pos = await win.outerPosition()
  store.setRegion({
    x: Math.round(pos.x * factor),
    y: Math.round(pos.y * factor),
    w: Math.round(size.width * factor),
    h: Math.round(size.height * factor),
  })
}

async function onPointerDown(e: PointerEvent) {
  const { getCurrentWindow } = await import('@tauri-apps/api/window')
  const w = getCurrentWindow()
  w.startDragging()
}
</script>

<template>
  <div
    v-if="store.overlayVisible"
    data-tauri-drag-region
    class="w-full h-full select-none"
    style="background: transparent; border: 2px solid rgb(103, 80, 164); box-sizing: border-box; box-shadow: 0 0 0 4px rgba(103, 80, 164, 0.12);"
    @pointerdown="onPointerDown"
    @pointerup="syncRegion"
  />
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
}
</style>
