<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useI18nStore } from '@/stores/i18n'
import { PlayIcon } from '@heroicons/vue/24/solid'

const i18n = useI18nStore()
const unlistenFns: Array<() => void> = []

let win: any = null
const begun = ref(false)

type Dir = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

const MIN_W = 240
const MIN_H = 120

interface ResizeState {
  dir: Dir
  startX: number
  startY: number
  x: number
  y: number
  w: number
  h: number
}

let rs: ResizeState | null = null
let resizeRaf = 0

async function beginResize(dir: Dir, e: MouseEvent) {
  if (e.button !== 0 || !win) return
  e.preventDefault()
  try {
    const sf = await win.scaleFactor()
    const pos = (await win.outerPosition()).toLogical(sf)
    const size = (await win.innerSize()).toLogical(sf)
    rs = { dir, startX: e.screenX, startY: e.screenY, x: pos.x, y: pos.y, w: size.width, h: size.height }
    window.addEventListener('mousemove', onResizeMove)
    window.addEventListener('mouseup', endResize, { once: true })
  } catch { /* window not ready */ }
}

function onResizeMove(e: MouseEvent) {
  if (!rs || resizeRaf) return
  const dx = e.screenX - rs.startX
  const dy = e.screenY - rs.startY
  resizeRaf = requestAnimationFrame(() => {
    resizeRaf = 0
    if (!rs) return
    const { dir } = rs
    let { x, y } = rs
    let w = rs.w
    let h = rs.h
    if (dir.includes('e')) w = Math.max(MIN_W, rs.w + dx)
    if (dir.includes('s')) h = Math.max(MIN_H, rs.h + dy)
    if (dir.includes('w')) {
      w = Math.max(MIN_W, rs.w - dx)
      x = rs.x + rs.w - w
    }
    if (dir.includes('n')) {
      h = Math.max(MIN_H, rs.h - dy)
      y = rs.y + rs.h - h
    }
    void applyGeometry(x, y, w, h, dir)
  })
}

async function applyGeometry(x: number, y: number, w: number, h: number, dir: Dir) {
  if (!win) return
  try {
    const { LogicalPosition, LogicalSize } = await import('@tauri-apps/api/dpi')
    if (dir.includes('w') || dir.includes('n')) {
      await win.setPosition(new LogicalPosition(Math.round(x), Math.round(y)))
    }
    await win.setSize(new LogicalSize(Math.round(w), Math.round(h)))
  } catch { /* ignore transient resize errors */ }
}

function endResize() {
  window.removeEventListener('mousemove', onResizeMove)
  if (resizeRaf) {
    cancelAnimationFrame(resizeRaf)
    resizeRaf = 0
  }
  rs = null
}

function drag(e: MouseEvent) {
  if (e.button !== 0 || !win) return
  win.startDragging().catch(() => {})
}

async function handleBegin() {
  if (!win) return
  try {
    const [pos, size] = await Promise.all([win.outerPosition(), win.innerSize()])
    const { emit } = await import('@tauri-apps/api/event')
    await emit('screen-record:begin', { x: pos.x, y: pos.y, w: size.width, h: size.height })
    begun.value = true
    await win.hide()
  } catch { /* ignore */ }
}

onMounted(async () => {
  const { getCurrentWindow } = await import('@tauri-apps/api/window')
  const { listen } = await import('@tauri-apps/api/event')
  win = getCurrentWindow()

  unlistenFns.push(await listen('screen-record:adjust', async () => {
    try {
      await win.show()
      await win.setFocus()
    } catch { /* ignore */ }
  }))
})

onUnmounted(() => {
  endResize()
  for (const fn of unlistenFns) fn()
})
</script>

