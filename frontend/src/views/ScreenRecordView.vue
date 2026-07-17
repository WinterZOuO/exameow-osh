<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useI18nStore } from '@/stores/i18n'
import { useScreenRecordStore } from '@/stores/screenRecord'
import { isDesktopTauri, isMobileDevice, isTauri } from '@/utils/platform'
import { VideoCameraIcon, ArrowLeftIcon } from '@heroicons/vue/24/outline'

const router = useRouter()
const i18n = useI18nStore()
const store = useScreenRecordStore()

const isTauriMobile = isTauri() && isMobileDevice()
const supported = isDesktopTauri() || isTauriMobile

async function startRecording() {
  console.log('[ScreenRecordView] startRecording called')
  store.startRecording()
  try {
    const { useScreenRecord } = await import('@/composables/useScreenRecord')
    const { start } = useScreenRecord()
    await start()
    console.log('[ScreenRecordView] start succeeded')
  } catch (e) {
    console.error('[ScreenRecordView] start failed:', e)
    alert('启动录屏失败: ' + (e instanceof Error ? e.message : String(e)))
  }
}

function goBack() {
  router.push('/search')
}
</script>

<template>
  <div>
    <button
      class="card-filled w-fit px-4 py-2 flex items-center gap-2 mb-5 transition-all duration-200 cursor-pointer hover:shadow-md"
      style="color: rgb(var(--md-on-surface-variant))"
      @click="goBack"
    >
      <ArrowLeftIcon class="w-5 h-5" />
      <span class="text-body-md">{{ i18n.t('btnBack') }}</span>
    </button>

    <div v-if="!supported" class="card-filled p-6 text-center">
      <VideoCameraIcon class="w-12 h-12 mx-auto mb-3" style="color: rgb(var(--md-on-surface-variant))" />
      <p class="text-title-md mb-2">{{ i18n.t('searchModeScreenRecord') }}</p>
      <p class="text-body-md" style="color: rgb(var(--md-on-surface-variant))">
        {{ i18n.t('searchScreenRecordNotSupported') }}
      </p>
    </div>

    <template v-else>
      <h1 class="text-display-sm mb-1">{{ i18n.t('searchModeScreenRecord') }}</h1>
      <p class="text-body-lg mb-6" style="color: rgb(var(--md-on-surface-variant))">
        {{ i18n.t('searchScreenRecordDesc') }}
      </p>

      <div class="card-filled p-6 flex flex-col items-center gap-4">
        <VideoCameraIcon class="w-16 h-16" style="color: rgb(var(--md-primary))" />
        <button
          class="px-8 py-3 rounded-full text-title-md font-medium transition-all duration-200 cursor-pointer"
          :style="{
            backgroundColor: 'rgb(var(--md-primary))',
            color: 'rgb(var(--md-on-primary))',
          }"
          @click="startRecording"
        >
          {{ i18n.t('searchScreenRecordStart') }}
        </button>
        <p class="text-body-sm" style="color: rgb(var(--md-on-surface-variant))">
          {{ i18n.t('searchScreenRecordRefresh') }}
        </p>
      </div>
    </template>
  </div>
</template>
