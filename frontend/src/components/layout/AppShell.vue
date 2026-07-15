<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18nStore } from '@/stores/i18n'
import { isTauri, isMacOS } from '@/utils/platform'
import { getCurrentWindow } from '@tauri-apps/api/window'
import WindowControls from './WindowControls.vue'
import {
  Cog6ToothIcon,
  SparklesIcon,
  DocumentTextIcon,
  SunIcon,
  MoonIcon,
  AcademicCapIcon,
} from '@heroicons/vue/24/outline'

const router = useRouter()
const route = useRoute()
const i18n = useI18nStore()

const isDark = ref(false)
const showWindowControls = isTauri() && !isMacOS()
const isMacOSOverlay = isTauri() && isMacOS()

function handleHeaderMouseDown(event: MouseEvent) {
  if (!isTauri()) return
  const target = event.target as HTMLElement
  if (target.closest('button, a, input, select')) return
  getCurrentWindow().startDragging()
}

function handleHeaderDblClick(event: MouseEvent) {
  if (!isTauri()) return
  const target = event.target as HTMLElement
  if (target.closest('button, a, input, select')) return
  getCurrentWindow().toggleMaximize()
}

function applyDark() {
  document.documentElement.classList.toggle('dark', isDark.value)
  localStorage.setItem('exambot-dark', isDark.value ? '1' : '0')
}

watch(isDark, applyDark, { immediate: true })

const saved = localStorage.getItem('exambot-dark')
if (saved === '1') isDark.value = true

const navItems = [
  { key: 'navPractice', path: '/practice', icon: AcademicCapIcon },
  { key: 'navGenerate', path: '/generate', icon: SparklesIcon },
  { key: 'navPreview', path: '/preview', icon: DocumentTextIcon },
  { key: 'navConfig', path: '/config', icon: Cog6ToothIcon },
]

const currentNavIndex = computed(() => navItems.findIndex(item => item.path === route.path))

const headerStyle = {
  backgroundColor: 'rgb(var(--md-surface))',
  borderBottom: '1px solid rgb(var(--md-outline-variant) / 0.4)',
} as any
</script>

<template>
  <div class="min-h-screen flex flex-col" :style="{ backgroundColor: 'rgb(var(--md-surface))' }">
    <!-- ====== Top App Bar ====== -->
    <header
      class="sticky top-0 z-30 safe-top select-none"
      :style="headerStyle"
      @mousedown="handleHeaderMouseDown"
      @dblclick="handleHeaderDblClick"
    >
      <div
        class="mx-auto w-full max-w-[90rem] flex items-center h-14 sm:h-16 gap-2 sm:gap-3"
        :class="isMacOSOverlay ? 'pl-[80px] pr-3 sm:pl-[84px] sm:pr-6' : 'px-3 sm:px-6'"
      >
        <!-- Logo -->
        <router-link to="/practice" class="flex items-center gap-3 shrink-0 no-underline">
          <img src="/logo.png" alt="ExamBot" class="w-[38px] h-[38px] rounded-xl shrink-0" />
          <div class="hidden sm:block">
            <div class="text-title-md leading-tight" style="color: rgb(var(--md-on-surface))">{{ i18n.t('appName') }}</div>
            <div class="text-label-sm" style="color: rgb(var(--md-on-surface-variant))">{{ i18n.t('appSubtitle') }}</div>
          </div>
        </router-link>

        <!-- Desktop Nav — Segmented-like pills -->
        <div class="hidden sm:flex items-center ml-6">
          <nav
            class="flex items-center p-1 rounded-full gap-0.5"
            style="background-color: rgb(var(--md-surface-container-high))"
          >
            <button
              v-for="item in navItems"
              :key="item.path"
              class="relative flex items-center gap-1.5 px-4 h-9 rounded-full text-sm font-medium transition-all duration-300 ease-out"
              :style="route.path === item.path
                ? { backgroundColor: 'rgb(var(--md-secondary-container))', color: 'rgb(var(--md-on-secondary-container))' }
                : { color: 'rgb(var(--md-on-surface-variant))' }"
              @click="router.push(item.path)"
            >
              <component :is="item.icon" class="w-4 h-4" />
              {{ i18n.t(item.key as any) }}
            </button>
          </nav>
        </div>

        <!-- Drag target spacer — fills remaining height to receive clicks -->
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
          <button class="btn-icon" @click="isDark = !isDark">
            <SunIcon v-if="isDark" class="w-5 h-5" />
            <MoonIcon v-else class="w-5 h-5" />
          </button>
        </div>

      </div>

      <!-- Window Controls (Windows/Linux only) — absolutely positioned at right edge -->
      <WindowControls v-if="showWindowControls" class="absolute right-0 top-0 h-14 sm:h-16" />
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
                style="width: 25%; background-color: rgb(var(--md-secondary-container))"
                :style="{ left: `calc(${(currentNavIndex >= 0 ? currentNavIndex : 0) * 25}%)` }"
            />

          <button
            v-for="item in navItems"
            :key="item.path"
            class="relative z-10 flex flex-col items-center justify-center gap-0.5 py-2"
              :style="{
                width: '25%',
              color: route.path === item.path ? 'rgb(var(--md-on-secondary-container))' : 'rgb(var(--md-on-surface-variant))',
            }"
            @click="router.push(item.path)"
          >
            <component :is="item.icon" class="w-6 h-6 transition-transform duration-300"
                       :style="{ transform: route.path === item.path ? 'scale(1.1)' : 'scale(1)' }" />
            <span class="text-[11px] font-medium leading-none">{{ i18n.t(item.key as any) }}</span>
          </button>
        </div>
      </div>
    </nav>
  </div>
</template>

<style>
</style>
