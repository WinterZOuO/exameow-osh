<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router'
import { useTheme } from 'vuetify'
import { useI18nStore } from '@/stores/i18n'

const router = useRouter()
const route = useRoute()
const theme = useTheme()
const i18n = useI18nStore()

function toggleTheme() {
  const newTheme = theme.global.current.value.dark ? 'light' : 'dark'
  theme.global.name.value = newTheme
}

const navItems = [
  { title: 'navConfig', icon: 'mdi-tune-variant', path: '/config' },
  { title: 'navGenerate', icon: 'mdi-auto-fix', path: '/generate' },
  { title: 'navPreview', icon: 'mdi-file-document-outline', path: '/preview' },
]
</script>

<template>
  <v-app>
    <v-app-bar
      flat
      density="comfortable"
      class="px-2"
      style="border-bottom: 1px solid rgba(128,128,128,0.12); height: 72px;"
    >
      <template #prepend>
        <div class="d-flex align-center ga-3">
          <div
            style="
              width: 40px; height: 40px;
              border-radius: 14px;
              background: linear-gradient(135deg, #1A6CFF 0%, #8B5CF6 100%);
              display: flex; align-items: center; justify-content: center;
              color: white; font-weight: 700; font-size: 18px;
            "
          >
            E
          </div>
          <div>
            <div style="font-weight: 700; font-size: 18px; line-height: 1.1; letter-spacing: -0.3px;">{{ i18n.t('appName') }}</div>
            <div style="font-size: 12px; color: #5B6F8C; font-weight: 500;">{{ i18n.t('appSubtitle') }}</div>
          </div>
        </div>
      </template>

      <template v-if="$vuetify.display.mdAndUp" #append>
        <div class="d-flex ga-1 align-center">
          <v-btn
            v-for="item in navItems"
            :key="item.path"
            :variant="route.path === item.path ? 'flat' : 'text'"
            :color="route.path === item.path ? 'primary' : 'on-surface-variant'"
            size="small"
            @click="router.push(item.path)"
          >
            <v-icon :icon="item.icon" size="18" start />
            {{ i18n.t(item.title as any) }}
          </v-btn>

          <v-divider vertical class="mx-2" length="24" />

          <v-btn
            icon="mdi-translate"
            variant="text"
            size="small"
            color="on-surface-variant"
            @click="i18n.toggle()"
          >
            <span style="font-size: 12px; font-weight: 700;">{{ i18n.locale === 'zh' ? '中' : 'En' }}</span>
          </v-btn>

          <v-btn
            :icon="theme.global.current.value.dark ? 'mdi-weather-sunny' : 'mdi-weather-night'"
            variant="text"
            size="small"
            color="on-surface-variant"
            @click="toggleTheme"
          />
        </div>
      </template>

      <template v-else #append>
        <div class="d-flex ga-1 align-center">
          <v-btn
            icon
            variant="text"
            size="small"
            color="on-surface-variant"
            @click="i18n.toggle()"
          >
            <span style="font-size: 12px; font-weight: 700;">{{ i18n.locale === 'zh' ? '中' : 'En' }}</span>
          </v-btn>
          <v-btn
            :icon="theme.global.current.value.dark ? 'mdi-weather-sunny' : 'mdi-weather-night'"
            variant="text"
            size="small"
            color="on-surface-variant"
            @click="toggleTheme"
          />
        </div>
      </template>
    </v-app-bar>

    <v-main style="padding-top: 72px; padding-bottom: 72px;">
      <v-container :fluid="$vuetify.display.smAndDown" :class="$vuetify.display.mdAndUp ? 'px-8' : 'px-4'" style="max-width: 960px;">
        <router-view v-slot="{ Component }">
          <v-fade-transition mode="out-in">
            <component :is="Component" />
          </v-fade-transition>
        </router-view>
      </v-container>
    </v-main>

    <v-bottom-navigation
      v-if="$vuetify.display.smAndDown"
      grow
      bg-color="surface"
      style="
        border-top: 1px solid rgba(128,128,128,0.12);
        height: 72px !important;
        padding-bottom: env(safe-area-inset-bottom, 0px);
      "
    >
      <v-btn
        v-for="item in navItems"
        :key="item.path"
        :value="item.path"
        :active="route.path === item.path"
        @click="router.push(item.path)"
        style="text-transform: none; font-weight: 500; font-size: 11px;"
      >
        <v-icon :icon="item.icon" size="22" />
        <span>{{ i18n.t(item.title as any) }}</span>
      </v-btn>
    </v-bottom-navigation>
  </v-app>
</template>
