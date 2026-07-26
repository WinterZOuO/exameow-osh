<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useConfigStore } from '@/stores/config'

import { useI18nStore } from '@/stores/i18n'
import { isCloudflare, isTauri, isMobileDevice, isDesktopTauri } from '@/utils/platform'
import { useDesktopUpdater } from '@/composables/useDesktopUpdater'
import { ServerIcon, KeyIcon, CloudArrowDownIcon, CpuChipIcon, CheckCircleIcon, EyeIcon, EyeSlashIcon, CheckIcon, ArrowRightIcon, ArrowLeftIcon, CloudIcon, ArrowPathIcon } from '@heroicons/vue/24/outline'

const configStore = useConfigStore()
const router = useRouter()
const i18n = useI18nStore()

const showKey = ref(false)
const saveSuccess = ref(false)
const saveError = ref('')

const configFetchError = ref('')
const configFetching = ref(false)


async function handleFetchModels() {
  configFetchError.value = ''
  configFetching.value = true
  try { await configStore.fetchModels() } catch (e: any) { configFetchError.value = e.message || String(e) } finally { configFetching.value = false }
}


async function handleSave() {
  saveError.value = ''
  try {
    await configStore.save()
    saveSuccess.value = true
    setTimeout(() => saveSuccess.value = false, 2500)
  } catch (e: any) { saveError.value = e.message || String(e) }
}

const showOta = isTauri() && isMobileDevice()
const otaBundle = ref('')
const otaMessage = ref('')
const otaBusy = ref(false)

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

const showDesktopUpdate = isDesktopTauri()
const updater = useDesktopUpdater()
</script>

