let _input: string | File | null = null
let _name = ''

export function setFileInput(value: string | File | null, name?: string) {
  _input = value
  _name = name || (typeof value === 'string' ? value.split(/[/\\]/).pop() || value : (value as File)?.name || '')
}

export function getFileInput(): string | File | null {
  return _input
}

export function getFileName(): string {
  return _name
}

export function clearFileInput() {
  _input = null
  _name = ''
}
