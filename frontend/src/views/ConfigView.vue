<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useConfigStore } from '@/stores/config'
import { useVisionConfigStore } from '@/stores/visionConfig'
import { useI18nStore } from '@/stores/i18n'
import { isCloudflare } from '@/utils/platform'
import { ServerIcon, KeyIcon, CloudArrowDownIcon, CpuChipIcon, CheckCircleIcon, EyeIcon, EyeSlashIcon, CheckIcon, ArrowRightIcon, CloudIcon, CameraIcon, SparklesIcon } from '@heroicons/vue/24/outline'

const configStore = useConfigStore()
const visionStore = useVisionConfigStore()
const router = useRouter()
const i18n = useI18nStore()

const showKey = ref(false)
const showVisionKey = ref(false)
const saveSuccess = ref(false)
const saveError = ref('')

const configFetchError = ref('')
const configFetching = ref(false)
const visionFetchError = ref('')
const visionFetching = ref(false)

onMounted(() => {
  visionStore.loadSaved()
})

async function handleFetchModels() {
  configFetchError.value = ''
  configFetching.value = true
  try { await configStore.fetchModels() } catch (e: any) { configFetchError.value = e.message || String(e) } finally { configFetching.value = false }
}

async function handleFetchVisionModels() {
  visionFetchError.value = ''
  visionFetching.value = true
  try { await visionStore.fetchModels() } catch (e: any) { visionFetchError.value = e.message || String(e) } finally { visionFetching.value = false }
}

async function handleSave() {
  saveError.value = ''
  try {
    await configStore.save()
    await visionStore.save()
    saveSuccess.value = true
    setTimeout(() => saveSuccess.value = false, 2500)
  } catch (e: any) { saveError.value = e.message || String(e) }
}
</script>

<template>
  <div>
    <h1 class="text-display-sm mb-1">{{ i18n.t('configTitle') }}</h1>
    <p class="text-body-lg mb-6" style="color: rgb(var(--md-on-surface-variant))">{{ i18n.t('configSubtitle') }}</p>

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

    <!-- ========= Divider ========= -->
    <hr class="my-8" style="border-color: rgb(var(--md-outline-variant))" />

    <!-- ========= Vision / OCR ========= -->
    <p class="text-body-md mb-4" style="color: rgb(var(--md-on-surface-variant))">{{ i18n.t('configVisionDesc') }}</p>

    <div class="card-filled p-4 mb-4">
      <div class="flex items-center gap-3">
        <button
          class="btn-tonal text-sm !px-4 !py-2"
          :class="{ 'btn-filled': visionStore.mode === 'ocr' }"
          @click="visionStore.mode = 'ocr'"
        >
          <CameraIcon class="w-4 h-4" />
          {{ i18n.t('configVisionModeOcr') }}
        </button>
        <button
          class="btn-tonal text-sm !px-4 !py-2"
          :class="{ 'btn-filled': visionStore.mode === 'llm' }"
          @click="visionStore.mode = 'llm'"
        >
          <SparklesIcon class="w-4 h-4" />
          {{ i18n.t('configVisionModeLlm') }}
        </button>
      </div>
      <p class="text-body-sm mt-2" style="color: rgb(var(--md-on-surface-variant))">
        {{ visionStore.mode === 'ocr' ? i18n.t('configVisionModeOcrDesc') : i18n.t('configVisionModeLlmDesc') }}
      </p>
    </div>

    <template v-if="visionStore.mode === 'llm'">
      <div class="card-filled p-5 mb-4">
        <label class="text-label-md block mb-3" style="color: rgb(var(--md-on-surface-variant))">{{ i18n.t('configSectionEndpoint') }}</label>
        <div class="relative">
          <ServerIcon class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 z-10" style="color: rgb(var(--md-on-surface-variant))" />
          <input v-model="visionStore.endpoint" :placeholder="i18n.t('configApiUrl')" class="input-outlined !pl-10" />
        </div>
      </div>

      <div class="card-filled p-5 mb-4">
        <label class="text-label-md block mb-3" style="color: rgb(var(--md-on-surface-variant))">{{ i18n.t('configSectionAuth') }}</label>
        <div class="relative">
          <KeyIcon class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 z-10" style="color: rgb(var(--md-on-surface-variant))" />
          <input
            v-model="visionStore.apiKey"
            :type="showVisionKey ? 'text' : 'password'"
            :placeholder="i18n.t('configApiKey')"
            class="input-outlined !pl-10 !pr-10"
          />
          <button class="absolute right-3 top-1/2 -translate-y-1/2 btn-icon !w-8 !h-8" @click="showVisionKey = !showVisionKey">
            <EyeSlashIcon v-if="showVisionKey" class="w-4 h-4" />
            <EyeIcon v-else class="w-4 h-4" />
          </button>
        </div>
      </div>

      <div class="card-filled p-5 mb-4">
        <label class="text-label-md block mb-3" style="color: rgb(var(--md-on-surface-variant))">{{ i18n.t('configSectionModel') }}</label>
        <div class="flex flex-col sm:flex-row items-center gap-3">
          <button
            class="btn-outlined shrink-0 text-sm"
            :disabled="!visionStore.endpoint || !visionStore.apiKey"
            @click="handleFetchVisionModels"
          >
            <CloudArrowDownIcon class="w-4 h-4" />
            {{ visionFetching ? '...' : i18n.t('configFetchModels') }}
          </button>
          <div class="flex-1 relative">
            <CpuChipIcon class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 z-10" style="color: rgb(var(--md-on-surface-variant))" />
            <select
              v-if="visionStore.models.length > 0"
              v-model="visionStore.model"
              class="input-outlined !pl-10 appearance-none cursor-pointer"
            >
              <option value="" disabled>{{ i18n.t('configSelectModel') }}</option>
              <option v-for="m in visionStore.models" :key="m.id" :value="m.id">{{ m.id }}</option>
            </select>
            <input
              v-else
              v-model="visionStore.model"
              :placeholder="i18n.t('configEnterModel')"
              class="input-outlined !pl-10"
            />
          </div>
        </div>
        <p class="text-body-sm mt-2" style="color: rgb(var(--md-on-surface-variant))">{{ i18n.t('configVisionLlmHint') }}</p>
      </div>

      <Transition name="scale">
        <div
          v-if="visionFetchError"
          class="mb-4 px-4 py-3 rounded-2xl text-sm flex items-center gap-2"
          style="background-color: rgb(var(--md-error-container)); color: rgb(var(--md-on-error-container))"
        >
          <span>{{ visionFetchError }}</span>
        </div>
      </Transition>
    </template>

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
