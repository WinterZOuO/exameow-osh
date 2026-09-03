<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18nStore } from '@/stores/i18n'
import { useAuthStore } from '@/stores/auth'
import { useCoursesStore } from '@/stores/courses'
import { useMaterialsStore } from '@/stores/materials'
import { useQuestionsStore } from '@/stores/questions'
import type { CourseDetail } from '@/api/http'
import {
  ArrowLeftIcon,
  UserGroupIcon,
  ClipboardDocumentIcon,
  ClipboardDocumentCheckIcon,
  TrashIcon,
  ArrowRightOnRectangleIcon,
  DocumentTextIcon,
  ArrowUpTrayIcon,
  QueueListIcon,
  SparklesIcon,
  ChevronDownIcon,
} from '@heroicons/vue/24/outline'

const route = useRoute()
const router = useRouter()
const i18n = useI18nStore()
const auth = useAuthStore()
const store = useCoursesStore()
const materialsStore = useMaterialsStore()
const questionsStore = useQuestionsStore()

const course = ref<CourseDetail | null>(null)
const loadError = ref('')
const actionError = ref('')
const busy = ref(false)
const copied = ref(false)
const confirmDelete = ref(false)

const courseId = computed(() => String(route.params.id))
const isOwner = computed(() => course.value?.role === 'owner')

async function load() {
  loadError.value = ''
  try {
    course.value = await store.getCourse(courseId.value)
  } catch (e: any) {
    loadError.value = e.message || String(e)
  }
  await materialsStore.fetchMaterials(courseId.value)
  await questionsStore.fetchQuestions(courseId.value)
}

onMounted(load)

function goGenerate(materialId?: string) {
  const query: Record<string, string> = { course: courseId.value }
  if (materialId) query.material = materialId
  router.push({ name: 'generate', query })
}

// ---------------------------------------------------------------- 教材（W5）

const materials = computed(() => materialsStore.byCourse[courseId.value] ?? [])
const materialsError = ref('')
const uploading = ref(false)
const confirmDeleteMaterialId = ref<string | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

