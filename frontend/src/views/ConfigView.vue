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

    <Transition name="fade">
      <div v-if="store.configured" class="text-center mt-12">
        <p class="text-base text-[rgb(var(--c-text-secondary))] mb-5">{{ i18n.t('configReady') }}</p>
        <button class="btn-primary !px-8 !py-4 text-base !font-bold" @click="router.push('/generate')">
          <ArrowRightIcon class="w-5 h-5" />
          {{ i18n.t('configReadyCta') }}
        </button>
      </div>
    </Transition>
  </div>
</template>
