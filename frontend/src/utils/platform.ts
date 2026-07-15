let _isTauri: boolean | null = null

export function isTauri(): boolean {
  if (_isTauri === null) {
    _isTauri = '__TAURI__' in window || '__TAURI_INTERNALS__' in window
  }
  return _isTauri
}

let _isMacOS: boolean | null = null

export function isMacOS(): boolean {
  if (_isMacOS === null) {
    _isMacOS = /Mac|Macintosh/i.test(navigator.userAgent)
  }
  return _isMacOS
}

export function isWindows(): boolean {
  return /Windows|Win/i.test(navigator.userAgent)
}

export function isLinux(): boolean {
  return /Linux/i.test(navigator.userAgent) && !/Android/i.test(navigator.userAgent)
}

export function isAndroid(): boolean {
  return /Android/i.test(navigator.userAgent)
}
