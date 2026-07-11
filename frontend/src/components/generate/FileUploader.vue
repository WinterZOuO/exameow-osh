<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

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
  <v-card variant="outlined" class="pa-4">
    <template v-if="isTauri">
      <v-btn
        block
        variant="outlined"
        prepend-icon="mdi-file-upload"
        @click="handleTauriPick"
      >
        Select Document (TXT, DOCX, PDF)
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
        block
        variant="outlined"
        prepend-icon="mdi-file-upload"
        @click="handleWebPick"
      >
        Select Document (TXT, DOCX, PDF)
      </v-btn>
    </template>

    <div v-if="fileName" class="mt-2 text-body-2 font-weight-medium">
      Selected: {{ fileName }}
    </div>
  </v-card>
</template>
