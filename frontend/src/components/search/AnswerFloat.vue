<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useScreenRecordStore } from '@/stores/screenRecord'
import { useI18nStore } from '@/stores/i18n'
import {
  ArrowPathIcon,
  ArrowsPointingOutIcon,
  CheckIcon,
  MagnifyingGlassIcon,
  PauseCircleIcon,
  VideoCameraIcon,
  XMarkIcon,
} from '@heroicons/vue/24/outline'
import { PlayIcon } from '@heroicons/vue/24/solid'

const store = useScreenRecordStore()
const i18n = useI18nStore()

const adjusting = ref(true)
const hasBegun = ref(false)
const unlistenFns: Array<() => void> = []

let win: any = null
let ctl: {
  initFloat: () => Promise<void>
  refresh: () => Promise<void>
  adjust: () => Promise<void>
  stop: () => Promise<void>
} | null = null

onMounted(async () => {
  const { getCurrentWindow } = await import('@tauri-apps/api/window')
  const { listen } = await import('@tauri-apps/api/event')
  win = getCurrentWindow()

  const { useScreenRecord } = await import('@/composables/useScreenRecord')
  ctl = useScreenRecord()
  await ctl.initFloat()

  unlistenFns.push(await listen('screen-record:begin', () => {
    adjusting.value = false
    hasBegun.value = true
  }))
})

onUnmounted(() => {
  for (const fn of unlistenFns) fn()
})

function onDragArea(e: MouseEvent) {
  if (e.button !== 0 || !win) return
  win.startDragging().catch(() => {})
}

async function handleRefresh() {
  await ctl?.refresh()
}

async function handleAdjust() {
  adjusting.value = true
  await ctl?.adjust()
}

async function handleExit() {
  await ctl?.stop()
}

async function handleBegin() {
  hasBegun.value = true
  const { emit } = await import('@tauri-apps/api/event')
  await emit('screen-record:request-begin')
}

function isCorrect(idx: number): boolean {
  const r = store.currentResult
  if (!r) return false
  const q = r.question
  if (q.type !== 'single_choice' && q.type !== 'multi_choice') return false
  const letters = (q.answer ?? '').trim().toUpperCase().replace(/[^A-H]/g, '')
  return letters.includes(String.fromCharCode(65 + idx))
}
</script>

<template>
  <div class="w-full h-full select-none" style="padding: 14px;">
    <div class="float-card w-full h-full flex flex-col">
      <div
        class="shrink-0 cursor-grab active:cursor-grabbing"
        @mousedown="onDragArea"
        @dblclick="handleRefresh"
      >
        <div class="flex justify-center pt-2">
          <div class="float-grip" />
        </div>
        <div class="flex items-center justify-between pl-3.5 pr-2 py-1.5">
          <div class="flex items-center gap-1.5 min-w-0">
            <VideoCameraIcon class="w-4 h-4 shrink-0" style="color: var(--accent);" />
            <span class="text-[13px] font-semibold truncate" style="color: var(--fg);">
              {{ i18n.t('searchModeScreenRecord') }}
            </span>
          </div>
          <div class="flex items-center gap-1.5 shrink-0">
            <button
              class="float-btn"
              @mousedown.stop
              @click="handleAdjust"
              :title="i18n.t('searchScreenRecordAdjust')"
            >
              <ArrowsPointingOutIcon class="w-4 h-4" />
            </button>
            <button
              class="float-btn"
              @mousedown.stop
              @click="handleRefresh"
              :title="i18n.t('searchScreenRecordRefresh')"
            >
              <ArrowPathIcon class="w-4 h-4" />
            </button>
            <button
              class="float-btn float-btn-danger"
              @mousedown.stop
              @click="handleExit"
              :title="i18n.t('searchScreenRecordExit')"
            >
              <XMarkIcon class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div v-if="adjusting && hasBegun" class="shrink-0 px-3.5 pb-1.5">
        <div class="float-paused">
          <PauseCircleIcon class="w-3.5 h-3.5 shrink-0" />
          <span class="truncate">{{ i18n.t('searchScreenRecordPaused') }}</span>
        </div>
      </div>

      <div class="float-body flex-1 overflow-y-auto px-3.5 pb-3 min-h-0" @dblclick="handleRefresh">
        <div v-if="adjusting" class="flex flex-col items-center justify-center h-full gap-3">
          <button
            class="float-begin-btn"
            @mousedown.stop
            @click="handleBegin"
          >
            <PlayIcon class="w-6 h-6" />
          </button>
          <div class="text-center">
            <p class="text-[15px] font-semibold" style="color: var(--accent);">
              {{ hasBegun ? i18n.t('searchScreenRecordResume') : i18n.t('searchScreenRecordStart') }}
            </p>
            <p v-if="!hasBegun" class="text-[11px] mt-1" style="color: var(--fg2);">
              先调整录制框，再点击开始
            </p>
          </div>
        </div>

        <div v-else-if="store.currentResult" :key="store.currentResult.question.id" class="space-y-2 pt-0.5">
          <div class="float-answer">
            <CheckIcon class="w-4 h-4 shrink-0" />
            <span class="text-[13px] font-bold">
              {{ i18n.t('searchScreenRecordAnswer') }}: {{ store.currentResult.question.answer }}
            </span>
          </div>

          <p class="text-[13px] leading-snug line-clamp-3" style="color: var(--fg);">
            {{ store.currentResult.question.stem }}
          </p>

          <div v-if="store.currentResult.question.options?.length" class="space-y-1">
            <div
              v-for="(opt, idx) in store.currentResult.question.options"
              :key="idx"
              class="float-option"
              :class="{ 'float-option-correct': isCorrect(idx) }"
            >
              <span class="float-letter" :class="{ 'float-letter-correct': isCorrect(idx) }">
                {{ String.fromCharCode(65 + idx) }}
              </span>
              <span class="truncate text-[12px]">{{ opt }}</span>
            </div>
          </div>

          <p class="text-[10px] pt-0.5 truncate" style="color: var(--fg2);">
            {{ store.currentResult.bankName }}
          </p>
        </div>

        <div v-else class="flex flex-col items-center justify-center h-full gap-2.5">
          <div class="float-empty-icon">
            <MagnifyingGlassIcon class="w-5 h-5" />
          </div>
          <p class="text-[13px]" style="color: var(--fg2);">
            {{ i18n.t('searchScreenRecordNoMatch') }}
          </p>
        </div>
      </div>
    </div>
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
</style>

