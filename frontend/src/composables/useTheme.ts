import { ref, watch } from 'vue'
import { isTauri } from '@/utils/platform'

export type Theme = 'system' | 'light' | 'dark'

const THEME_KEY = 'exameow-theme'

function loadTheme(): Theme {
  const saved = localStorage.getItem(THEME_KEY)
  if (saved === 'system' || saved === 'light' || saved === 'dark') return saved
  const legacy = localStorage.getItem('exameow-dark')
  if (legacy === '1') return 'dark'
  if (legacy === '0') return 'light'
  return 'system'
}

const theme = ref<Theme>(loadTheme())
const media = window.matchMedia('(prefers-color-scheme: dark)')

function applyTheme() {
  const dark = theme.value === 'dark' || (theme.value === 'system' && media.matches)
  document.documentElement.classList.toggle('dark', dark)
  localStorage.setItem(THEME_KEY, theme.value)
  if (isTauri()) {
    import('@tauri-apps/api/event')
      .then(({ emit }) => emit('theme-changed', theme.value))
      .catch(() => {})
  }
}

let initialized = false

export function useTheme() {
  if (!initialized) {
    initialized = true
    watch(theme, applyTheme, { immediate: true })
    media.addEventListener('change', () => {
      if (theme.value === 'system') applyTheme()
    })
  }

  function setTheme(t: Theme) {
    theme.value = t
  }

  function cycleTheme() {
    theme.value = theme.value === 'system' ? 'light' : theme.value === 'light' ? 'dark' : 'system'
  }

  return { theme, setTheme, cycleTheme }
}
