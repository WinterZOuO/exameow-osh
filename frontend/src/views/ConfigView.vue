<script setup lang="ts">
import { useConfigStore } from '@/stores/config'
import ApiSettings from '@/components/config/ApiSettings.vue'
import { useRouter } from 'vue-router'
import { useI18nStore } from '@/stores/i18n'

const store = useConfigStore()
const router = useRouter()
const i18n = useI18nStore()
</script>

<template>
  <div>
    <ApiSettings />

    <v-fade-transition>
      <div v-if="store.configured" class="text-center mt-10">
        <p class="text-body-1 text-medium-emphasis mb-4">{{ i18n.t('configReady') }}</p>
        <v-btn
          size="x-large"
          color="primary"
          variant="flat"
          rounded="pill"
          style="font-weight: 700; min-width: 280px; min-height: 56px; font-size: 16px;"
          @click="router.push('/generate')"
        >
          <v-icon icon="mdi-arrow-right" start />
          {{ i18n.t('configReadyCta') }}
        </v-btn>
      </div>
    </v-fade-transition>
  </div>
</template>
