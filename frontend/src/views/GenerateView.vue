<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useExamStore } from '@/stores/exam'
import { useConfigStore } from '@/stores/config'
import { useI18nStore } from '@/stores/i18n'
import FileUploader from '@/components/generate/FileUploader.vue'
import ParamForm from '@/components/generate/ParamForm.vue'
import { getFileInput, fileInputRef } from '@/stores/fileInput'
import { SparklesIcon } from '@heroicons/vue/24/outline'

const router = useRouter()
const examStore = useExamStore()
const configStore = useConfigStore()
const i18n = useI18nStore()

const isTauri = '__TAURI__' in window || '__TAURI_INTERNALS__' in window

const canGenerate = computed(() =>
  !!fileInputRef.value && examStore.questionTypes.length > 0 && examStore.totalCount > 0 && configStore.configured,
)

const progressPercent = computed(() => {
  const p = examStore.progress
  if (!p.total) return 0
  return Math.round((p.current / p.total) * 100)
})

const isBatched = computed(() => examStore.progress.total > 1)

async function handleGenerate() {
  const input = getFileInput()
  if (!input) return
  try {
    await examStore.generate(input)
    router.push('/preview')
  } catch (_) {
    // error is handled in store
  }
}
</script>

<template>
  <div>
    <h1 class="page-title mb-1">{{ i18n.t('genTitle') }}</h1>
    <p class="page-subtitle mb-8">{{ i18n.t('genSubtitle') }}</p>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
      <div class="card min-h-[220px] flex items-center justify-center">
        <FileUploader :is-tauri="isTauri" />
      </div>
      <ParamForm />
    </div>

    <!-- Progress -->
    <div v-if="examStore.generating" class="card mb-6">
      <div class="mb-3 flex items-center justify-between text-sm">
        <span class="font-medium">{{ examStore.progress.message || i18n.t('genGenerating') }}</span>
        <span v-if="isBatched" class="font-bold text-primary-500 tabular-nums">
          {{ examStore.progress.current }}/{{ examStore.progress.total }}
        </span>
      </div>
      <div class="w-full h-2 bg-[rgb(var(--c-container))] rounded-full overflow-hidden">
        <div
          class="h-full bg-primary-500 rounded-full transition-all duration-500 ease-out"
          :style="{ width: (!isBatched && examStore.generating) ? '99%' : progressPercent + '%' }"
        />
      </div>
      <div v-if="isBatched" class="mt-2 text-xs text-[rgb(var(--c-text-secondary))]">
        {{ examStore.questions.length }} questions generated so far
      </div>
    </div>

    <div class="text-center">
      <button
        class="btn-primary !px-10 !py-4 text-base !font-bold"
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
