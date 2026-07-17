<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useScreenRecordStore } from '@/stores/screenRecord'

const store = useScreenRecordStore()

const unlistenFns: Array<() => void> = []

let win: any = null

onMounted(async () => {
  const { getCurrentWindow } = await import('@tauri-apps/api/window')
  win = getCurrentWindow()

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
})

onUnmounted(() => {
  for (const fn of unlistenFns) fn()
})

function onResizeMouseDown(dir: string) {
  return (e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (win) win.startResizeDragging(dir)
  }
}
</script>

<template>
  <div
    v-if="store.overlayVisible"
    class="w-full h-full flex flex-col select-none"
    style="background: transparent; border: 2px solid rgb(103, 80, 164); box-sizing: border-box; box-shadow: inset 0 0 0 1px rgba(103, 80, 164, 0.3);"
  >
    <div class="flex h-4 shrink-0">
      <div class="w-4 cursor-nwse-resize" style="pointer-events: auto;" @mousedown="onResizeMouseDown('NorthWest')($event)" />
      <div data-tauri-drag-region class="flex-1 cursor-ns-resize" style="pointer-events: auto;" @mousedown="onResizeMouseDown('North')($event)" />
      <div class="w-4 cursor-nesw-resize" style="pointer-events: auto;" @mousedown="onResizeMouseDown('NorthEast')($event)" />
    </div>

    <div class="flex flex-1">
      <div class="w-4 cursor-ew-resize" style="pointer-events: auto;" @mousedown="onResizeMouseDown('West')($event)" />
      <div data-tauri-drag-region class="flex-1 pointer-events-none" />
      <div class="w-4 cursor-ew-resize" style="pointer-events: auto;" @mousedown="onResizeMouseDown('East')($event)" />
    </div>

    <div class="flex h-4 shrink-0">
      <div class="w-4 cursor-nesw-resize" style="pointer-events: auto;" @mousedown="onResizeMouseDown('SouthWest')($event)" />
      <div data-tauri-drag-region class="flex-1 cursor-ns-resize" style="pointer-events: auto;" @mousedown="onResizeMouseDown('South')($event)" />
      <div class="w-4 cursor-nwse-resize" style="pointer-events: auto;" @mousedown="onResizeMouseDown('SouthEast')($event)" />
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
}
</style>
