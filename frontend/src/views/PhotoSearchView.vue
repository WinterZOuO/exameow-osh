<script setup lang="ts">
import { ref, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useI18nStore } from '@/stores/i18n'
import { useVisionConfigStore } from '@/stores/visionConfig'
import { useImageSearch } from '@/composables/useImageSearch'
import { isMobileDevice } from '@/utils/platform'
import {
  ArrowLeftIcon,
  CameraIcon,
  PhotoIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
} from '@heroicons/vue/24/outline'

const router = useRouter()
const i18n = useI18nStore()
const visionStore = useVisionConfigStore()
const { phase, error, busy, usedFallback, recognize, cancel } = useImageSearch()

const cameraInput = ref<HTMLInputElement | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const previewUrl = ref('')
const resultText = ref('')
const dragging = ref(false)
let currentFile: File | null = null

const showCamera = isMobileDevice()

function pickCamera() {
  cameraInput.value?.click()
}

function pickFile() {
  fileInput.value?.click()
}

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (file) handleFile(file)
}

function onDrop(e: DragEvent) {
  dragging.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file && file.type.startsWith('image/')) handleFile(file)
}

async function handleFile(file: File, opts: { forceOcr?: boolean } = {}) {
  currentFile = file
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = URL.createObjectURL(file)
  resultText.value = ''
  const text = await recognize(file, opts)
  if (text !== null) resultText.value = text
}

function retryOcr() {
  if (currentFile) handleFile(currentFile, { forceOcr: true })
}

function goSearch() {
  const text = resultText.value.trim()
  if (!text) return
  sessionStorage.setItem('exambot-photo-query', text)
  router.push('/search/text')
}

onBeforeUnmount(() => {
  cancel()
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
})
</script>

<template>
  <div>
    <div class="flex items-center gap-2 mb-1">
      <button class="btn-icon" @click="router.push('/search')">
        <ArrowLeftIcon class="w-5 h-5" />
      </button>
      <h1 class="text-display-sm">{{ i18n.t('searchModePhoto') }}</h1>
    </div>
    <p class="text-body-lg mb-4" style="color: rgb(var(--md-on-surface-variant))">{{ i18n.t('searchModePhotoDesc') }}</p>

    <input ref="cameraInput" type="file" accept="image/*" capture="environment" class="hidden" @change="onFileChange" />
    <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="onFileChange" />

    <div
      class="card-filled p-5 mb-4 text-center transition-all"
      :style="dragging ? { outline: '2px dashed rgb(var(--md-primary))' } : {}"
      @dragover.prevent="dragging = true"
      @dragleave="dragging = false"
      @drop.prevent="onDrop"
    >
      <template v-if="!previewUrl">
        <p class="text-body-md mb-4 hidden sm:block" style="color: rgb(var(--md-on-surface-variant))">
          {{ i18n.t('searchPhotoDropHint') }}
        </p>
        <div class="flex items-center justify-center gap-3">
          <button v-if="showCamera" class="btn-filled" @click="pickCamera">
            <CameraIcon class="w-5 h-5" />
            {{ i18n.t('searchPhotoTake') }}
          </button>
          <button class="btn-tonal" @click="pickFile">
            <PhotoIcon class="w-5 h-5" />
            {{ i18n.t('searchPhotoUpload') }}
          </button>
        </div>
      </template>

      <template v-else>
        <img :src="previewUrl" class="max-h-72 mx-auto rounded-2xl mb-4 object-contain" />
        <div class="flex items-center justify-center gap-3 flex-wrap">
          <button v-if="showCamera" class="btn-tonal text-sm" :disabled="busy" @click="pickCamera">
            <CameraIcon class="w-4 h-4" />
            {{ i18n.t('searchPhotoTake') }}
          </button>
          <button class="btn-tonal text-sm" :disabled="busy" @click="pickFile">
            <ArrowPathIcon class="w-4 h-4" />
            {{ i18n.t('searchPhotoReselect') }}
          </button>
        </div>
      </template>
    </div>

    <div v-if="busy" class="card-outlined p-4 mb-4 flex items-center justify-between">
      <span class="text-body-md" style="color: rgb(var(--md-on-surface-variant))">
        {{ phase === 'loading-model' ? i18n.t('searchPhotoLoadingModel') : i18n.t('searchPhotoRecognizing') }}
      </span>
      <button class="btn-outlined !h-8 text-xs !px-3" @click="cancel">{{ i18n.t('searchCancel') }}</button>
    </div>

    <div v-else-if="error" class="card-outlined p-4 mb-4">
      <p class="text-body-md mb-3" :style="{ color: 'rgb(var(--md-error))' }">{{ error }}</p>
      <div class="flex gap-2 flex-wrap">
        <button class="btn-tonal !h-8 text-xs !px-3" @click="currentFile && handleFile(currentFile)">
          {{ i18n.t('searchRetry') }}
        </button>
        <button v-if="visionStore.mode === 'llm'" class="btn-outlined !h-8 text-xs !px-3" @click="retryOcr">
          {{ i18n.t('searchPhotoOcrRetry') }}
        </button>
      </div>
    </div>

    <p v-if="usedFallback && !busy" class="text-body-sm mb-4" style="color: rgb(var(--md-on-surface-variant))">
      {{ i18n.t('searchPhotoLlmFallback') }}
    </p>

    <div v-if="!busy && previewUrl && !error" class="card-filled p-4">
      <div class="text-label-lg mb-2" style="color: rgb(var(--md-on-surface-variant))">
        {{ i18n.t('searchPhotoResultLabel') }}
      </div>
      <textarea
        v-model="resultText"
        rows="5"
        class="w-full bg-transparent resize-y outline-none text-body-lg mb-1"
        :placeholder="i18n.t('searchPhotoEmpty')"
        style="color: rgb(var(--md-on-surface))"
      />
      <p v-if="!resultText.trim()" class="text-body-sm mb-3" style="color: rgb(var(--md-on-surface-variant))">
        {{ i18n.t('searchPhotoEmpty') }}
      </p>
      <div class="flex justify-end">
        <button class="btn-filled" :disabled="!resultText.trim()" @click="goSearch">
          <MagnifyingGlassIcon class="w-5 h-5" />
          {{ i18n.t('searchPhotoGoSearch') }}
        </button>
      </div>
    </div>
  </div>
</template>
