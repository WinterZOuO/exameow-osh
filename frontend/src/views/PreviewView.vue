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
const exporting = ref(false)

async function handleExport() {
  exportError.value = ''
  exporting.value = true
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
  } finally {
    exporting.value = false
  }
}

function handleNewBatch() {
  examStore.reset()
  router.push('/generate')
}
</script>

<template>
  <div>
    <div v-if="!examStore.generated" class="mb-8">
    <h1 class="text-h4 font-weight-bold mb-1" style="letter-spacing: -0.5px;">Preview</h1>
    <p class="text-body-1 text-medium-emphasis mb-6">Review generated questions before export</p>

    <v-card class="text-center py-10">
      <v-card-text>
        <div
          style="
            width: 72px; height: 72px; margin: 0 auto;
            border-radius: 20px;
            background: linear-gradient(135deg, #E8F0FE 0%, #F3E8FD 100%);
            display: flex; align-items: center; justify-content: center;
          "
          class="mb-4"
        >
          <v-icon icon="mdi-file-document-outline" size="36" color="primary" />
        </div>
        <h3 class="text-h6 font-weight-bold mb-2">No Questions Yet</h3>
        <p class="text-body-2 text-medium-emphasis mb-4">Generate questions first from the Generate page</p>
        <v-btn color="primary" variant="flat" rounded="pill" @click="router.push('/generate')">
          Go to Generate
        </v-btn>
      </v-card-text>
    </v-card>
  </div>

  <div v-else class="mb-8">
    <div class="d-flex align-center flex-wrap ga-3 mb-4">
      <div>
        <h1 class="text-h4 font-weight-bold mb-1" style="letter-spacing: -0.5px;">Preview</h1>
        <p class="text-body-2 text-medium-emphasis">
          {{ examStore.questions.length }} questions generated
        </p>
      </div>
      <v-spacer />
      <v-btn
        variant="outlined"
        color="on-surface-variant"
        rounded="pill"
        prepend-icon="mdi-arrow-left"
        @click="handleNewBatch"
      >
        New Batch
      </v-btn>
      <v-btn
        color="primary"
        variant="flat"
        rounded="pill"
        size="large"
        :loading="exporting"
        prepend-icon="mdi-download"
        @click="handleExport"
      >
        Export CSV
      </v-btn>
    </div>

    <v-alert v-if="exportError" type="error" closable class="mb-4">
      {{ exportError }}
    </v-alert>

    <QuestionTable :questions="examStore.questions" />
  </div>
</div>
</template>
