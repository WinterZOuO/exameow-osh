<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18nStore } from '@/stores/i18n'
import { useTheme, type Theme } from '@/composables/useTheme'
import { useDesktopUpdater } from '@/composables/useDesktopUpdater'
import { isTauri, isMobileDevice, isDesktopTauri } from '@/utils/platform'
import BaseSelect from '@/components/common/BaseSelect.vue'
import {
  ArrowLeftIcon,
  LanguageIcon,
  SunIcon,
  ArrowPathIcon,
} from '@heroicons/vue/24/outline'

const router = useRouter()
const i18n = useI18nStore()
const { theme, setTheme } = useTheme()
const version = import.meta.env.VITE_APP_VERSION

const themeOptions: { value: Theme; key: 'themeSystem' | 'themeLight' | 'themeDark' }[] = [
  { value: 'system', key: 'themeSystem' },
  { value: 'light', key: 'themeLight' },
  { value: 'dark', key: 'themeDark' },
]

// Mobile OTA
const showOta = isTauri() && isMobileDevice()
const otaBundle = ref('')
const otaMessage = ref('')
const otaBusy = ref(false)

// Desktop updater
const showDesktopUpdate = isDesktopTauri()
const updater = useDesktopUpdater()

onMounted(async () => {
  if (!showOta) return
  try {
    const { tauriApi } = await import('@/api/bridge')
    const cur = await tauriApi.otaCurrent()
    otaBundle.value = cur.status === 'ota' && cur.version ? `v${cur.version}` : i18n.t('otaBuiltin')
  } catch {}
})

async function handleOtaCheck() {
  if (otaBusy.value) return
  otaBusy.value = true
  otaMessage.value = i18n.t('otaChecking')
  try {
    const { tauriApi } = await import('@/api/bridge')
    const r = await tauriApi.otaDownload()
    if (r.status === 'staged' || r.status === 'alreadyStaged') {
      otaMessage.value = i18n.t('otaStaged', { version: r.version ?? '' })
    } else if (r.status === 'shellTooOld') {
      otaMessage.value = i18n.t('otaShellTooOld', { version: r.version ?? '' })
    } else if (r.status === 'upToDate' || r.status === 'downloading') {
      otaMessage.value = i18n.t('otaUpToDate')
    } else {
      otaMessage.value = i18n.t('otaFailed') + (r.error ? `: ${r.error}` : '')
    }
  } catch (e: any) {
    otaMessage.value = i18n.t('otaFailed') + ': ' + (e?.message ?? String(e))
  } finally {
    otaBusy.value = false
  }
}
</script>

<template>
  <div>
    <div class="flex items-center gap-2 mb-6">
      <button class="btn-icon" @click="router.push('/mine')">
        <ArrowLeftIcon class="w-5 h-5" />
      </button>
      <h1 class="text-display-sm">{{ i18n.t('settingsTitle') }}</h1>
    </div>

    <!-- Language -->
    <div class="card-filled p-5 mb-4">
      <label class="text-label-md flex items-center justify-center gap-1.5 mb-4" style="color: rgb(var(--md-on-surface-variant))">
        <LanguageIcon class="w-4 h-4" />
        {{ i18n.t('settingsLanguage') }}
      </label>
      <div class="max-w-[240px] mx-auto">
        <BaseSelect
          :model-value="i18n.locale"
          :options="[{ value: 'zh', label: '中文' }, { value: 'en', label: 'English' }]"
          @update:model-value="i18n.locale !== $event && i18n.toggle()"
        />
      </div>
    </div>

    <!-- Theme -->
    <div class="card-filled p-5 mb-4">
      <label class="text-label-md flex items-center justify-center gap-1.5 mb-4" style="color: rgb(var(--md-on-surface-variant))">
        <SunIcon class="w-4 h-4" />
        {{ i18n.t('settingsTheme') }}
      </label>
      <div class="max-w-[240px] mx-auto">
        <BaseSelect
          :model-value="theme"
          :options="themeOptions.map(o => ({ value: o.value, label: i18n.t(o.key) }))"
          @update:model-value="setTheme($event)"
        />
      </div>
    </div>

    <!-- Version update -->
    <div v-if="showDesktopUpdate || showOta" class="card-filled p-5 mb-4 text-center">
      <label class="text-label-md flex items-center justify-center gap-1.5 mb-1" style="color: rgb(var(--md-on-surface-variant))">
        <ArrowPathIcon class="w-4 h-4" />
        {{ i18n.t('settingsUpdate') }}
      </label>
      <p class="text-body-sm mb-4" style="color: rgb(var(--md-on-surface-variant))">
        {{ i18n.t('settingsCurrentVersion') }}: v{{ version }}<template v-if="showOta && otaBundle"> · {{ i18n.t('otaCurrentBundle') }}: {{ otaBundle }}</template>
      </p>

      <!-- Desktop -->
      <div v-if="showDesktopUpdate" class="flex flex-col items-center gap-3">
        <div class="flex items-center justify-center gap-3">
          <button
            class="btn-outlined text-sm !px-5"
            :disabled="updater.stage.value === 'downloading'"
            @click="updater.checkForUpdate(true)"
          >
            <ArrowPathIcon class="w-4 h-4" />
            {{ i18n.t('updateCheckBtn') }}
          </button>
          <button
            v-if="updater.stage.value === 'available'"
            class="btn-filled text-sm !px-5"
            @click="updater.startUpdate"
          >
            {{ i18n.t('updateNow') }}
          </button>
          <button
            v-else-if="updater.stage.value === 'ready'"
            class="btn-filled text-sm !px-5"
            @click="updater.restart"
          >
            {{ i18n.t('updateRestart') }}
          </button>
        </div>
        <div class="text-body-sm" style="color: rgb(var(--md-on-surface-variant))">
          <template v-if="updater.stage.value === 'available'">
            {{ i18n.t('updateAvailableTitle', { version: updater.version.value }) }}
          </template>
          <template v-else-if="updater.stage.value === 'downloading'">
            {{ i18n.t('updateDownloading') }} {{ updater.progress.value }}%
          </template>
          <template v-else-if="updater.stage.value === 'ready'">{{ i18n.t('updateReady') }}</template>
          <template v-else-if="updater.stage.value === 'upToDate'">{{ i18n.t('updateUpToDate') }}</template>
          <template v-else-if="updater.stage.value === 'failed'">
            <span style="color: rgb(var(--md-error))">{{ i18n.t('updateFailed') }}</span>
            <span v-if="updater.error.value" class="block text-xs mt-1 break-all">{{ updater.error.value }}</span>
          </template>
        </div>
      </div>

      <!-- Mobile OTA -->
      <div v-else-if="showOta" class="flex flex-col items-center gap-3">
        <button class="btn-outlined text-sm !px-5" :disabled="otaBusy" @click="handleOtaCheck">
          <ArrowPathIcon class="w-4 h-4" />
          {{ i18n.t('otaCheckUpdate') }}
        </button>
        <p v-if="otaMessage" class="text-body-sm" style="color: rgb(var(--md-on-surface-variant))">{{ otaMessage }}</p>
      </div>
    </div>
  </div>
</template>
