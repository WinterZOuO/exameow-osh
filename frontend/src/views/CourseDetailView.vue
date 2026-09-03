<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18nStore } from '@/stores/i18n'
import { useCoursesStore } from '@/stores/courses'
import type { CourseDetail } from '@/api/http'
import {
  ArrowLeftIcon,
  UserGroupIcon,
  ClipboardDocumentIcon,
  ClipboardDocumentCheckIcon,
  TrashIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/vue/24/outline'

const route = useRoute()
const router = useRouter()
const i18n = useI18nStore()
const store = useCoursesStore()

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
}

onMounted(load)

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