<template>
  <div class="w-full h-full relative" style="cursor: move;" @mousedown="drag">
    <div class="absolute overlay-frame pointer-events-none" />

    <div class="overlay-grip absolute left-1/2 -translate-x-1/2" style="top: 6px; width: 36px; height: 5px;" />
    <div class="overlay-grip absolute left-1/2 -translate-x-1/2" style="bottom: 6px; width: 36px; height: 5px;" />
    <div class="overlay-grip absolute top-1/2 -translate-y-1/2" style="left: 6px; width: 5px; height: 36px;" />
    <div class="overlay-grip absolute top-1/2 -translate-y-1/2" style="right: 6px; width: 5px; height: 36px;" />

    <div class="overlay-corner" style="top: 4px; left: 4px;" />
    <div class="overlay-corner" style="top: 4px; right: 4px;" />
    <div class="overlay-corner" style="bottom: 4px; left: 4px;" />
    <div class="overlay-corner" style="bottom: 4px; right: 4px;" />

    <div class="absolute inset-x-0 top-0 flex justify-center pt-5 pointer-events-none">
      <span class="overlay-tip">{{ i18n.t('searchScreenRecordAdjustHint') }}</span>
    </div>

    <div class="absolute inset-x-0 bottom-0 flex justify-center pb-5 pointer-events-none">
      <button
        class="overlay-begin pointer-events-auto"
        @mousedown.stop
        @click="handleBegin"
      >
        <PlayIcon class="w-4 h-4" />
        {{ begun ? i18n.t('searchScreenRecordResume') : i18n.t('searchScreenRecordStart') }}
      </button>
    </div>

    <div class="absolute top-0 left-8 right-8 h-4 cursor-ns-resize" @mousedown.stop="beginResize('n', $event)" />
    <div class="absolute bottom-0 left-8 right-8 h-4 cursor-ns-resize" @mousedown.stop="beginResize('s', $event)" />
    <div class="absolute left-0 top-8 bottom-8 w-4 cursor-ew-resize" @mousedown.stop="beginResize('w', $event)" />
    <div class="absolute right-0 top-8 bottom-8 w-4 cursor-ew-resize" @mousedown.stop="beginResize('e', $event)" />

    <div class="absolute top-0 left-0 w-7 h-7 cursor-nwse-resize" @mousedown.stop="beginResize('nw', $event)" />
    <div class="absolute top-0 right-0 w-7 h-7 cursor-nesw-resize" @mousedown.stop="beginResize('ne', $event)" />
    <div class="absolute bottom-0 left-0 w-7 h-7 cursor-nesw-resize" @mousedown.stop="beginResize('sw', $event)" />
    <div class="absolute bottom-0 right-0 w-7 h-7 cursor-nwse-resize" @mousedown.stop="beginResize('se', $event)" />
  </div>
</template>

<style>
html, body, #app {
  width: 100%;
  height: 100%;
  background: transparent !important;
  margin: 0;
  padding: 0;
  overflow: hidden;
}

.overlay-frame {
  inset: 3px;
  border-radius: 16px;
  border: 2px solid rgb(255 255 255);
  background: rgba(0 0 0 / 0.04);
  box-shadow:
    0 0 0 1px rgba(0 0 0 / 0.3),
    inset 0 0 0 1px rgba(0 0 0 / 0.3);
}

.overlay-grip {
  position: absolute;
  border-radius: 999px;
  background: rgb(255 255 255);
  box-shadow: 0 0 0 1px rgba(0 0 0 / 0.35), 0 1px 4px rgba(0 0 0 / 0.3);
  pointer-events: none;
}

.overlay-corner {
  position: absolute;
  width: 14px;
  height: 14px;
  border-radius: 999px;
  background: rgb(255 255 255);
  box-shadow: 0 0 0 1px rgba(0 0 0 / 0.35), 0 1px 4px rgba(0 0 0 / 0.3);
  pointer-events: none;
}

.overlay-tip {
  font-size: 11px;
  line-height: 1;
  padding: 7px 12px;
  border-radius: 999px;
  color: rgb(255 255 255);
  background: rgba(0 0 0 / 0.62);
  white-space: nowrap;
}

.overlay-begin {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 18px;
  border-radius: 999px;
  border: none;
  font-size: 13px;
  font-weight: 600;
  color: rgb(255 255 255);
  background: rgb(var(--md-primary));
  cursor: pointer;
  box-shadow: 0 2px 10px rgba(0 0 0 / 0.35);
  transition: transform 0.15s ease, filter 0.15s ease;
}
.overlay-begin:hover {
  filter: brightness(1.08);
  transform: scale(1.04);
}
.overlay-begin:active {
  transform: scale(0.96);
}
</style>
