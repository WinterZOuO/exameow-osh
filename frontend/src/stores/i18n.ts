import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import {
  zh,
  zhTW,
  en,
  ja,
  ko,
  es,
  fr,
  de,
  ru,
  ar,
  SUPPORTED_LOCALES,
  type Locale,
  type LocaleMessages,
} from '@/i18n/locales'

export type { Locale }

const LOCALE_KEY = 'exameow-locale'

const localeMap: Record<Locale, LocaleMessages> = {
  zh,
  'zh-TW': zhTW,
  en,
  ja,
  ko,
  es,
  fr,
  de,
  ru,
  ar,
}

function detectLocale(): Locale {
  const saved = localStorage.getItem(LOCALE_KEY) as Locale
  if (saved && localeMap[saved]) return saved
  const lang = (navigator.language || '').toLowerCase()
  if (lang.startsWith('zh-tw') || lang.startsWith('zh-hk') || lang.startsWith('zh-hant')) return 'zh-TW'
  if (lang.startsWith('zh')) return 'zh'
  if (lang.startsWith('ja')) return 'ja'
  if (lang.startsWith('ko')) return 'ko'
  if (lang.startsWith('es')) return 'es'
  if (lang.startsWith('fr')) return 'fr'
  if (lang.startsWith('de')) return 'de'
  if (lang.startsWith('ru')) return 'ru'
  if (lang.startsWith('ar')) return 'ar'
  return 'en'
}

export const useI18nStore = defineStore('i18n', () => {
  const locale = ref<Locale>(detectLocale())

  // Dynamic RTL / LTR document direction switching
  watch(locale, (newLoc) => {
    document.documentElement.dir = newLoc === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.lang = newLoc
  }, { immediate: true })

  const messages = computed<LocaleMessages>(() => localeMap[locale.value] || en)

  // 送俾 LLM 嘅語言名。原本 PracticeView 寫死 `locale === 'zh' ? 'Chinese' : 'English'`，
  // 令繁體 / 日 / 韓 / 西 / 法 / 德 / 俄 / 阿 全部退化成英文解釋。
  const promptLanguageMap: Record<Locale, string> = {
    zh: 'Simplified Chinese',
    'zh-TW': 'Traditional Chinese',
    en: 'English',
    ja: 'Japanese',
    ko: 'Korean',
    es: 'Spanish',
    fr: 'French',
    de: 'German',
    ru: 'Russian',
    ar: 'Arabic',
  }
  const promptLanguage = computed(() => promptLanguageMap[locale.value] || 'English')

  function setLocale(newLocale: Locale) {
    if (localeMap[newLocale]) {
      locale.value = newLocale
      localStorage.setItem(LOCALE_KEY, newLocale)
    }
  }

  function toggle() {
    const list: Locale[] = ['zh', 'zh-TW', 'en', 'ja', 'ko', 'es', 'fr', 'de', 'ru', 'ar']
    const nextIdx = (list.indexOf(locale.value) + 1) % list.length
    setLocale(list[nextIdx]!)
  }

  function t(key: keyof LocaleMessages, params?: Record<string, string | number>): string {
    let text = messages.value[key] || en[key] || String(key)
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        text = text.replace(`{${k}}`, String(v))
      }
    }
    return text
  }

  return { locale, messages, promptLanguage, setLocale, toggle, t, supportedLocales: SUPPORTED_LOCALES }
})
