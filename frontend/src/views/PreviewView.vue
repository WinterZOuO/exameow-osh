<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useExamStore } from '@/stores/exam'
import { useI18nStore } from '@/stores/i18n'
import { api } from '@/api'
import QuestionTable from '@/components/preview/QuestionTable.vue'
import { ArrowLeftIcon, ArrowDownTrayIcon, DocumentTextIcon } from '@heroicons/vue/24/outline'

const router = useRouter()
const examStore = useExamStore()
const i18n = useI18nStore()
const isTauri = '__TAURI__' in window
const exportError = ref('')
const exporting = ref(false)

async function handleExport() {
  exportError.value = ''
  exporting.value = true
  try {
    if (isTauri) {
      let saveDialog: any
      try { const mod: any = await import('@tauri-apps/plugin-dialog'); saveDialog = mod.save } catch {}
      const savePath = saveDialog ? await saveDialog({ defaultPath: 'exambot_questions.csv', filters: [{ name: 'CSV', extensions: ['csv'] }] }) : null
      if (!savePath) return
      await api.exportCsv(examStore.questions, savePath as string)
    } else {
      await api.exportCsv(examStore.questions)
    }
  } catch (e: any) { exportError.value = e.message || String(e) } finally { exporting.value = false }
}

function handleNewBatch() { examStore.reset(); router.push('/generate') }
</script>

<template>
  <div>
    <!-- Empty State -->
    <div v-if="!examStore.generated">
      <h1 class="page-title mb-1">{{ i18n.t('previewTitle') }}</h1>
      <p class="page-subtitle mb-8">{{ i18n.t('previewSubtitleEmpty') }}</p>
      <div class="card text-center py-12">
        <div class="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950">
          <DocumentTextIcon class="w-8 h-8 text-primary-500" />
        </div>
        <h3 class="text-lg font-bold mb-2">{{ i18n.t('previewEmptyTitle') }}</h3>
        <p class="text-sm text-[rgb(var(--c-text-secondary))] mb-5">{{ i18n.t('previewEmptyText') }}</p>
        <button class="btn-primary text-sm" @click="router.push('/generate')">
          {{ i18n.t('previewGotoGenerate') }}
        </button>
      </div>
    </div>

    <!-- Results -->
    <div v-else>
      <div class="flex flex-wrap items-center gap-3 mb-6">
        <div class="flex-1">
          <h1 class="page-title mb-1">{{ i18n.t('previewTitle') }}</h1>
          <p class="page-subtitle">{{ i18n.t('previewQuestionCount', { n: examStore.questions.length }) }}</p>
        </div>
        <button class="btn-outline text-sm" @click="handleNewBatch">
          <ArrowLeftIcon class="w-4 h-4" /> {{ i18n.t('previewNewBatch') }}
        </button>
        <button class="btn-primary text-sm" :disabled="exporting" @click="handleExport">
          <ArrowDownTrayIcon class="w-4 h-4" /> {{ i18n.t('previewExportCsv') }}
        </button>
      </div>

      <div v-if="exportError" class="mb-4 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl text-sm text-red-700 dark:text-red-300">
        {{ exportError }}
      </div>

      <QuestionTable :questions="examStore.questions" />
    </div>
  </div>
</template>
