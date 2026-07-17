<script setup lang="ts">
import { onMounted } from 'vue'
import { useScreenRecordStore } from '@/stores/screenRecord'
import { useI18nStore } from '@/stores/i18n'
import {
  ArrowsPointingInIcon,
  ArrowsPointingOutIcon,
  EyeIcon,
  EyeSlashIcon,
  XMarkIcon,
} from '@heroicons/vue/24/outline'

const store = useScreenRecordStore()
const i18n = useI18nStore()

let refreshFn: (() => void) | null = null

onMounted(async () => {
  const { getCurrentWindow } = await import('@tauri-apps/api/window')
  const win = getCurrentWindow()
  win.startDragging()

  const { useScreenRecord } = await import('@/composables/useScreenRecord')
  const { refresh } = useScreenRecord()
  refreshFn = refresh
})

async function handleCollapse() {
  store.setCollapsed(!store.collapsed)
  const { getCurrentWindow, LogicalPosition, LogicalSize } = await import('@tauri-apps/api/window')
  const win = getCurrentWindow()
  if (store.collapsed) {
    const screenWidth = window.screen.width
    await win.setSize(new LogicalSize(48, 48))
    await win.setPosition(new LogicalPosition(screenWidth - 60, window.screen.height - 340))
  } else {
    const screenWidth = window.screen.width
    const screenHeight = window.screen.height
    await win.setSize(new LogicalSize(320, 280))
    await win.setPosition(new LogicalPosition(screenWidth - 340, screenHeight - 320))
  }
}

function handleAdjust() {
  store.toggleOverlay()
}

async function handleExit() {
  const { useScreenRecord } = await import('@/composables/useScreenRecord')
  const { stop } = useScreenRecord()
  await stop()
}

async function handleDoubleTap() {
  if (refreshFn) await refreshFn()
}
</script>

<template>
  <div
    class="h-full flex flex-col select-none"
    style="background: rgb(var(--md-surface)); overflow: hidden;"
    :style="{ borderRadius: store.collapsed ? '24px' : '16px', boxShadow: store.collapsed ? '0 2px 12px rgba(0,0,0,0.12)' : '0 8px 32px rgba(0,0,0,0.18)' }"
  >
    <div
      v-if="store.collapsed"
      class="flex-1 flex items-center justify-center cursor-pointer"
      style="background: rgb(var(--md-primary-container));"
      @click="handleCollapse"
      title="展开"
    >
      <ArrowsPointingOutIcon class="w-5 h-5" style="color: rgb(var(--md-on-primary-container))" />
    </div>

    <template v-else>
      <div
        data-tauri-drag-region
        class="flex items-center justify-between px-3 py-2 shrink-0 cursor-grab active:cursor-grabbing"
        style="background: rgb(var(--md-surface-container-low)); border-bottom: 1px solid rgb(var(--md-outline-variant));"
        @dblclick="handleDoubleTap"
      >
        <span class="text-label-sm font-medium" style="color: rgb(var(--md-on-surface))">
          {{ i18n.t('searchModeScreenRecord') }}
        </span>
        <div class="flex items-center gap-0.5">
          <button
            class="w-7 h-7 rounded-full flex items-center justify-center cursor-pointer hover:opacity-80"
            :style="{ color: 'rgb(var(--md-on-surface-variant))' }"
            @click="handleCollapse"
            :title="i18n.t('searchScreenRecordCollapse')"
          >
            <ArrowsPointingInIcon class="w-4 h-4" />
          </button>
          <button
            class="w-7 h-7 rounded-full flex items-center justify-center cursor-pointer hover:opacity-80"
            :style="{ color: store.overlayVisible ? 'rgb(var(--md-on-surface-variant))' : 'rgb(var(--md-primary))' }"
            @click="handleAdjust"
            :title="store.overlayVisible ? i18n.t('searchScreenRecordAdjust') : '显示录制框'"
          >
            <EyeIcon v-if="store.overlayVisible" class="w-4 h-4" />
            <EyeSlashIcon v-else class="w-4 h-4" />
          </button>
          <button
            class="w-7 h-7 rounded-full flex items-center justify-center cursor-pointer hover:opacity-80"
            style="color: rgb(var(--md-error))"
            @click="handleExit"
            :title="i18n.t('searchScreenRecordExit')"
          >
            <XMarkIcon class="w-4 h-4" />
          </button>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto px-3 py-2.5" @dblclick="handleDoubleTap">
        <div v-if="store.currentResult" class="space-y-2">
          <div
            class="text-title-sm font-bold px-2 py-1 rounded-lg inline-block"
            :style="{
              backgroundColor: 'rgb(var(--md-primary-container))',
              color: 'rgb(var(--md-on-primary-container))',
            }"
          >
            {{ i18n.t('searchScreenRecordAnswer') }}: {{ store.currentResult.question.answer }}
          </div>

          <p
            class="text-body-sm line-clamp-2"
            style="color: rgb(var(--md-on-surface))"
          >
            {{ store.currentResult.question.stem }}
          </p>

          <div
            v-if="store.currentResult.question.options?.length"
            class="grid gap-1 text-body-xs"
            style="color: rgb(var(--md-on-surface-variant))"
          >
            <span
              v-for="(opt, idx) in store.currentResult.question.options"
              :key="idx"
              :class="{
                'font-bold': store.currentResult.question.type !== 'short_answer'
                  && String.fromCharCode(65 + idx) === store.currentResult.question.answer?.trim().toUpperCase(),
              }"
              :style="
                store.currentResult.question.type !== 'short_answer'
                && String.fromCharCode(65 + idx) === store.currentResult.question.answer?.trim().toUpperCase()
                  ? { color: 'rgb(var(--md-primary))' }
                  : {}
              "
            >
              {{ String.fromCharCode(65 + idx) }}. {{ opt }}
            </span>
          </div>

          <p class="text-[10px]" style="color: rgb(var(--md-on-surface-variant))">
            {{ store.currentResult.bankName }}
          </p>
        </div>

        <div v-else class="flex items-center justify-center h-full">
          <p class="text-body-sm" style="color: rgb(var(--md-on-surface-variant))">
            {{ i18n.t('searchScreenRecordNoMatch') }}
          </p>
        </div>
      </div>
    </template>
  </div>
</template>
