import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { zh, en, type LocaleMessages } from '@/i18n/locales'

export type Locale = 'zh' | 'en'

export const useI18nStore = defineStore('i18n', () => {
  const locale = ref<Locale>('zh')

  const messages = computed<LocaleMessages>(() => (locale.value === 'zh' ? zh : en))

  function toggle() {
    locale.value = locale.value === 'zh' ? 'en' : 'zh'
  }

  function setLocale(l: Locale) {
    locale.value = l
  }

  function t(key: keyof LocaleMessages, params?: Record<string, string | number>): string {
    let text = messages.value[key] || key
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        text = text.replace(`{${k}}`, String(v))
      }
    }
    return text
  }

  return { locale, messages, toggle, setLocale, t }
})
