<script setup lang="ts">
import { ref, watch, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18nStore } from '@/stores/i18n'
import { isTauri, isMacOS, isWindows, isLinux } from '@/utils/platform'
import TitleBar from './TitleBar.vue'
import {
  Cog6ToothIcon,
  SparklesIcon,
  SunIcon,
  MoonIcon,
  ComputerDesktopIcon,
  AcademicCapIcon,
  MagnifyingGlassIcon,
} from '@heroicons/vue/24/outline'

const router = useRouter()
const route = useRoute()
const i18n = useI18nStore()

type Theme = 'system' | 'light' | 'dark'
const THEME_KEY = 'exambot-theme'

function loadTheme(): Theme {
  const saved = localStorage.getItem(THEME_KEY)
  if (saved === 'system' || saved === 'light' || saved === 'dark') return saved
  const legacy = localStorage.getItem('exambot-dark')
  if (legacy === '1') return 'dark'
  if (legacy === '0') return 'light'
  return 'system'
}

const theme = ref<Theme>(loadTheme())
const media = window.matchMedia('(prefers-color-scheme: dark)')
const isDesktopTauri = isTauri() && (isWindows() || isMacOS() || isLinux())

function applyTheme() {
  const dark = theme.value === 'dark' || (theme.value === 'system' && media.matches)
  document.documentElement.classList.toggle('dark', dark)
  localStorage.setItem(THEME_KEY, theme.value)
}

function onMediaChange() {
  if (theme.value === 'system') applyTheme()
}

function cycleTheme() {
  theme.value = theme.value === 'system' ? 'light' : theme.value === 'light' ? 'dark' : 'system'
}

watch(theme, applyTheme, { immediate: true })
onMounted(() => media.addEventListener('change', onMediaChange))
onUnmounted(() => media.removeEventListener('change', onMediaChange))

const navItems = [
  { key: 'navPractice', path: '/practice', icon: AcademicCapIcon },
  { key: 'navGenerate', path: '/generate', icon: SparklesIcon },
  { key: 'navSearch', path: '/search', icon: MagnifyingGlassIcon },
  { key: 'navConfig', path: '/config', icon: Cog6ToothIcon },
]

function isNavActive(item: { path: string }): boolean {
  return route.path === item.path || route.path.startsWith(item.path + '/')
}

const currentNavIndex = computed(() => navItems.findIndex(item => isNavActive(item)))

const headerStyle = {
  backgroundColor: 'rgb(var(--md-surface))',
  borderBottom: '1px solid rgb(var(--md-outline-variant) / 0.4)',
} as any
</script>

<template>
  <div class="min-h-screen flex flex-col" :style="{ backgroundColor: 'rgb(var(--md-surface))' }">
    <!-- ====== Desktop TitleBar (Tauri only) ====== -->
    <TitleBar v-if="isDesktopTauri" />

    <!-- ====== Top App Bar ====== -->
    <header
      class="sticky z-30 select-none"
      :class="isDesktopTauri ? 'top-[38px]' : 'top-0 safe-top'"
      :style="headerStyle"
    >
      <div class="mx-auto w-full max-w-[90rem] flex items-center h-14 sm:h-16 gap-2 sm:gap-3 px-3 sm:px-6">
        <!-- Logo (browser / mobile only — desktop shows it in TitleBar) -->
        <router-link
          v-if="!isDesktopTauri"
          to="/practice"
          class="flex items-center gap-3 shrink-0 no-underline"
        >
          <img src="/logo.png" alt="ExamBot" class="w-[38px] h-[38px] rounded-xl shrink-0" />
          <div class="hidden sm:block">
            <div class="text-title-md leading-tight" style="color: rgb(var(--md-on-surface))">{{ i18n.t('appName') }}</div>
            <div class="text-label-sm" style="color: rgb(var(--md-on-surface-variant))">{{ i18n.t('appSubtitle') }}</div>
          </div>
        </router-link>

        <!-- Desktop Nav — Segmented-like pills -->
        <div class="hidden sm:flex items-center" :class="isDesktopTauri ? '' : 'ml-6'">
          <nav
            class="flex items-center p-1 rounded-full gap-0.5"
            style="background-color: rgb(var(--md-surface-container-high))"
          >
            <button
              v-for="item in navItems"
              :key="item.path"
              class="relative flex items-center gap-1.5 px-4 h-9 rounded-full text-sm font-medium transition-all duration-300 ease-out"
              :style="isNavActive(item)
                ? { backgroundColor: 'rgb(var(--md-secondary-container))', color: 'rgb(var(--md-on-secondary-container))' }
                : { color: 'rgb(var(--md-on-surface-variant))' }"
              @click="router.push(item.path)"
            >
              <component :is="item.icon" class="w-4 h-4" />
              {{ i18n.t(item.key as any) }}
            </button>
          </nav>
        </div>

        <!-- Spacer -->
        <div class="flex-1 self-stretch cursor-default" />

        <!-- Actions -->
        <div class="flex items-center gap-1">
          <button
            class="btn-icon text-xs !font-bold"
            @click="i18n.toggle()"
            :style="{ color: 'rgb(var(--md-on-surface-variant))' }"
          >
            {{ i18n.locale === 'zh' ? '中' : 'En' }}
          </button>
          <button class="btn-icon" @click="cycleTheme" :title="theme">
            <ComputerDesktopIcon v-if="theme === 'system'" class="w-5 h-5" />
            <SunIcon v-else-if="theme === 'light'" class="w-5 h-5" />
            <MoonIcon v-else class="w-5 h-5" />
          </button>
        </div>

      </div>
    </header>

    <!-- ====== Main Content ====== -->
    <main class="flex-1 mx-auto w-full max-w-5xl xl:max-w-6xl px-3 sm:px-6 py-3 sm:py-6">
      <router-view v-slot="{ Component }">
        <transition name="slide-up" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <!-- ====== Bottom Navigation Bar (Mobile) ====== -->
    <nav
      class="sm:hidden sticky bottom-0 z-30 safe-bottom"
      :style="{
        backgroundColor: 'rgba(var(--md-surface-container-low) / 0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid rgb(var(--md-outline-variant) / 0.3)',
      }"
    >
      <div class="flex items-center justify-around h-[72px] px-2">
          <!-- Active indicator bar -->
          <div class="relative flex items-center justify-around w-full">
          <!-- Active indicator -->
            <div
                class="absolute top-0 h-8 rounded-2xl transition-all duration-400 ease-out"
                style="background-color: rgb(var(--md-secondary-container))"
                :style="{ width: `calc(100% / ${navItems.length})`, left: `calc(${(currentNavIndex >= 0 ? currentNavIndex : 0)} * 100% / ${navItems.length})` }"
            />

          <button
            v-for="item in navItems"
            :key="item.path"
            class="relative z-10 flex flex-col items-center justify-center gap-0.5 py-2"
              :style="{
                width: `calc(100% / ${navItems.length})`,
              color: isNavActive(item) ? 'rgb(var(--md-on-secondary-container))' : 'rgb(var(--md-on-surface-variant))',
            }"
            @click="router.push(item.path)"
          >
            <component :is="item.icon" class="w-6 h-6 transition-transform duration-300"
                       :style="{ transform: isNavActive(item) ? 'scale(1.1)' : 'scale(1)' }" />
            <span class="text-[11px] font-medium leading-none">{{ i18n.t(item.key as any) }}</span>
          </button>
        </div>
      </div>
    </nav>
  </div>
</template>

<style>
</style>
