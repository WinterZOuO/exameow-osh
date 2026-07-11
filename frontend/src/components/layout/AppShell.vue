<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18nStore } from '@/stores/i18n'
import {
  Cog6ToothIcon,
  SparklesIcon,
  DocumentTextIcon,
  SunIcon,
  MoonIcon,
} from '@heroicons/vue/24/outline'

const router = useRouter()
const route = useRoute()
const i18n = useI18nStore()

const isDark = ref(false)

function applyDark() {
  document.documentElement.classList.toggle('dark', isDark.value)
  localStorage.setItem('exambot-dark', isDark.value ? '1' : '0')
}

watch(isDark, applyDark, { immediate: true })

// init from localStorage
const saved = localStorage.getItem('exambot-dark')
if (saved === '1') isDark.value = true

const navItems = [
  { key: 'navConfig', path: '/config', icon: Cog6ToothIcon },
  { key: 'navGenerate', path: '/generate', icon: SparklesIcon },
  { key: 'navPreview', path: '/preview', icon: DocumentTextIcon },
]

function isActive(path: string) {
  return route.path === path ? 'btn-primary !px-4 !py-2 text-sm shadow-none' : 'btn-ghost !px-4 !py-2 text-sm'
}
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <!-- Top Bar -->
    <header class="sticky top-0 z-30 bg-[rgb(var(--c-surface))] border-b border-[rgb(var(--c-outline)/0.1)]">
      <div class="mx-auto max-w-5xl flex items-center h-16 px-4 sm:px-6 gap-4">
        <!-- Logo -->
        <router-link to="/" class="flex items-center gap-3 shrink-0 no-underline">
          <svg width="36" height="36" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" class="shrink-0">
            <rect width="40" height="40" rx="12" fill="url(#logoGrad2)"/>
            <defs>
              <linearGradient id="logoGrad2" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                <stop stop-color="#1A6CFF"/>
                <stop offset="1" stop-color="#7C3AED"/>
              </linearGradient>
            </defs>
            <path d="M12 15h6l2.5-3.5L23 15h5v11a2 2 0 01-2 2H14a2 2 0 01-2-2V15z" stroke="white" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M16 21.5l2.5 2.5 5-5" stroke="white" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <div class="hidden sm:block">
            <div class="font-bold text-base leading-tight tracking-tight text-[rgb(var(--c-text))]">{{ i18n.t('appName') }}</div>
            <div class="text-xs font-medium text-[rgb(var(--c-text-secondary))]">{{ i18n.t('appSubtitle') }}</div>
          </div>
        </router-link>

        <!-- Desktop Nav -->
        <div class="hidden sm:flex items-center gap-1 ml-6">
          <button
            v-for="item in navItems"
            :key="item.path"
            :class="isActive(item.path)"
            @click="router.push(item.path)"
          >
            <component :is="item.icon" class="w-4 h-4" />
            {{ i18n.t(item.key as any) }}
          </button>
        </div>

        <div class="flex-1" />

        <!-- Actions -->
        <div class="flex items-center gap-1">
          <button class="btn-ghost !p-2 text-sm font-bold" @click="i18n.toggle()">
            {{ i18n.locale === 'zh' ? '中' : 'En' }}
          </button>
          <button class="btn-ghost !p-2" @click="isDark = !isDark">
            <SunIcon v-if="isDark" class="w-5 h-5" />
            <MoonIcon v-else class="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="flex-1 mx-auto w-full max-w-5xl px-4 sm:px-6 py-6 sm:py-8">
      <router-view v-slot="{ Component }">
        <transition name="slide-up" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <!-- Bottom Nav (Mobile) -->
    <nav class="sm:hidden sticky bottom-0 z-30 bg-[rgb(var(--c-surface))] border-t border-[rgb(var(--c-outline)/0.1)] safe-bottom">
      <div class="flex items-center justify-around h-16 px-2">
        <button
          v-for="item in navItems"
          :key="item.path"
          class="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-2xl transition-colors duration-150 min-w-0"
          :class="route.path === item.path
            ? 'text-primary-500'
            : 'text-[rgb(var(--c-text-secondary))]'"
          @click="router.push(item.path)"
        >
          <component :is="item.icon" class="w-6 h-6" />
          <span class="text-[10px] font-medium leading-none">{{ i18n.t(item.key as any) }}</span>
        </button>
      </div>
    </nav>
  </div>
</template>

<style scoped>
.safe-bottom { padding-bottom: env(safe-area-inset-bottom, 0px); }
</style>
