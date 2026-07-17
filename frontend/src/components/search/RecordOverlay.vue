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

  ;(window as any).__overlayWin = win
})

onUnmounted(() => {
  for (const fn of unlistenFns) fn()
})

type Dir = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

const RESIZE_CURSORS: Record<Dir, string> = {
  n: 'ns-resize', s: 'ns-resize',
  e: 'ew-resize', w: 'ew-resize',
  ne: 'nesw-resize', nw: 'nwse-resize',
  se: 'nwse-resize', sw: 'nesw-resize',
}

function resize(dir: Dir) {
  const w = (window as any).__overlayWin
  if (!w) return
  w.startResizeDragging(dir).catch(() => {})
}
</script>

<template>
  <div v-if="store.overlayVisible" class="w-full h-full relative" style="background: transparent;">
    <div
      data-tauri-drag-region
      class="absolute inset-0 pointer-events-none"
      style="border: 2px solid rgb(103, 80, 164); box-sizing: border-box; box-shadow: 0 0 0 4px rgba(103, 80, 164, 0.1);"
    />

    <div class="absolute top-0 left-4 right-4 h-3 cursor-ns-resize" style="pointer-events: auto;" @mousedown="resize('n')" />
    <div class="absolute bottom-0 left-4 right-4 h-3 cursor-ns-resize" style="pointer-events: auto;" @mousedown="resize('s')" />
    <div class="absolute left-0 top-4 bottom-4 w-3 cursor-ew-resize" style="pointer-events: auto;" @mousedown="resize('w')" />
    <div class="absolute right-0 top-4 bottom-4 w-3 cursor-ew-resize" style="pointer-events: auto;" @mousedown="resize('e')" />

    <div class="absolute top-0 left-0 w-5 h-5 cursor-nwse-resize" style="pointer-events: auto;" @mousedown="resize('nw')" />
    <div class="absolute top-0 right-0 w-5 h-5 cursor-nesw-resize" style="pointer-events: auto;" @mousedown="resize('ne')" />
    <div class="absolute bottom-0 left-0 w-5 h-5 cursor-nesw-resize" style="pointer-events: auto;" @mousedown="resize('sw')" />
    <div class="absolute bottom-0 right-0 w-5 h-5 cursor-nwse-resize" style="pointer-events: auto;" @mousedown="resize('se')" />
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
}
</style>
