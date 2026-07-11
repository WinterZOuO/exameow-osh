<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18nStore } from '@/stores/i18n'

const i18n = useI18nStore()
const props = defineProps<{ isTauri: boolean }>()
const emit = defineEmits<{ fileSelected: [file: File | null, path: string] }>()

const file = ref<File | null>(null)
const filePath = ref('')
const fileInput = ref<HTMLInputElement>()
let openDialogFn: any = null

onMounted(async () => {
  if (props.isTauri) {
    try {
      const mod = await import('@tauri-apps/plugin-dialog')
      openDialogFn = mod.open
    } catch {}
  }
})

const fileName = computed(() => {
  if (file.value) return file.value.name
  if (filePath.value) {
    const parts = filePath.value.replace(/\\/g, '/').split('/')
    return parts[parts.length - 1] || filePath.value
  }
  return ''
})

const fileSize = computed(() => {
  if (file.value && file.value.size > 0) {
    const kb = file.value.size / 1024
    return kb < 1024 ? `${kb.toFixed(0)} KB` : `${(kb / 1024).toFixed(1)} MB`
  }
  return ''
})

async function handleTauriPick() {
  if (!openDialogFn) return
  const selected = await openDialogFn({
    multiple: false,
    filters: [{ name: 'Documents', extensions: ['txt', 'docx', 'pdf'] }],
  })
  if (selected) {
    filePath.value = selected as string
    emit('fileSelected', null, filePath.value)
  }
}

function handleWebPick() {
  fileInput.value?.click()
}

function onWebFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  if (input.files?.length) {
    file.value = input.files[0] ?? null
    emit('fileSelected', file.value, '')
  }
}
</script>

<template>
  <div class="text-center py-6">
    <div v-if="!fileName" class="mb-4">
      <div
        style="
          width: 72px; height: 72px; margin: 0 auto;
          border-radius: 20px;
          background: linear-gradient(135deg, #E8F0FE 0%, #F3E8FD 100%);
          display: flex; align-items: center; justify-content: center;
          color: #1A6CFF; font-size: 32px;
        "
      >
        <v-icon icon="mdi-file-upload-outline" size="36" color="primary" />
      </div>
    </div>

    <template v-if="isTauri">
      <v-btn
        variant="outlined"
        color="primary"
        size="large"
        rounded="pill"
        @click="handleTauriPick"
      >
        {{ i18n.t('genSelectFile') }}
      </v-btn>
    </template>
    <template v-else>
      <input
        ref="fileInput"
        type="file"
        accept=".txt,.docx,.pdf"
        style="display: none"
        @change="onWebFileChange"
      />
      <v-btn
        variant="outlined"
        color="primary"
        size="large"
        rounded="pill"
        @click="handleWebPick"
      >
        {{ i18n.t('genSelectFile') }}
      </v-btn>
    </template>

    <p class="text-caption mt-3 text-medium-emphasis">{{ i18n.t('genFileHint') }}</p>

    <v-fade-transition>
      <div v-if="fileName" class="mt-4">
        <v-chip
          color="primary"
          variant="tonal"
          size="large"
          prepend-icon="mdi-file-document-outline"
          closable
          @click:close="file = null; filePath = ''; emit('fileSelected', null, '')"
        >
          <span class="font-weight-medium">{{ fileName }}</span>
          <span v-if="fileSize" class="ml-1 text-caption">· {{ fileSize }}</span>
        </v-chip>
      </div>
    </v-fade-transition>
  </div>
</template>
