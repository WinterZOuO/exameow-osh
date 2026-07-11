import { ref } from 'vue'

const _input = ref<string | File | null>(null)
const _name = ref('')

export function setFileInput(value: string | File | null) {
  console.log('[fileInput] setFileInput:', typeof value, value instanceof File ? `File(${value.name})` : JSON.stringify(value))
  _input.value = value
  _name.value = typeof value === 'string'
    ? value.split(/[/\\]/).pop() || value
    : (value as File)?.name || ''
}

export function getFileInput() {
  const v = _input.value
  console.log('[fileInput] getFileInput:', typeof v, v instanceof File ? `File(${v.name})` : JSON.stringify(v))
  return v
}

export function getFileName() {
  return _name.value
}

export function clearFileInput() {
  _input.value = null
  _name.value = ''
}

export const fileInputRef = _input
export const fileNameRef = _name

