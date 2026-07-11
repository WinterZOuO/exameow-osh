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

const canGenerate = computed(() =>
  fileSelected.value && examStore.questionTypes.length > 0 && examStore.count > 0 && configStore.configured,
)

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
  <div class="mb-8">
    <h1 class="text-h4 font-weight-bold mb-1" style="letter-spacing: -0.5px;">Generate</h1>
    <p class="text-body-1 text-medium-emphasis mb-6">Upload a document and configure exam parameters</p>

    <v-row>
      <v-col cols="12" md="6">
        <v-card class="mb-4 h-100" style="min-height: 240px;">
          <v-card-text class="d-flex flex-column justify-center align-center h-100">
            <FileUploader :is-tauri="isTauri" @file-selected="onFileSelected" />
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <ParamForm />
      </v-col>
    </v-row>

    <v-alert v-if="error" type="error" closable class="mt-4">
      {{ error }}
    </v-alert>

    <div class="text-center mt-8">
      <v-btn
        size="x-large"
        color="primary"
        variant="flat"
        rounded="pill"
        :loading="examStore.generating"
        :disabled="!canGenerate"
        style="font-weight: 700; min-width: 240px; min-height: 56px; font-size: 16px;"
        @click="handleGenerate"
      >
        <v-icon v-if="!examStore.generating" icon="mdi-magic-staff" start />
        {{ examStore.generating ? 'Generating...' : 'Generate Questions' }}
      </v-btn>
    </div>

    <div class="mt-6" style="max-width: 480px; margin-inline: auto;">
      <v-fade-transition>
        <v-progress-linear v-if="examStore.generating" indeterminate color="primary" />
      </v-fade-transition>
    </div>
  </div>
</template>
