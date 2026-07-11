<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useExamStore } from '@/stores/exam'
import { api } from '@/api'
import QuestionTable from '@/components/preview/QuestionTable.vue'

const router = useRouter()
const examStore = useExamStore()
const isTauri = '__TAURI__' in window
const exportError = ref('')

async function handleExport() {
  exportError.value = ''
  try {
    if (isTauri) {
      let saveDialog: any
      try {
        const mod: any = await import('@tauri-apps/plugin-dialog')
        saveDialog = mod.save
      } catch {}
      const savePath = saveDialog
        ? await saveDialog({
            defaultPath: 'exambot_questions.csv',
            filters: [{ name: 'CSV', extensions: ['csv'] }],
          })
        : null
      if (!savePath) return
      await api.exportCsv(examStore.questions, savePath as string)
    } else {
      await api.exportCsv(examStore.questions)
    }
  } catch (e: any) {
    exportError.value = e.message || String(e)
  }
}

function handleBack() {
  examStore.reset()
  router.push('/generate')
}
</script>

<template>
  <div v-if="!examStore.generated">
    <v-empty-state
      title="No Questions Yet"
      text="Generate questions first from the Generate page."
      icon="mdi-alert-circle-outline"
    >
      <template v-slot:actions>
        <v-btn color="primary" variant="flat" @click="router.push('/generate')">
          Go to Generate
        </v-btn>
      </template>
    </v-empty-state>
  </div>

  <div v-else>
    <div class="d-flex align-center mb-4 ga-2">
      <h2 class="text-h5">Generated Questions ({{ examStore.questions.length }})</h2>
      <v-spacer />
      <v-btn variant="outlined" prepend-icon="mdi-arrow-left" @click="handleBack">
        Back
      </v-btn>
      <v-btn
        color="primary"
        variant="flat"
        prepend-icon="mdi-download"
        @click="handleExport"
      >
        Export CSV
      </v-btn>
    </div>

    <v-alert
      v-if="exportError"
      type="error"
      variant="tonal"
      closable
      class="mb-4"
    >
      {{ exportError }}
    </v-alert>

    <QuestionTable :questions="examStore.questions" />
  </div>
</template>
