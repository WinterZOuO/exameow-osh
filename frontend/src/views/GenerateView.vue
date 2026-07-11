<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useExamStore } from '@/stores/exam'
import { useConfigStore } from '@/stores/config'
import FileUploader from '@/components/generate/FileUploader.vue'
import ParamForm from '@/components/generate/ParamForm.vue'

const router = useRouter()
const examStore = useExamStore()
const configStore = useConfigStore()

const isTauri = '__TAURI__' in window
const error = ref('')
const fileSelected = ref(false)

const canGenerate = computed(() => {
  return fileSelected.value && examStore.questionTypes.length > 0 && examStore.count > 0 && configStore.configured
})

function onFileSelected(file: File | null, path: string) {
  fileSelected.value = !!(file || path)
  examStore.selectedFile = file
  examStore.filePath = path
}

async function handleGenerate() {
  error.value = ''
  try {
    await examStore.generate()
    router.push('/preview')
  } catch (e: any) {
    error.value = e.message || String(e)
  }
}
</script>

<template>
  <div>
    <h2 class="text-h5 mb-4">Generate Exam Questions</h2>

    <v-row>
      <v-col cols="12" md="6">
        <FileUploader :is-tauri="isTauri" @file-selected="onFileSelected" />
      </v-col>

      <v-col cols="12" md="6">
        <ParamForm />
      </v-col>
    </v-row>

    <v-alert
      v-if="error"
      type="error"
      variant="tonal"
      closable
      class="mt-4"
    >
      {{ error }}
    </v-alert>

    <div class="text-center mt-6">
      <v-btn
        size="large"
        color="primary"
        variant="flat"
        :loading="examStore.generating"
        :disabled="!canGenerate"
        prepend-icon="mdi-magic-staff"
        @click="handleGenerate"
      >
        {{ examStore.generating ? 'Generating...' : 'Generate Questions' }}
      </v-btn>
    </div>

    <v-progress-linear
      v-if="examStore.generating"
      indeterminate
      color="primary"
      class="mt-4"
    />
  </div>
</template>
