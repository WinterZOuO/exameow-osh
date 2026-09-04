<script setup lang="ts">
import { computed, type Component } from 'vue'
import { useRouter } from 'vue-router'
import { useI18nStore } from '@/stores/i18n'
import { useAuthStore } from '@/stores/auth'
import type { LocaleMessages } from '@/i18n/locales'
import {
  CpuChipIcon,
  PaperAirplaneIcon,
  PencilSquareIcon,
  ChartBarIcon,
  ChevronRightIcon,
  Cog6ToothIcon,
  ArrowRightStartOnRectangleIcon,
  UserGroupIcon,
  UsersIcon,
} from '@heroicons/vue/24/outline'

const router = useRouter()
const i18n = useI18nStore()
const auth = useAuthStore()

async function handleLogout() {
  await auth.logout()
  await router.replace({ name: 'login' })
}
const version = import.meta.env.VITE_APP_VERSION

interface MineEntry {
  key: keyof LocaleMessages
  descKey: keyof LocaleMessages
  path: string
  icon: Component
}

const entries = computed<MineEntry[]>(() => [
  { key: 'mineCourses', descKey: 'mineCoursesDesc', path: '/courses', icon: UserGroupIcon },
  { key: 'mineAIConfig', descKey: 'mineAIConfigDesc', path: '/mine/config', icon: CpuChipIcon },
  { key: 'mineRecords', descKey: 'mineRecordsDesc', path: '/mine/records', icon: ChartBarIcon },
  { key: 'minePublished', descKey: 'minePublishedDesc', path: '/mine/published', icon: PaperAirplaneIcon },
  { key: 'mineJoined', descKey: 'mineJoinedDesc', path: '/mine/joined', icon: PencilSquareIcon },
  // 冇自助註冊，開戶淨係得 admin 做得（見 AdminUsersView）
  ...(auth.isAdmin
    ? [{ key: 'mineUsers' as const, descKey: 'mineUsersDesc' as const, path: '/mine/users', icon: UsersIcon }]
    : []),
  { key: 'mineSettings', descKey: 'mineSettingsDesc', path: '/mine/settings', icon: Cog6ToothIcon },
])
</script>

<template>
  <div class="max-w-3xl mx-auto pb-8">
    <div class="flex items-center justify-between mb-1">
      <h1 class="text-display-sm font-bold tracking-tight">{{ i18n.t('navMine') }}</h1>
      <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold" style="background-color: rgb(var(--md-surface-container-high)); color: rgb(var(--md-on-surface-variant))">v{{ version }}</span>
    </div>
    <p class="text-body-lg mb-6" style="color: rgb(var(--md-on-surface-variant))">{{ i18n.t('mineSubtitle') }}</p>

    <!-- Menu Entries List -->
    <div class="space-y-3.5">
      <button
        v-for="e in entries"
        :key="e.path"
        class="card-filled w-full flex items-center gap-4.5 p-4.5 sm:p-5 text-left transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-[1.01] hover:shadow-md cursor-pointer border border-transparent hover:border-[rgb(var(--md-primary)/0.25)] group"
        @click="router.push(e.path)"
      >
        <div
          class="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110 shadow-xs"
          style="background-color: rgb(var(--md-secondary-container)); color: rgb(var(--md-on-secondary-container))"
        >
          <component :is="e.icon" class="w-6 h-6 stroke-[2]" />
        </div>
        <div class="flex-1 min-w-0">
          <div class="text-title-sm font-bold tracking-tight" style="color: rgb(var(--md-on-surface))">{{ i18n.t(e.key) }}</div>
          <div class="text-body-sm mt-0.5" style="color: rgb(var(--md-on-surface-variant))">{{ i18n.t(e.descKey) }}</div>
        </div>
        <div
          class="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 group-hover:translate-x-1 shrink-0"
          style="background-color: rgb(var(--md-surface-container-highest)); color: rgb(var(--md-on-surface-variant))"
        >
          <ChevronRightIcon class="w-4.5 h-4.5 stroke-[2.5] rtl:rotate-180" />
        </div>
      </button>
    </div>

    <!-- 帳號 -->
    <div class="mt-6 card-filled p-4 shadow-sm border border-[rgb(var(--md-outline-variant)/0.3)]">
      <div class="flex items-center justify-between gap-3">
        <div class="min-w-0">
          <p class="font-semibold truncate">{{ auth.user?.username }}</p>
          <p class="text-body-sm" style="color: rgb(var(--md-on-surface-variant))">
            {{ auth.isAdmin ? i18n.t('authRoleAdmin') : i18n.t('authRoleMember') }}
          </p>
        </div>
        <button class="btn-tonal text-sm !px-4 !py-2 shrink-0" @click="handleLogout">
          <ArrowRightStartOnRectangleIcon class="w-4 h-4 rtl:rotate-180" />
          {{ i18n.t('authSignOut') }}
        </button>
      </div>
    </div>

    <!-- Footer Links -->
    <div class="mt-8 flex items-center justify-center gap-6">
      <button
        class="text-body-sm hover:underline font-semibold"
        style="color: rgb(var(--md-on-surface-variant))"
        @click="router.push('/privacy')"
      >
        {{ i18n.t('privacyTitle') }}
      </button>
      <span class="text-xs opacity-40">•</span>
      <button
        class="text-body-sm hover:underline font-semibold"
        style="color: rgb(var(--md-on-surface-variant))"
        @click="router.push('/terms')"
      >
        {{ i18n.t('termsTitle') }}
      </button>
    </div>
  </div>
</template>
