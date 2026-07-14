<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useExamStore } from '@/stores/exam'
import { useI18nStore } from '@/stores/i18n'
import { api } from '@/api'
import QuestionTable from '@/components/preview/QuestionTable.vue'
import { ArrowLeftIcon, ArrowDownTrayIcon, DocumentTextIcon, TableCellsIcon } from '@heroicons/vue/24/outline'

const router = useRouter()
const examStore = useExamStore()
const i18n = useI18nStore()
const isTauri = '__TAURI__' in window || '__TAURI_INTERNALS__' in window
const exportError = ref('')
const exporting = ref(false)
const exportingKaoshibao = ref(false)

const baseFileName = computed(() => {
  const name = examStore.sourceFileName
  if (name) return name
  return 'exambot_questions'
})

async function getExportPath(defaultName: string): Promise<string | null> {
  let saveDialog: any
  try { const mod: any = await import('@tauri-apps/plugin-dialog'); saveDialog = mod.save } catch {}
  if (saveDialog) {
    return await saveDialog({ defaultPath: defaultName, filters: [{ name: 'File', extensions: [defaultName.split('.').pop() || '*'] }] })
  }
  try {
    const { downloadDir } = await import('@tauri-apps/plugin-fs')
    const dir = await downloadDir()
    return `${dir}/${defaultName}`
  } catch (e: any) {
    exportError.value = 'Export failed: cannot determine save path (' + (e.message || e) + ')'
    return null
  }
}

async function handleExport() {
  exportError.value = ''
  exporting.value = true
  try {
    const defaultName = `${baseFileName.value}.csv`
    if (isTauri) {
      const savePath = await getExportPath(defaultName)
      if (!savePath) return
      await api.exportCsv(examStore.questions, savePath)
    } else {
      await api.exportCsv(examStore.questions, undefined, defaultName)
    }
  } catch (e: any) { exportError.value = e.message || String(e) } finally { exporting.value = false }
}

async function handleExportKaoshibao() {
  exportError.value = ''
  exportingKaoshibao.value = true
  try {
    const defaultName = `${baseFileName.value}.xlsx`
    if (isTauri) {
      const savePath = await getExportPath(defaultName)
      if (!savePath) return
      await api.exportKaoshibao(examStore.questions, savePath)
    } else {
      await api.exportKaoshibao(examStore.questions, undefined, defaultName)
    }
  } catch (e: any) { exportError.value = e.message || String(e) } finally { exportingKaoshibao.value = false }
}

function handleNewBatch() { examStore.reset(); router.push('/generate') }
</script>

<template>
  <div>
    <!-- Empty State -->
    <div v-if="!examStore.generated">
      <h1 class="text-display-sm mb-1">{{ i18n.t('previewTitle') }}</h1>
      <p class="text-body-lg mb-6" style="color: rgb(var(--md-on-surface-variant))">{{ i18n.t('previewSubtitleEmpty') }}</p>
      <div class="card-outlined text-center py-14 px-6">
        <div class="w-[72px] h-[72px] rounded-[28px] flex items-center justify-center mx-auto mb-5 elevation-1"
             style="background: linear-gradient(135deg, rgb(var(--md-primary)), rgb(var(--md-tertiary)))">
          <DocumentTextIcon class="w-9 h-9 text-white" />
        </div>
        <h3 class="text-title-lg mb-2">{{ i18n.t('previewEmptyTitle') }}</h3>
        <p class="text-body-md mb-6" style="color: rgb(var(--md-on-surface-variant))">{{ i18n.t('previewEmptyText') }}</p>
        <button class="btn-filled" @click="router.push('/generate')">
          {{ i18n.t('previewGotoGenerate') }}
        </button>
      </div>
    </div>

    <!-- Results -->
    <div v-else>
      <div class="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-3 mb-6">
        <div class="flex-1">
          <h1 class="text-display-sm mb-1">{{ i18n.t('previewTitle') }}</h1>
          <p class="text-body-lg" style="color: rgb(var(--md-on-surface-variant))">{{ i18n.t('previewQuestionCount', { n: examStore.questions.length }) }}</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button class="btn-tonal text-sm" @click="handleNewBatch">
            <ArrowLeftIcon class="w-4 h-4" /> {{ i18n.t('previewNewBatch') }}
          </button>
          <button class="btn-tonal text-sm" :disabled="exportingKaoshibao" @click="handleExportKaoshibao">
            <TableCellsIcon class="w-4 h-4" /> {{ exportingKaoshibao ? '...' : 'XLSX' }}
          </button>
          <button class="btn-filled text-sm" :disabled="exporting" @click="handleExport">
            <ArrowDownTrayIcon class="w-4 h-4" /> CSV
          </button>
        </div>
      </div>

      <Transition name="scale">
        <div
          v-if="exportError"
          class="mb-4 px-4 py-3 rounded-2xl text-sm"
          style="background-color: rgb(var(--md-error-container)); color: rgb(var(--md-on-error-container))"
        >
          {{ exportError }}
        </div>
      </Transition>

      <QuestionTable :questions="examStore.questions" />
    </div>
  </div>
</template>
