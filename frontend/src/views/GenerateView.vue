<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useExamStore } from '@/stores/exam'
import { useConfigStore } from '@/stores/config'
import { useI18nStore } from '@/stores/i18n'
import FileUploader from '@/components/generate/FileUploader.vue'
import ParamForm from '@/components/generate/ParamForm.vue'
import QuestionTable from '@/components/preview/QuestionTable.vue'
import { getFileInputs, fileInputsRef, addFileInputs } from '@/stores/fileInput'
import { api } from '@/api'
import { generateCsvContent } from '@/api/http'
import { isAndroid } from '@/utils/platform'
import PublishExamDialog from '@/components/exam/PublishExamDialog.vue'
import JoinExamDialog from '@/components/exam/JoinExamDialog.vue'
import LaunchExamDialog from '@/components/exam/LaunchExamDialog.vue'
import AiConfigNotice from '@/components/common/AiConfigNotice.vue'
import { SparklesIcon, ArrowDownTrayIcon, CheckCircleIcon, ShareIcon, AcademicCapIcon } from '@heroicons/vue/24/outline'

const route = useRoute()
const router = useRouter()
const examStore = useExamStore()
const configStore = useConfigStore()
const i18n = useI18nStore()

const isTauri = '__TAURI__' in window || '__TAURI_INTERNALS__' in window
const exportError = ref('')
const exportSuccess = ref('')
const exportFilePath = ref('')
const exporting = ref(false)
const exportingXlsx = ref(false)
const showPublish = ref(false)
const showJoin = ref(false)
const showLaunch = ref(false)

const baseFileName = computed(() => examStore.sourceFileName || 'exameow_questions')

const canGenerate = computed(() =>
  fileInputsRef.value.length > 0 && examStore.questionTypes.length > 0 && examStore.totalCount > 0 && configStore.configured && !examStore.generating,
)

const progressPercent = computed(() => {
  const p = examStore.progress
  if (!p.total) return 0
  return Math.round((p.current / p.total) * 100)
})

const isBatched = computed(() => examStore.progress.total > 0)

// ---------------------------------------------------------------- 課程 context（W6）
//
// 由 CourseDetailView 帶 `?course=<id>` 過嚟就即係「生成完直接入嗰個課程嘅共享題庫」，
// 冇呢個 query param 就係舊時嗰種獨立生成（存本機 bank，行為完全不變）。
// `?material=<id>` 有值就順手用嗰份已上傳嘅教材做輸入 —— 借 File 包住佢個 content，
// 行返同上傳檔案一模一樣嘅解析管線，唔使另外寫一套。

const courseId = computed(() => (route.query.course as string) || '')
const materialIdParam = computed(() => (route.query.material as string) || '')
const courseTitle = ref('')
const materialFileName = ref('')
const courseContextError = ref('')

onMounted(async () => {
  if (!courseId.value) return
  try {
    const course = await api.getCourse(courseId.value)
    courseTitle.value = course.title
  } catch (e: any) {
    courseContextError.value = e.message || String(e)
    return
  }
  if (materialIdParam.value) {
    try {
      const material = await api.getMaterial(materialIdParam.value)
      materialFileName.value = material.filename
      addFileInputs([new File([material.content], material.filename, { type: 'text/markdown' })])
    } catch (e: any) {
      courseContextError.value = e.message || String(e)
    }
  }
})

async function handleGenerate() {
  const inputs = getFileInputs()
  if (inputs.length === 0) return
  try {
    if (courseId.value) {
      await examStore.generate(inputs, { courseId: courseId.value, materialId: materialIdParam.value || null })
    } else {
      await examStore.generate(inputs)
    }
  } catch (_e) {}
}

function handleNewBatch() { examStore.reset() }

