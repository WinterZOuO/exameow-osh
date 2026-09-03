<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18nStore } from '@/stores/i18n'
import { useCoursesStore } from '@/stores/courses'
import {
  ArrowLeftIcon,
  UserGroupIcon,
  PlusIcon,
  ArrowRightIcon,
  KeyIcon,
} from '@heroicons/vue/24/outline'

const router = useRouter()
const i18n = useI18nStore()
const store = useCoursesStore()

const showCreate = ref(false)
const showJoin = ref(false)
const newCode = ref('')
const newTitle = ref('')
const joinCode = ref('')
const busy = ref(false)
const formError = ref('')

// 每次入呢頁都重新攞 —— 唔用 ensureLoaded()：課程列表隨時因為其他人 join
// 或者自己喺第二部機度嘅操作而變，唔應該賴住上次個 cache
onMounted(() => store.fetchCourses())

async function handleCreate() {
  formError.value = ''
  if (!newCode.value.trim() || !newTitle.value.trim()) {
    formError.value = i18n.t('coursesFormRequired')
    return
  }
  busy.value = true
  try {
    const course = await store.createCourse(newCode.value.trim(), newTitle.value.trim())
    showCreate.value = false
    newCode.value = ''
    newTitle.value = ''
    router.push(`/courses/${course.id}`)
  } catch (e: any) {
    formError.value = e.message || String(e)
  } finally {
    busy.value = false
  }
}

async function handleJoin() {
  formError.value = ''
  if (!joinCode.value.trim()) {
    formError.value = i18n.t('coursesFormRequired')
    return
  }
  busy.value = true
  try {
    const course = await store.joinCourse(joinCode.value.trim())
    showJoin.value = false
    joinCode.value = ''
    router.push(`/courses/${course.id}`)
  } catch (e: any) {
    formError.value = e.message || String(e)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="max-w-3xl mx-auto pb-8">
    <div class="flex items-center gap-3 mb-6">
      <button class="btn-icon" @click="router.push('/mine')">
        <ArrowLeftIcon class="w-5 h-5" />
      </button>
      <div>
        <h1 class="text-display-sm font-bold tracking-tight">{{ i18n.t('coursesTitle') }}</h1>
        <p class="text-body-sm" style="color: rgb(var(--md-on-surface-variant))">{{ i18n.t('coursesSubtitle') }}</p>
      </div>
    </div>

    <!-- 開新課程 / 加入課程 -->
    <div class="flex items-center gap-3 mb-6">
      <button class="btn-filled !h-11 !px-5" @click="showCreate = true; showJoin = false; formError = ''">
        <PlusIcon class="w-4 h-4" />
        <span>{{ i18n.t('coursesCreate') }}</span>
      </button>
      <button class="btn-tonal !h-11 !px-5" @click="showJoin = true; showCreate = false; formError = ''">
        <KeyIcon class="w-4 h-4" />
        <span>{{ i18n.t('coursesJoin') }}</span>
      </button>
    </div>

    <!-- 開新課程表單 -->
    <div v-if="showCreate" class="card-filled p-5 mb-6 shadow-sm border border-[rgb(var(--md-outline-variant)/0.3)]">
      <label class="text-label-md font-semibold block mb-2" style="color: rgb(var(--md-on-surface-variant))">{{ i18n.t('coursesCode') }}</label>
      <input v-model="newCode" placeholder="OSH5001EP" class="input-outlined !rounded-2xl !py-3 mb-4" />
      <label class="text-label-md font-semibold block mb-2" style="color: rgb(var(--md-on-surface-variant))">{{ i18n.t('coursesCourseTitle') }}</label>
      <input v-model="newTitle" :placeholder="i18n.t('coursesCourseTitlePlaceholder')" class="input-outlined !rounded-2xl !py-3 mb-4" />
      <div class="flex items-center gap-3">
        <button class="btn-filled !h-11 !px-6" :disabled="busy" @click="handleCreate">{{ i18n.t('coursesCreateSubmit') }}</button>
        <button class="btn-tonal !h-11 !px-6" @click="showCreate = false">{{ i18n.t('coursesCancel') }}</button>
      </div>
    </div>

    <!-- 加入課程表單 -->
    <div v-if="showJoin" class="card-filled p-5 mb-6 shadow-sm border border-[rgb(var(--md-outline-variant)/0.3)]">
      <label class="text-label-md font-semibold block mb-2" style="color: rgb(var(--md-on-surface-variant))">{{ i18n.t('coursesJoinCode') }}</label>
      <input v-model="joinCode" placeholder="ABCD1234" class="input-outlined !rounded-2xl !py-3 mb-4 uppercase" />
      <div class="flex items-center gap-3">
        <button class="btn-filled !h-11 !px-6" :disabled="busy" @click="handleJoin">{{ i18n.t('coursesJoinSubmit') }}</button>
        <button class="btn-tonal !h-11 !px-6" @click="showJoin = false">{{ i18n.t('coursesCancel') }}</button>
      </div>
    </div>

    <Transition name="scale">
      <div
        v-if="formError"
        class="mb-6 px-4 py-3 rounded-2xl text-sm"
        style="background-color: rgb(var(--md-error-container)); color: rgb(var(--md-on-error-container))"
      >
        {{ formError }}
      </div>
    </Transition>

    <!-- 課程列表 -->
    <div v-if="store.loading && !store.loaded" class="text-center py-12 text-body-sm" style="color: rgb(var(--md-on-surface-variant))">
      {{ i18n.t('coursesLoading') }}
    </div>
    <div v-else-if="store.courses.length === 0" class="text-center py-16">
      <UserGroupIcon class="w-12 h-12 mx-auto mb-3 opacity-30" />
      <p class="text-body-md" style="color: rgb(var(--md-on-surface-variant))">{{ i18n.t('coursesEmpty') }}</p>
    </div>
    <div v-else class="space-y-3">
      <button
        v-for="c in store.courses"
        :key="c.id"
        class="card-filled w-full flex items-center gap-4 p-4.5 text-left transition-all duration-300 hover:scale-[1.01] hover:shadow-md cursor-pointer border border-transparent hover:border-[rgb(var(--md-primary)/0.25)] group"
        @click="router.push(`/courses/${c.id}`)"
      >
        <div
          class="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
          style="background-color: rgb(var(--md-secondary-container)); color: rgb(var(--md-on-secondary-container))"
        >
          <UserGroupIcon class="w-5 h-5" />
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span class="text-title-sm font-bold tracking-tight truncate">{{ c.title }}</span>
            <span
              v-if="c.role === 'owner'"
              class="shrink-0 text-xs font-medium px-2 py-0.5 rounded-full"
              style="background-color: rgb(var(--md-primary-container)); color: rgb(var(--md-on-primary-container))"
            >{{ i18n.t('coursesOwnerBadge') }}</span>
          </div>
          <div class="text-body-sm mt-0.5 truncate" style="color: rgb(var(--md-on-surface-variant))">
            {{ c.code }} · {{ i18n.t('coursesMemberCount', { count: c.member_count }) }}
          </div>
        </div>
        <ArrowRightIcon class="w-4.5 h-4.5 shrink-0 transition-transform duration-300 group-hover:translate-x-1 rtl:rotate-180" style="color: rgb(var(--md-on-surface-variant))" />
      </button>
    </div>
  </div>
</template>
