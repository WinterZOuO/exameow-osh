import { ref } from 'vue'

const _input = ref<string | File | null>(null)
const _name = ref('')

export function setFileInput(value: string | File | null) {
  _input.value = value
  _name.value = typeof value === 'string'
    ? value.split(/[/\\]/).pop() || value
    : (value as File)?.name || ''
}

export function getFileInput() {
  return _input.value
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

