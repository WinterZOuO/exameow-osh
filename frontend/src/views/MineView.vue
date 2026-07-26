<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useI18nStore } from '@/stores/i18n'
import {
  CpuChipIcon,
  PaperAirplaneIcon,
  PencilSquareIcon,
  ChartBarIcon,
  ChevronRightIcon,
  Cog6ToothIcon,
} from '@heroicons/vue/24/outline'

const router = useRouter()
const i18n = useI18nStore()
const version = import.meta.env.VITE_APP_VERSION

const entries = [
  { key: 'mineAIConfig', descKey: 'mineAIConfigDesc', path: '/mine/config', icon: CpuChipIcon },
  { key: 'mineRecords', descKey: 'mineRecordsDesc', path: '/mine/records', icon: ChartBarIcon },
  { key: 'minePublished', descKey: 'minePublishedDesc', path: '/mine/published', icon: PaperAirplaneIcon },
  { key: 'mineJoined', descKey: 'mineJoinedDesc', path: '/mine/joined', icon: PencilSquareIcon },
  { key: 'mineSettings', descKey: 'mineSettingsDesc', path: '/mine/settings', icon: Cog6ToothIcon },
] as const
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-1">
      <h1 class="text-display-sm">{{ i18n.t('navMine') }}</h1>
      <span class="text-body-sm" style="color: rgb(var(--md-on-surface-variant))">v{{ version }}</span>
    </div>
    <p class="text-body-lg mb-6" style="color: rgb(var(--md-on-surface-variant))">{{ i18n.t('mineSubtitle') }}</p>

    <div class="space-y-3">
      <button
        v-for="e in entries"
        :key="e.path"
        class="card-outlined w-full flex items-center gap-4 p-4 sm:p-5 text-left transition-all duration-200 hover:elevation-1"
        @click="router.push(e.path)"
      >
        <div
          class="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
          style="background-color: rgb(var(--md-secondary-container)); color: rgb(var(--md-on-secondary-container))"
        >
          <component :is="e.icon" class="w-6 h-6" />
        </div>
        <div class="flex-1 min-w-0">
          <div class="text-title-sm">{{ i18n.t(e.key) }}</div>
          <div class="text-body-sm" style="color: rgb(var(--md-on-surface-variant))">{{ i18n.t(e.descKey) }}</div>
        </div>
        <ChevronRightIcon class="w-5 h-5 shrink-0" style="color: rgb(var(--md-on-surface-variant))" />
      </button>
    </div>

    <div class="mt-8 flex items-center justify-center gap-4">
      <button
        class="text-body-sm underline"
        style="color: rgb(var(--md-on-surface-variant))"
        @click="router.push('/privacy')"
      >
        {{ i18n.t('privacyTitle') }}
      </button>
      <button
        class="text-body-sm underline"
        style="color: rgb(var(--md-on-surface-variant))"
        @click="router.push('/terms')"
      >
        {{ i18n.t('termsTitle') }}
      </button>
    </div>
  </div>
</template>
