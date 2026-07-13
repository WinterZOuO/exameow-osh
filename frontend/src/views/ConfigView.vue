<script setup lang="ts">
import { useConfigStore } from '@/stores/config'
import ApiSettings from '@/components/config/ApiSettings.vue'
import { useRouter } from 'vue-router'
import { useI18nStore } from '@/stores/i18n'
import { ArrowRightIcon } from '@heroicons/vue/24/outline'

const store = useConfigStore()
const router = useRouter()
const i18n = useI18nStore()
</script>

<template>
  <div>
    <ApiSettings />

    <Transition name="scale">
      <div
        v-if="store.configured"
        class="mt-10 text-center card-filled p-8"
      >
        <div class="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 elevation-1"
             style="background: linear-gradient(135deg, rgb(var(--md-primary)), rgb(var(--md-tertiary)))">
          <svg class="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p class="text-body-lg mb-5" style="color: rgb(var(--md-on-surface-variant))">{{ i18n.t('configReady') }}</p>
        <button class="btn-filled text-base !px-8 !h-12" @click="router.push('/generate')">
          <ArrowRightIcon class="w-5 h-5" />
          {{ i18n.t('configReadyCta') }}
        </button>
      </div>
    </Transition>
  </div>
</template>
