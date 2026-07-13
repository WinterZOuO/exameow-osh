<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useExamStore } from '@/stores/exam'
import { useConfigStore } from '@/stores/config'
import { useI18nStore } from '@/stores/i18n'
import FileUploader from '@/components/generate/FileUploader.vue'
import ParamForm from '@/components/generate/ParamForm.vue'
import { getFileInputs, fileInputsRef } from '@/stores/fileInput'
import { SparklesIcon } from '@heroicons/vue/24/outline'

const router = useRouter()
const examStore = useExamStore()
const configStore = useConfigStore()
const i18n = useI18nStore()

const isTauri = '__TAURI__' in window || '__TAURI_INTERNALS__' in window

const canGenerate = computed(() =>
  fileInputsRef.value.length > 0 && examStore.questionTypes.length > 0 && examStore.totalCount > 0 && configStore.configured,
)

const progressPercent = computed(() => {
  const p = examStore.progress
  if (!p.total) return 0
  return Math.round((p.current / p.total) * 100)
})

const isBatched = computed(() => examStore.progress.total > 1)

async function handleGenerate() {
  const inputs = getFileInputs()
  if (inputs.length === 0) return
  try {
    await examStore.generate(inputs)
    router.push('/preview')
  } catch (_) {
    // error is handled in store
  }
}
</script>

<template>
  <div>
    <h1 class="text-display-sm mb-1">{{ i18n.t('genTitle') }}</h1>
    <p class="text-body-lg mb-6" style="color: rgb(var(--md-on-surface-variant))">{{ i18n.t('genSubtitle') }}</p>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 mb-6">
      <!-- File Upload Card -->
      <div class="card-outlined min-h-[180px] sm:min-h-[240px] flex items-center justify-center p-3 sm:p-4">
        <FileUploader :is-tauri="isTauri" />
      </div>
      <ParamForm />
    </div>

    <!-- Progress -->
    <Transition name="scale">
      <div v-if="examStore.generating" class="card-filled p-5 mb-6">
        <div class="mb-3 flex items-center justify-between">
          <span class="text-title-sm">{{ examStore.progress.message || i18n.t('genGenerating') }}</span>
          <span v-if="isBatched" class="text-sm font-bold tabular-nums" style="color: rgb(var(--md-primary))">
            {{ examStore.progress.current }}/{{ examStore.progress.total }}
          </span>
        </div>
        <div v-if="!isBatched && examStore.generating" class="progress-indeterminate" />
        <div v-else class="w-full h-1 rounded-full overflow-hidden" :style="{ backgroundColor: 'rgba(var(--md-primary) / 0.12)' }">
          <div
            class="h-full rounded-full transition-all duration-500 ease-out"
            :style="{ backgroundColor: 'rgb(var(--md-primary))', width: progressPercent + '%' }"
          />
        </div>
        <div v-if="isBatched" class="mt-2 text-body-sm" style="color: rgb(var(--md-on-surface-variant))">
          {{ examStore.questions.length }} questions generated so far
        </div>
      </div>
    </Transition>

    <!-- Generate Button -->
    <div class="text-center">
      <button
        class="btn-filled text-base !px-10 !h-12"
        :disabled="!canGenerate || examStore.generating"
        @click="handleGenerate"
      >
        <SparklesIcon v-if="!examStore.generating" class="w-5 h-5" />
        <svg v-else class="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
        {{ examStore.generating ? i18n.t('genGenerating') : i18n.t('genGenerateBtn') }}
      </button>
    </div>
  </div>
</template>