<style scoped>
.float-card {
  --fg: #1c1c1e;
  --fg2: rgba(60, 60, 67, 0.6);
  --fill: rgba(120, 120, 128, 0.14);
  --accent: #0a84ff;
  background: #ffffff;
  border-radius: 24px;
  box-shadow:
    0 16px 44px rgba(0, 0, 0, 0.16),
    0 2px 10px rgba(0, 0, 0, 0.07);
  overflow: hidden;
}
:global(.dark) .float-card {
  --fg: #f2f2f7;
  --fg2: rgba(235, 235, 245, 0.6);
  --fill: rgba(120, 120, 128, 0.3);
  background: #1c1c1e;
  box-shadow:
    0 16px 44px rgba(0, 0, 0, 0.55),
    0 2px 10px rgba(0, 0, 0, 0.4);
}

.float-grip {
  width: 36px;
  height: 5px;
  border-radius: 999px;
  background: var(--fill);
}

.float-btn {
  width: 28px;
  height: 28px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  cursor: pointer;
  color: var(--fg);
  background: var(--fill);
  transition: filter 0.15s ease, transform 0.1s ease;
}
.float-btn:hover {
  filter: brightness(0.94);
}
.float-btn:active {
  transform: scale(0.88);
}
.float-btn-danger {
  color: #ff3b30;
}

.float-paused {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  color: #ff9500;
  background: rgba(255, 149, 0, 0.12);
}

.float-answer {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 999px;
  color: var(--accent);
  background: rgba(10, 132, 255, 0.12);
  animation: float-pop 0.25s ease;
}

.float-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 8px;
  border-radius: 12px;
  color: var(--fg2);
  background: var(--fill);
}
.float-option-correct {
  color: var(--fg);
  font-weight: 600;
  background: rgba(10, 132, 255, 0.1);
}

.float-letter {
  width: 20px;
  height: 20px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 10px;
  font-weight: 700;
  color: var(--fg2);
  background: rgba(120, 120, 128, 0.18);
}
.float-letter-correct {
  color: #ffffff;
  background: var(--accent);
}

.float-empty-icon {
  width: 44px;
  height: 44px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--fg2);
  background: var(--fill);
}

.float-body::-webkit-scrollbar {
  width: 4px;
}
.float-body::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: var(--fill);
}

@keyframes float-pop {
  from { transform: scale(0.85); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.float-begin-btn {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  color: #ffffff;
  background: var(--accent);
  cursor: pointer;
  box-shadow: 0 6px 20px rgba(10, 132, 255, 0.35);
  transition: transform 0.15s ease, filter 0.15s ease;
}
.float-begin-btn:hover {
  filter: brightness(1.06);
  transform: scale(1.04);
}
.float-begin-btn:active {
  transform: scale(0.96);
}
</style>
