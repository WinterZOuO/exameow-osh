<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useExamStore } from '@/stores/exam'
import { useConfigStore } from '@/stores/config'
import { useI18nStore } from '@/stores/i18n'
import FileUploader from '@/components/generate/FileUploader.vue'
import ParamForm from '@/components/generate/ParamForm.vue'
import { SparklesIcon } from '@heroicons/vue/24/outline'

const router = useRouter()
const examStore = useExamStore()
const configStore = useConfigStore()
const i18n = useI18nStore()

const isTauri = '__TAURI__' in window
const error = ref('')
const fileSelected = ref(false)

const canGenerate = computed(() =>
  fileSelected.value && examStore.questionTypes.length > 0 && examStore.totalCount > 0 && configStore.configured,
)

function onFileSelected(file: File | null, path: string) {
  fileSelected.value = !!(file || path)
  examStore.selectedFile = file
  examStore.filePath = path
}

async function handleGenerate() {
  error.value = ''
  try {
    await examStore.generate()
    router.push('/preview')
  } catch (e: any) {
    error.value = e.message || String(e)
  }
}
</script>

<template>
  <div>
    <h1 class="page-title mb-1">{{ i18n.t('genTitle') }}</h1>
    <p class="page-subtitle mb-8">{{ i18n.t('genSubtitle') }}</p>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
      <div class="card min-h-[220px] flex items-center justify-center">
        <FileUploader :is-tauri="isTauri" @file-selected="onFileSelected" />
      </div>
      <ParamForm />
    </div>

    <div v-if="error" class="mb-6 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl text-sm text-red-700 dark:text-red-300">
      {{ error }}
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
