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

  const unlistenResize = await win.onResized(async () => {
    syncRegion()
  })
  unlistenFns.push(unlistenResize)

  const unlistenMove = await win.onMoved(async () => {
    syncRegion()
  })
  unlistenFns.push(unlistenMove)
})

onUnmounted(() => {
  for (const fn of unlistenFns) fn()
})

async function syncRegion() {
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

type ResizeDir = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

function onResizeMouseDown(dir: ResizeDir) {
  return async (e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const { PhysicalPosition, PhysicalSize } = await import('@tauri-apps/api/dpi')

    const factor = await win.scaleFactor()
    const startX = e.screenX * factor
    const startY = e.screenY * factor
    const startPos = await win.outerPosition()
    const startSize = await win.innerSize()
    const minW = 200
    const minH = 100

    function onMove(ev: MouseEvent) {
      const currentX = ev.screenX * factor
      const currentY = ev.screenY * factor
      const dx = currentX - startX
      const dy = currentY - startY

      let newX = startPos.x
      let newY = startPos.y
      let newW = startSize.width
      let newH = startSize.height

      if (dir.includes('e')) { newW = Math.max(minW, startSize.width + dx) }
      if (dir.includes('w')) { newW = Math.max(minW, startSize.width - dx); newX = startPos.x + startSize.width - newW }
      if (dir.includes('s')) { newH = Math.max(minH, startSize.height + dy) }
      if (dir.includes('n')) { newH = Math.max(minH, startSize.height - dy); newY = startPos.y + startSize.height - newH }

      win.setSize(new PhysicalSize(newW, newH))
      win.setPosition(new PhysicalPosition(newX, newY))
    }

    function onUp() {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.removeEventListener('mouseleave', onUp)
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    document.addEventListener('mouseleave', onUp)
  }
}
</script>

<template>
  <div
    v-if="store.overlayVisible"
    class="w-full h-full flex flex-col select-none"
    style="background: transparent; border: 2px solid rgb(103, 80, 164); box-sizing: border-box; box-shadow: 0 0 0 4px rgba(103, 80, 164, 0.15);"
  >
    <div class="flex h-3 shrink-0">
      <div class="w-3 cursor-nwse-resize" style="pointer-events: auto;" @mousedown="onResizeMouseDown('nw')($event)" />
      <div data-tauri-drag-region class="flex-1 cursor-ns-resize" style="pointer-events: auto;" @mousedown="onResizeMouseDown('n')($event)" />
      <div class="w-3 cursor-nesw-resize" style="pointer-events: auto;" @mousedown="onResizeMouseDown('ne')($event)" />
    </div>

    <div class="flex flex-1">
      <div class="w-3 cursor-ew-resize" style="pointer-events: auto;" @mousedown="onResizeMouseDown('w')($event)" />
      <div data-tauri-drag-region class="flex-1" style="pointer-events: none;" />
      <div class="w-3 cursor-ew-resize" style="pointer-events: auto;" @mousedown="onResizeMouseDown('e')($event)" />
    </div>

    <div class="flex h-3 shrink-0">
      <div class="w-3 cursor-nesw-resize" style="pointer-events: auto;" @mousedown="onResizeMouseDown('sw')($event)" />
      <div data-tauri-drag-region class="flex-1 cursor-ns-resize" style="pointer-events: auto;" @mousedown="onResizeMouseDown('s')($event)" />
      <div class="w-3 cursor-nwse-resize" style="pointer-events: auto;" @mousedown="onResizeMouseDown('se')($event)" />
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
