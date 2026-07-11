<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18nStore } from '@/stores/i18n'
import { DocumentArrowUpIcon, DocumentTextIcon, XMarkIcon } from '@heroicons/vue/24/outline'

const i18n = useI18nStore()
const props = defineProps<{ isTauri: boolean }>()
const emit = defineEmits<{ fileSelected: [file: File | null, path: string] }>()

const file = ref<File | null>(null)
const filePath = ref('')
const fileInput = ref<HTMLInputElement>()
let openDialogFn: any = null

onMounted(async () => {
  if (props.isTauri) {
    try { const mod = await import('@tauri-apps/plugin-dialog'); openDialogFn = mod.open } catch {}
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

function clear() {
  file.value = null; filePath.value = ''
  emit('fileSelected', null, '')
}

async function pick() {
  if (props.isTauri && openDialogFn) {
    const selected = await openDialogFn({ multiple: false, filters: [{ name: 'Documents', extensions: ['txt', 'docx', 'pdf'] }] })
    if (selected) { filePath.value = selected as string; emit('fileSelected', null, filePath.value) }
  } else {
    fileInput.value?.click()
  }
}

function onWebFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  if (input.files?.length) { file.value = input.files[0] ?? null; emit('fileSelected', file.value, '') }
}
</script>

<template>
  <div class="text-center">
    <button
      v-if="!fileName"
      class="flex flex-col items-center gap-3 group"
      @click="pick"
    >
      <div class="w-16 h-16 rounded-2xl flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 group-hover:scale-105 transition-transform">
        <DocumentArrowUpIcon class="w-8 h-8 text-primary-500" />
      </div>
      <div>
        <div class="font-semibold text-sm text-primary-500">{{ i18n.t('genSelectFile') }}</div>
        <div class="text-xs text-[rgb(var(--c-text-secondary))] mt-1">{{ i18n.t('genFileHint') }}</div>
      </div>

      <input
        v-if="!isTauri"
        ref="fileInput"
        type="file"
        accept=".txt,.docx,.pdf"
        class="hidden"
        @change="onWebFileChange"
      />
    </button>

    <Transition name="fade">
      <div v-if="fileName" class="inline-flex items-center gap-2 px-4 py-2 rounded-pill bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-300">
        <DocumentTextIcon class="w-4 h-4" />
        <span class="text-sm font-medium truncate max-w-[200px]">{{ fileName }}</span>
        <button class="hover:bg-primary-200 dark:hover:bg-primary-800 rounded-full p-0.5" @click.stop="clear">
          <XMarkIcon class="w-4 h-4" />
        </button>
      </div>
    </Transition>
  </div>
</template>