async function saveFile(filename: string, content: string | Uint8Array): Promise<string | null> {
  exportError.value = ''
  exportSuccess.value = ''
  try {
    const mod: any = await import('@tauri-apps/plugin-dialog')
    const path = await mod.save({ defaultPath: filename, filters: [{ name: 'File', extensions: [filename.split('.').pop() || '*'] }] })
    if (!path) return null
    if (typeof content === 'string') {
      await api.exportCsv(examStore.questions, path)
    } else {
      await api.exportXlsx(examStore.questions, path)
    }
    exportSuccess.value = i18n.t('previewExportSaved') + path
    exportFilePath.value = path
    return path
  } catch {}
  try {
    const b64 = typeof content === 'string' ? btoa(unescape(encodeURIComponent(content))) : btoa(String.fromCharCode(...content))
    const { tauriApi } = await import('@/api/bridge')
    const savedPath = await tauriApi.saveToDownloads(filename, b64)
    exportSuccess.value = i18n.t('previewExportSaved') + savedPath
    exportFilePath.value = savedPath
    return savedPath
  } catch (e: any) {
    exportError.value = 'Export failed: ' + (e.message || String(e))
    return null
  }
}

async function handleExportCsv() {
  exporting.value = true
  try {
    const defaultName = `${baseFileName.value}.csv`
    if (isTauri) {
      await saveFile(defaultName, generateCsvContent(examStore.questions))
    } else {
      await api.exportCsv(examStore.questions, undefined, defaultName)
    }
  } catch (e: any) { exportError.value = e.message || String(e) } finally { exporting.value = false }
}

async function handleExportXlsx() {
  exportingXlsx.value = true
  try {
    const defaultName = `${baseFileName.value}.xlsx`
    if (isTauri) {
      const base64 = await api.exportXlsxData(examStore.questions)
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
      await saveFile(defaultName, bytes)
    } else {
      await api.exportXlsx(examStore.questions, undefined, defaultName)
    }
  } catch (e: any) { exportError.value = e.message || String(e) } finally { exportingXlsx.value = false }
}

async function handleShare() {
  try {
    const { shareFile } = await import('@choochmeque/tauri-plugin-sharekit-api')
    const mime = exportFilePath.value!.endsWith('.xlsx') ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv'
    await shareFile('file://' + exportFilePath.value!, { mimeType: mime, title: exportFilePath.value!.split('/').pop() || 'File' })
  } catch (_e) {}
}
</script>

