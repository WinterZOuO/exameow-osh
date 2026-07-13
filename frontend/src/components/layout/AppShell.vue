<script setup lang="ts">
import { ref, watch, computed } from 'vue'
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

const saved = localStorage.getItem('exambot-dark')
if (saved === '1') isDark.value = true

const navItems = [
  { key: 'navConfig', path: '/config', icon: Cog6ToothIcon },
  { key: 'navGenerate', path: '/generate', icon: SparklesIcon },
  { key: 'navPreview', path: '/preview', icon: DocumentTextIcon },
]

const currentNavIndex = computed(() => navItems.findIndex(item => item.path === route.path))
</script>

<template>
  <div class="min-h-screen flex flex-col" :style="{ backgroundColor: 'rgb(var(--md-surface))' }">
    <!-- ====== Top App Bar ====== -->
    <header
      class="sticky top-0 z-30 safe-top"
      :style="{ backgroundColor: 'rgb(var(--md-surface))', borderBottom: '1px solid rgb(var(--md-outline-variant) / 0.4)' }"
    >
      <div class="mx-auto w-full max-w-[90rem] flex items-center h-14 sm:h-16 px-3 sm:px-6 gap-2 sm:gap-3">
        <!-- Logo -->
        <router-link to="/" class="flex items-center gap-3 shrink-0 no-underline">
          <!-- Pixel-style rounded square logo -->
          <div class="w-[38px] h-[38px] rounded-2xl flex items-center justify-center shrink-0 elevation-1"
               style="background: linear-gradient(135deg, rgb(var(--md-primary)), rgb(var(--md-tertiary)))">
            <svg width="22" height="22" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 15h6l2.5-3.5L23 15h5v11a2 2 0 01-2 2H14a2 2 0 01-2-2V15z" stroke="white" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M16 21.5l2.5 2.5 5-5" stroke="white" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
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

        <div class="flex-1" />

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
            style="width: 33.33%; background-color: rgb(var(--md-secondary-container))"
            :style="{ left: `calc(${(currentNavIndex >= 0 ? currentNavIndex : 0) * 33.33}%)` }"
          />

          <button
            v-for="item in navItems"
            :key="item.path"
            class="relative z-10 flex flex-col items-center justify-center gap-0.5 py-2"
            :style="{
              width: '33.33%',
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
