<script setup lang="ts">
import { useConfigStore } from '@/stores/config'
import ApiSettings from '@/components/config/ApiSettings.vue'
import { useRouter } from 'vue-router'

const store = useConfigStore()
const router = useRouter()
</script>

<template>
  <div>
    <ApiSettings />

    <div class="text-center mt-6">
      <v-btn
        v-if="store.configured"
        size="large"
        color="primary"
        variant="flat"
        prepend-icon="mdi-arrow-right"
        @click="router.push('/generate')"
      >
        Start Generating
      </v-btn>
    </div>
  </div>
</template>