function formatSize(bytes: number): string {
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

function pickFile() {
  fileInput.value?.click()
}

async function handleFileSelected(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = '' // 等同一個檔案可以再揀多次（例如上次上傳失敗之後重試）
  if (!file) return

  materialsError.value = ''
  if (!/\.(md|markdown)$/i.test(file.name)) {
    materialsError.value = i18n.t('materialsInvalidType')
    return
  }
  if (file.size > 300_000) {
    materialsError.value = i18n.t('materialsTooLarge')
    return
  }

  uploading.value = true
  try {
    await materialsStore.uploadMaterial(courseId.value, file)
  } catch (e: any) {
    materialsError.value = e.message || String(e)
  } finally {
    uploading.value = false
  }
}

async function handleDeleteMaterial(id: string) {
  materialsError.value = ''
  try {
    await materialsStore.deleteMaterial(courseId.value, id)
  } catch (e: any) {
    materialsError.value = e.message || String(e)
  } finally {
    confirmDeleteMaterialId.value = null
  }
}

// ---------------------------------------------------------------- 共享題庫（W6）
// 呢度淨係「睇到成個共享池」——真正抽題練習、寫 attempts 留返 W7

const questions = computed(() => questionsStore.byCourse[courseId.value] ?? [])
const expandedQuestionId = ref<string | null>(null)

const TYPE_LABEL_KEYS: Record<string, string> = {
  single_choice: 'typeSingle',
  multi_choice: 'typeMulti',
  true_false: 'typeTrueFalse',
  fill_blank: 'typeFillBlank',
  short_answer: 'typeShortAnswer',
}

function typeLabel(type: string): string {
  const key = TYPE_LABEL_KEYS[type]
  return key ? i18n.t(key as any) : type
}

function toggleQuestion(id: string) {
  expandedQuestionId.value = expandedQuestionId.value === id ? null : id
}

async function copyJoinCode() {
  if (!course.value) return
  try {
    await navigator.clipboard.writeText(course.value.join_code)
    copied.value = true
    setTimeout(() => (copied.value = false), 2000)
  } catch {
    // clipboard API 可能被政策擋咗，靜靜哋算，用戶可以自己揀字複製
  }
}

async function handleLeave() {
  actionError.value = ''
  busy.value = true
  try {
    await store.leaveCourse(courseId.value)
    router.push('/courses')
  } catch (e: any) {
    actionError.value = e.message || String(e)
  } finally {
    busy.value = false
  }
}

async function handleDelete() {
  actionError.value = ''
  busy.value = true
  try {
    await store.deleteCourse(courseId.value)
    router.push('/courses')
  } catch (e: any) {
    actionError.value = e.message || String(e)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="max-w-3xl mx-auto pb-8">
    <div class="flex items-center gap-3 mb-6">
      <button class="btn-icon" @click="router.push('/courses')">
        <ArrowLeftIcon class="w-5 h-5" />
      </button>
      <div class="min-w-0">
        <h1 class="text-display-sm font-bold tracking-tight truncate">{{ course?.title || '...' }}</h1>
        <p v-if="course" class="text-body-sm" style="color: rgb(var(--md-on-surface-variant))">{{ course.code }}</p>
      </div>
    </div>

    <div v-if="loadError" class="px-4 py-3 rounded-2xl text-sm" style="background-color: rgb(var(--md-error-container)); color: rgb(var(--md-on-error-container))">
      {{ loadError }}
    </div>

    <template v-else-if="course">
      <!-- Join code -->
      <div class="card-filled p-5 sm:p-6 mb-4 shadow-sm border border-[rgb(var(--md-outline-variant)/0.3)]">
        <label class="text-label-md font-semibold block mb-3" style="color: rgb(var(--md-on-surface-variant))">{{ i18n.t('coursesJoinCode') }}</label>
        <div class="flex items-center gap-3">
          <code class="flex-1 text-lg font-mono tracking-widest px-4 py-3 rounded-2xl" style="background-color: rgb(var(--md-surface-container-highest))">{{ course.join_code }}</code>
          <button class="btn-tonal !h-12 !px-4 !rounded-2xl shrink-0" @click="copyJoinCode">
            <ClipboardDocumentCheckIcon v-if="copied" class="w-4 h-4" />
            <ClipboardDocumentIcon v-else class="w-4 h-4" />
            <span>{{ copied ? i18n.t('coursesCopied') : i18n.t('coursesCopy') }}</span>
          </button>
        </div>
        <p class="text-body-sm mt-3" style="color: rgb(var(--md-on-surface-variant))">{{ i18n.t('coursesJoinCodeHint') }}</p>
      </div>

      <!-- Members -->
      <div class="card-filled p-5 sm:p-6 mb-4 shadow-sm border border-[rgb(var(--md-outline-variant)/0.3)]">
        <label class="text-label-md font-semibold flex items-center gap-2 mb-3" style="color: rgb(var(--md-on-surface-variant))">
          <UserGroupIcon class="w-4 h-4" />
          {{ i18n.t('coursesMembers') }}（{{ course.member_count }}）
        </label>
        <div class="space-y-2">
          <div
            v-for="m in course.members"
            :key="m.user_id"
            class="flex items-center justify-between px-3 py-2.5 rounded-xl"
            style="background-color: rgb(var(--md-surface-container-highest))"
          >
            <span class="font-medium">{{ m.username }}</span>
            <span
              v-if="m.role === 'owner'"
              class="text-xs font-medium px-2 py-0.5 rounded-full"
              style="background-color: rgb(var(--md-primary-container)); color: rgb(var(--md-on-primary-container))"
            >{{ i18n.t('coursesOwnerBadge') }}</span>
          </div>
        </div>
      </div>

      <!-- 教材（W5）：原文只有上傳者本人同 admin 睇得到 -->
      <div class="card-filled p-5 sm:p-6 mb-4 shadow-sm border border-[rgb(var(--md-outline-variant)/0.3)]">
        <div class="flex items-center justify-between gap-3 mb-1">
          <label class="text-label-md font-semibold flex items-center gap-2" style="color: rgb(var(--md-on-surface-variant))">
            <DocumentTextIcon class="w-4 h-4" />
            {{ i18n.t('materialsTitle') }}
          </label>
          <button class="btn-tonal text-sm !px-3 !py-1.5" :disabled="uploading" @click="pickFile">
            <ArrowUpTrayIcon class="w-4 h-4" />
            <span>{{ uploading ? i18n.t('materialsUploading') : i18n.t('materialsUpload') }}</span>
          </button>
          <input ref="fileInput" type="file" accept=".md,.markdown" class="hidden" @change="handleFileSelected" />
        </div>
        <p class="text-body-sm mb-3" style="color: rgb(var(--md-on-surface-variant))">{{ i18n.t('materialsHint') }}</p>

        <div v-if="materials.length === 0" class="text-body-sm py-4 text-center" style="color: rgb(var(--md-on-surface-variant))">
          {{ auth.isAdmin ? i18n.t('materialsEmpty') : i18n.t('materialsMineEmpty') }}
        </div>
        <div v-else class="space-y-2">
          <div
            v-for="m in materials"
            :key="m.id"
            class="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl"
            style="background-color: rgb(var(--md-surface-container-highest))"
          >
            <div class="min-w-0">
              <div class="font-medium truncate">{{ m.filename }}</div>
              <div class="text-xs" style="color: rgb(var(--md-on-surface-variant))">
                {{ formatSize(m.size) }}
                <template v-if="auth.isAdmin"> · {{ i18n.t('materialsUploadedBy') }} {{ m.uploader_username }}</template>
              </div>
            </div>
            <div class="shrink-0 flex items-center gap-1">
              <button
                v-if="confirmDeleteMaterialId !== m.id"
                class="btn-icon !w-9 !h-9"
                :title="i18n.t('materialsGenerate')"
                @click="goGenerate(m.id)"
              >
                <SparklesIcon class="w-4 h-4" />
              </button>
              <button
                v-if="confirmDeleteMaterialId !== m.id"
                class="btn-icon !w-9 !h-9"
                style="color: rgb(var(--md-error))"
                :title="i18n.t('materialsDelete')"
                @click="confirmDeleteMaterialId = m.id"
              >
                <TrashIcon class="w-4 h-4" />
              </button>
              <div v-else class="flex items-center gap-2 whitespace-nowrap">
                <span class="text-xs" style="color: rgb(var(--md-on-surface-variant))">{{ i18n.t('materialsDeleteConfirm') }}</span>
                <button class="btn-tonal text-xs !px-2.5 !py-1.5" style="background-color: rgb(var(--md-error-container)); color: rgb(var(--md-on-error-container))" @click="handleDeleteMaterial(m.id)">
                  {{ i18n.t('materialsDeleteConfirmYes') }}
                </button>
                <button class="btn-tonal text-xs !px-2.5 !py-1.5" @click="confirmDeleteMaterialId = null">{{ i18n.t('coursesCancel') }}</button>
              </div>
            </div>
          </div>
        </div>

        <Transition name="scale">
          <div
            v-if="materialsError"
            class="mt-3 px-4 py-3 rounded-2xl text-sm"
            style="background-color: rgb(var(--md-error-container)); color: rgb(var(--md-on-error-container))"
          >
            {{ materialsError }}
          </div>
        </Transition>
      </div>

      <!-- 共享題庫（W6）：課程內所有成員見到晒同一份池，同教材相反 -->
      <div class="card-filled p-5 sm:p-6 mb-4 shadow-sm border border-[rgb(var(--md-outline-variant)/0.3)]">
        <div class="flex items-center justify-between gap-3 mb-1">
          <label class="text-label-md font-semibold flex items-center gap-2" style="color: rgb(var(--md-on-surface-variant))">
            <QueueListIcon class="w-4 h-4" />
            {{ i18n.t('questionsTitle') }}（{{ questions.length }}）
          </label>
          <button class="btn-tonal text-sm !px-3 !py-1.5" @click="goGenerate()">
            <SparklesIcon class="w-4 h-4" />
            <span>{{ i18n.t('questionsGenerate') }}</span>
          </button>
        </div>
        <p class="text-body-sm mb-3" style="color: rgb(var(--md-on-surface-variant))">{{ i18n.t('questionsHint') }}</p>

        <div v-if="questions.length === 0" class="text-body-sm py-4 text-center" style="color: rgb(var(--md-on-surface-variant))">
          {{ i18n.t('questionsEmpty') }}
        </div>
        <div v-else class="space-y-2">
          <div
            v-for="q in questions"
            :key="q.id"
            class="rounded-xl overflow-hidden"
            style="background-color: rgb(var(--md-surface-container-highest))"
          >
            <button class="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left" @click="toggleQuestion(q.id)">
              <div class="min-w-0">
                <div class="text-sm truncate">{{ q.stem }}</div>
                <div class="text-xs" style="color: rgb(var(--md-on-surface-variant))">
                  {{ typeLabel(q.type) }} · {{ i18n.t('questionsContributedBy') }} {{ q.contributor_username }}
                </div>
              </div>
              <ChevronDownIcon
                class="w-4 h-4 shrink-0 transition-transform duration-200"
                :class="{ 'rotate-180': expandedQuestionId === q.id }"
              />
            </button>
            <div v-if="expandedQuestionId === q.id" class="px-3 pb-3 text-sm space-y-1.5">
              <div v-for="(opt, i) in q.options" :key="i" style="color: rgb(var(--md-on-surface-variant))">
                {{ String.fromCharCode(65 + i) }}. {{ opt }}
              </div>
              <div class="font-medium">{{ i18n.t('questionsAnswer') }}：{{ q.answer }}</div>
              <div v-if="q.analysis" style="color: rgb(var(--md-on-surface-variant))">{{ q.analysis }}</div>
            </div>
          </div>
        </div>
      </div>

      <Transition name="scale">
        <div
          v-if="actionError"
          class="mb-4 px-4 py-3 rounded-2xl text-sm"
          style="background-color: rgb(var(--md-error-container)); color: rgb(var(--md-on-error-container))"
        >
          {{ actionError }}
        </div>
      </Transition>

      <!-- 離開 / 刪除 -->
      <div class="flex justify-end">
        <button v-if="!isOwner" class="btn-tonal text-sm !px-4 !py-2" :disabled="busy" @click="handleLeave">
          <ArrowRightOnRectangleIcon class="w-4 h-4 rtl:rotate-180" />
          {{ i18n.t('coursesLeave') }}
        </button>
        <template v-else>
          <button v-if="!confirmDelete" class="btn-tonal text-sm !px-4 !py-2" style="color: rgb(var(--md-error))" @click="confirmDelete = true">
            <TrashIcon class="w-4 h-4" />
            {{ i18n.t('coursesDelete') }}
          </button>
          <div v-else class="flex items-center gap-2">
            <span class="text-body-sm" style="color: rgb(var(--md-on-surface-variant))">{{ i18n.t('coursesDeleteConfirm') }}</span>
            <button class="btn-tonal text-sm !px-4 !py-2" :disabled="busy" style="background-color: rgb(var(--md-error-container)); color: rgb(var(--md-on-error-container))" @click="handleDelete">
              {{ i18n.t('coursesDeleteConfirmYes') }}
            </button>
            <button class="btn-tonal text-sm !px-4 !py-2" @click="confirmDelete = false">{{ i18n.t('coursesCancel') }}</button>
          </div>
        </template>
      </div>
    </template>
  </div>
</template>