<template>
  <div>
    <h1 class="text-display-sm mb-1">{{ i18n.t('genTitle') }}</h1>
    <p class="text-body-lg mb-6" style="color: rgb(var(--md-on-surface-variant))">{{ i18n.t('genSubtitle') }}</p>
    <div class="mb-6 flex justify-end gap-2">
      <button class="btn-filled text-sm" @click="showLaunch = true">{{ i18n.t('pubLaunch') }}</button>
      <button class="btn-tonal text-sm" @click="showJoin = true">{{ i18n.t('pubJoin') }}</button>
    </div>

    <!-- 課程 context（W6）-->
    <div
      v-if="courseId"
      class="card-filled p-4 mb-4 flex items-center gap-3"
      :style="{ backgroundColor: 'rgba(var(--md-primary) / 0.08)' }"
    >
      <AcademicCapIcon class="w-5 h-5 shrink-0" style="color: rgb(var(--md-primary))" />
      <div class="min-w-0 flex-1">
        <p class="text-body-sm font-medium truncate">
          {{ i18n.t('genCourseBanner', { course: courseTitle || courseId }) }}
        </p>
        <p v-if="materialFileName" class="text-xs truncate" style="color: rgb(var(--md-on-surface-variant))">
          {{ i18n.t('genFromMaterial', { name: materialFileName }) }}
        </p>
      </div>
      <button class="btn-tonal text-xs !h-8 !px-3 shrink-0" @click="router.push(`/courses/${courseId}`)">
        {{ i18n.t('genBackToCourse') }}
      </button>
    </div>
    <div v-if="courseContextError" class="mb-4 px-4 py-3 rounded-2xl text-sm" style="background-color: rgb(var(--md-error-container)); color: rgb(var(--md-on-error-container))">
      {{ courseContextError }}
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 mb-6">
      <!-- File Upload Card -->
      <div class="card-outlined min-h-[180px] sm:min-h-[240px] flex items-center justify-center p-3 sm:p-4">
        <FileUploader :is-tauri="isTauri" />
      </div>
      <ParamForm />
    </div>

    <!-- Progress -->
    <Transition name="scale">
      <div v-if="!examStore.error && examStore.generating" class="card-filled p-5 mb-6">
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
          {{ i18n.t('genProgressGeneratingBatch', { current: examStore.progress.current, total: examStore.progress.total }) }}
        </div>
        <button
          class="btn-outlined mt-3 text-sm !h-10"
          @click="examStore.cancelGeneration()"
        >
          {{ i18n.t('genCancel') }}
        </button>
      </div>
    </Transition>

    <!-- Error -->
    <Transition name="scale">
      <div v-if="examStore.error && !examStore.generating" class="card-filled p-4 mb-6 border" :style="{ backgroundColor: 'rgba(var(--md-error) / 0.08)', borderColor: 'rgb(var(--md-error))' }">
        <p class="text-body-md" style="color: rgb(var(--md-error))">{{ examStore.error }}</p>
      </div>
    </Transition>

    <!-- Generate Button -->
    <AiConfigNotice v-if="!configStore.configured" class="max-w-md mx-auto mb-4" />
    <div class="flex flex-wrap items-center justify-center gap-2">
      <button
        class="btn-filled text-base !px-10 !h-12"
        :disabled="!canGenerate"
        @click="handleGenerate"
      >
        <SparklesIcon v-if="!examStore.generating" class="w-5 h-5" />
        <svg v-else class="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
        {{ examStore.generating ? i18n.t('genGenerating') : i18n.t('genGenerateBtn') }}
      </button>
      <button
        v-if="examStore.generated"
        class="btn-tonal text-sm !h-12"
        @click="handleNewBatch"
      >
        {{ i18n.t('previewNewBatch') }}
      </button>
    </div>

    <!-- Export & Preview -->
    <template v-if="examStore.generated && !examStore.generating">
      <div v-if="examStore.pushResult" class="mt-6 mb-4 px-4 py-3 rounded-2xl text-sm flex items-center gap-2" style="background-color: rgba(var(--md-primary) / 0.12); color: rgb(var(--md-primary))">
        <CheckCircleIcon class="w-5 h-5 shrink-0" />
        <span>{{ i18n.t('genPushResult', { inserted: examStore.pushResult.inserted, duplicates: examStore.pushResult.duplicates }) }}</span>
      </div>

      <div class="mt-6 mb-4 flex flex-wrap items-center justify-between gap-3">
        <p class="text-body-lg" style="color: rgb(var(--md-on-surface-variant))">{{ i18n.t('previewQuestionCount', { n: examStore.questions.length }) }}</p>
        <div class="flex flex-wrap gap-2">
          <button class="btn-tonal text-sm" :disabled="exporting" @click="handleExportCsv">
            <ArrowDownTrayIcon class="w-4 h-4" /> CSV
          </button>
          <button class="btn-filled text-sm" :disabled="exportingXlsx" @click="handleExportXlsx">
            <ArrowDownTrayIcon class="w-4 h-4" /> {{ exportingXlsx ? '...' : 'XLSX' }}
          </button>
          <button class="btn-tonal text-sm" @click="showPublish = true">
            {{ i18n.t('pubPublish') }}
          </button>
        </div>
      </div>

      <Transition name="scale">
        <div v-if="exportError" class="mb-4 px-4 py-3 rounded-2xl text-sm" style="background-color: rgb(var(--md-error-container)); color: rgb(var(--md-on-error-container))">{{ exportError }}</div>
      </Transition>
      <Transition name="scale">
        <div v-if="exportSuccess" class="mb-4 px-4 py-3 rounded-2xl text-sm flex items-center gap-2 break-all" style="background-color: rgba(var(--md-primary) / 0.12); color: rgb(var(--md-primary))">
          <CheckCircleIcon class="w-5 h-5 shrink-0" />
          <span class="flex-1 min-w-0">{{ exportSuccess }}</span>
          <button v-if="exportFilePath && isAndroid()" class="btn-tonal !h-7 !px-3 !text-xs shrink-0" @click="handleShare">
            <ShareIcon class="w-3.5 h-3.5" /> {{ i18n.t('previewExportShare') }}
          </button>
        </div>
      </Transition>

      <QuestionTable :questions="examStore.questions" />
    </template>
    <PublishExamDialog v-if="showPublish" :questions="examStore.questions" @close="showPublish = false" />
    <JoinExamDialog v-if="showJoin" @close="showJoin = false" />
    <LaunchExamDialog v-if="showLaunch" @close="showLaunch = false" />
  </div>
</template>