<template>
  <div>
    <div class="flex items-center gap-2 mb-6">
      <button class="btn-icon" @click="router.push('/mine')">
        <ArrowLeftIcon class="w-5 h-5" />
      </button>
      <h1 class="text-display-sm">{{ i18n.t('configTitle') }}</h1>
    </div>

    <!-- CF: Provider toggle -->
    <div v-if="isCloudflare()" class="card-filled p-4 mb-4">
      <label class="text-label-md block mb-3" style="color: rgb(var(--md-on-surface-variant))">{{ i18n.t('configAiProvider') }}</label>
      <div class="flex items-center gap-3">
        <button
          class="btn-tonal text-sm !px-4 !py-2"
          :class="{ 'btn-filled': configStore.aiProvider === 'cf-free' }"
          @click="configStore.setProvider('cf-free')"
        >
          <CloudIcon class="w-4 h-4" />
          {{ i18n.t('configCfFree') }}
        </button>
        <button
          class="btn-tonal text-sm !px-4 !py-2"
          :class="{ 'btn-filled': configStore.aiProvider === 'custom' }"
          @click="configStore.setProvider('custom')"
        >
          <ServerIcon class="w-4 h-4" />
          {{ i18n.t('configCustomApi') }}
        </button>
      </div>
      <p v-if="configStore.aiProvider === 'cf-free'" class="text-body-sm mt-2" style="color: rgb(var(--md-on-surface-variant))">
        {{ i18n.t('configCfFreeDesc') }}
      </p>
      <p v-else class="text-body-sm mt-2" style="color: rgb(var(--md-on-surface-variant))">
        {{ i18n.t('configCustomApiDesc') }}
      </p>
    </div>

    <!-- Endpoint (custom API or non-CF) -->
    <div v-if="!isCloudflare() || configStore.aiProvider === 'custom'" class="card-filled p-5 mb-4">
      <label class="text-label-md block mb-3" style="color: rgb(var(--md-on-surface-variant))">{{ i18n.t('configSectionEndpoint') }}</label>
      <div class="relative">
        <ServerIcon class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 z-10" style="color: rgb(var(--md-on-surface-variant))" />
        <input
          v-model="configStore.endpoint"
          :placeholder="i18n.t('configApiUrl')"
          class="input-outlined !pl-10"
        />
      </div>
    </div>

    <!-- Auth (custom API or non-CF) -->
    <div v-if="!isCloudflare() || configStore.aiProvider === 'custom'" class="card-filled p-5 mb-4">
      <label class="text-label-md block mb-3" style="color: rgb(var(--md-on-surface-variant))">{{ i18n.t('configSectionAuth') }}</label>
      <div class="relative">
        <KeyIcon class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 z-10" style="color: rgb(var(--md-on-surface-variant))" />
        <input
          v-model="configStore.apiKey"
          :type="showKey ? 'text' : 'password'"
          :placeholder="i18n.t('configApiKey')"
          class="input-outlined !pl-10 !pr-10"
        />
        <button class="absolute right-3 top-1/2 -translate-y-1/2 btn-icon !w-8 !h-8" @click="showKey = !showKey">
          <EyeSlashIcon v-if="showKey" class="w-4 h-4" />
          <EyeIcon v-else class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Model -->
    <div class="card-filled p-5 mb-4">
      <label class="text-label-md block mb-3" style="color: rgb(var(--md-on-surface-variant))">{{ i18n.t('configSectionModel') }}</label>
      <div class="flex flex-col sm:flex-row items-center gap-3">
        <button
          class="btn-outlined shrink-0 text-sm"
          :disabled="(!isCloudflare() || configStore.aiProvider === 'custom') && (!configStore.endpoint || !configStore.apiKey)"
          @click="handleFetchModels"
        >
          <CloudArrowDownIcon class="w-4 h-4" />
          {{ configFetching ? '...' : i18n.t('configFetchModels') }}
        </button>
        <div class="flex-1 relative">
          <CpuChipIcon class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 z-10" style="color: rgb(var(--md-on-surface-variant))" />
          <select
            v-if="configStore.models.length > 0"
            v-model="configStore.model"
            class="input-outlined !pl-10 appearance-none cursor-pointer"
          >
            <option value="" disabled>{{ i18n.t('configSelectModel') }}</option>
            <option v-for="m in configStore.models" :key="m.id" :value="m.id">{{ m.id }}</option>
          </select>
          <input
            v-else
            v-model="configStore.model"
            :placeholder="i18n.t('configEnterModel')"
            class="input-outlined !pl-10"
          />
        </div>
      </div>
    </div>

    <Transition name="scale">
      <div
        v-if="configFetchError"
        class="mb-4 px-4 py-3 rounded-2xl text-sm flex items-center gap-2"
        style="background-color: rgb(var(--md-error-container)); color: rgb(var(--md-on-error-container))"
      >
        <span>{{ configFetchError }}</span>
      </div>
    </Transition>

    <!-- Mobile OTA update -->
    <div v-if="showOta" class="card-filled p-5 mb-4">
      <label class="text-label-md block mb-3" style="color: rgb(var(--md-on-surface-variant))">{{ i18n.t('otaCheckUpdate') }}</label>
      <div class="flex flex-col sm:flex-row items-center gap-3">
        <button class="btn-outlined shrink-0 text-sm" :disabled="otaBusy" @click="handleOtaCheck">
          <ArrowPathIcon class="w-4 h-4" />
          {{ i18n.t('otaCheckUpdate') }}
        </button>
        <div class="text-body-sm flex-1" style="color: rgb(var(--md-on-surface-variant))">
          {{ i18n.t('otaCurrentBundle') }}: {{ otaBundle }}
        </div>
      </div>
      <p v-if="otaMessage" class="text-body-sm mt-2" style="color: rgb(var(--md-on-surface-variant))">{{ otaMessage }}</p>
    </div>

    <!-- Desktop update check -->
    <div v-if="showDesktopUpdate" class="card-filled p-5 mb-4">
      <label class="text-label-md block mb-3" style="color: rgb(var(--md-on-surface-variant))">{{ i18n.t('updateCheckBtn') }}</label>
      <div class="flex flex-col sm:flex-row items-center gap-3">
        <button
          class="btn-outlined shrink-0 text-sm"
          :disabled="updater.stage.value === 'downloading'"
          @click="updater.checkForUpdate(true)"
        >
          <ArrowPathIcon class="w-4 h-4" />
          {{ i18n.t('updateCheckBtn') }}
        </button>
        <div class="text-body-sm flex-1" style="color: rgb(var(--md-on-surface-variant))">
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
        <button
          v-if="updater.stage.value === 'available'"
          class="btn-filled shrink-0 text-sm"
          @click="updater.startUpdate"
        >
          {{ i18n.t('updateNow') }}
        </button>
        <button
          v-else-if="updater.stage.value === 'ready'"
          class="btn-filled shrink-0 text-sm"
          @click="updater.restart"
        >
          {{ i18n.t('updateRestart') }}
        </button>
      </div>
    </div>

    <!-- ========= Unified Save + CTA ========= -->
    <div class="flex items-center justify-center gap-3 mt-6">
      <button class="btn-filled" :disabled="!configStore.configured" @click="handleSave">
        <CheckIcon class="w-5 h-5" />
        {{ i18n.t('configSave') }}
      </button>

      <button
        class="btn-filled"
        :disabled="!configStore.configured"
        @click="router.push('/generate')"
      >
        <ArrowRightIcon class="w-5 h-5" />
        {{ i18n.t('configReadyCta') }}
      </button>

      <Transition name="fade">
        <div v-if="saveSuccess" class="flex items-center gap-2 text-sm font-medium" style="color: rgb(var(--md-primary))">
          <CheckCircleIcon class="w-5 h-5" /> {{ i18n.t('configSaved') }}
        </div>
      </Transition>
    </div>

    <Transition name="scale">
      <div
        v-if="saveError"
        class="mt-4 px-4 py-3 rounded-2xl text-sm"
        style="background-color: rgb(var(--md-error-container)); color: rgb(var(--md-on-error-container))"
      >
        {{ saveError }}
      </div>
    </Transition>
  </div>
</template>
