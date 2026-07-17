<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useVisionConfigStore } from '@/stores/visionConfig'
import { useI18nStore } from '@/stores/i18n'
import { ServerIcon, KeyIcon, CpuChipIcon, CheckIcon, CheckCircleIcon, EyeIcon, EyeSlashIcon, CameraIcon, SparklesIcon } from '@heroicons/vue/24/outline'

const store = useVisionConfigStore()
const i18n = useI18nStore()
const showKey = ref(false)
const saveSuccess = ref(false)
const saveError = ref('')

onMounted(() => {
  store.loadSaved()
})

async function handleSave() {
  saveError.value = ''
  try {
    await store.save()
    saveSuccess.value = true
    setTimeout(() => (saveSuccess.value = false), 2500)
  } catch (e: any) {
    saveError.value = e.message || String(e)
  }
}
</script>

<template>
  <div class="mt-10">
    <h2 class="text-title-lg mb-1">{{ i18n.t('configVisionTitle') }}</h2>
    <p class="text-body-md mb-4" style="color: rgb(var(--md-on-surface-variant))">{{ i18n.t('configVisionDesc') }}</p>

    <div class="card-filled p-4 mb-4">
      <div class="flex items-center gap-3">
        <button
          class="btn-tonal text-sm !px-4 !py-2"
          :class="{ 'btn-filled': store.mode === 'ocr' }"
          @click="store.mode = 'ocr'"
        >
          <CameraIcon class="w-4 h-4" />
          {{ i18n.t('configVisionModeOcr') }}
        </button>
        <button
          class="btn-tonal text-sm !px-4 !py-2"
          :class="{ 'btn-filled': store.mode === 'llm' }"
          @click="store.mode = 'llm'"
        >
          <SparklesIcon class="w-4 h-4" />
          {{ i18n.t('configVisionModeLlm') }}
        </button>
      </div>
      <p class="text-body-sm mt-2" style="color: rgb(var(--md-on-surface-variant))">
        {{ store.mode === 'ocr' ? i18n.t('configVisionModeOcrDesc') : i18n.t('configVisionModeLlmDesc') }}
      </p>
    </div>

    <template v-if="store.mode === 'llm'">
      <div class="card-filled p-5 mb-4">
        <label class="text-label-md block mb-3" style="color: rgb(var(--md-on-surface-variant))">{{ i18n.t('configSectionEndpoint') }}</label>
        <div class="relative">
          <ServerIcon class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 z-10" style="color: rgb(var(--md-on-surface-variant))" />
          <input v-model="store.endpoint" :placeholder="i18n.t('configApiUrl')" class="input-outlined !pl-10" />
        </div>
      </div>

      <div class="card-filled p-5 mb-4">
        <label class="text-label-md block mb-3" style="color: rgb(var(--md-on-surface-variant))">{{ i18n.t('configSectionAuth') }}</label>
        <div class="relative">
          <KeyIcon class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 z-10" style="color: rgb(var(--md-on-surface-variant))" />
          <input
            v-model="store.apiKey"
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

      <div class="card-filled p-5 mb-4">
        <label class="text-label-md block mb-3" style="color: rgb(var(--md-on-surface-variant))">{{ i18n.t('configSectionModel') }}</label>
        <div class="relative">
          <CpuChipIcon class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 z-10" style="color: rgb(var(--md-on-surface-variant))" />
          <input v-model="store.model" :placeholder="i18n.t('configEnterModel')" class="input-outlined !pl-10" />
        </div>
        <p class="text-body-sm mt-2" style="color: rgb(var(--md-on-surface-variant))">{{ i18n.t('configVisionLlmHint') }}</p>
      </div>
    </template>

    <div class="flex items-center justify-center gap-3">
      <button class="btn-filled" @click="handleSave">
        <CheckIcon class="w-5 h-5" />
        {{ i18n.t('configSave') }}
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
