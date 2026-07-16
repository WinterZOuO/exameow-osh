<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useI18nStore } from '@/stores/i18n'
import { usePracticeStore } from '@/stores/practice'
import { useConfigStore } from '@/stores/config'
import { api } from '@/api'
import { isCloudflare } from '@/utils/platform'
import { searchQuestions, type MatchScope, type SearchHit } from '@/utils/questionSearch'
import type { AnswerResult, QuestionType } from '@exambot/shared'
import {
  ArrowLeftIcon,
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  SparklesIcon,
  ChevronDownIcon,
} from '@heroicons/vue/24/outline'

const router = useRouter()
const i18n = useI18nStore()
const practiceStore = usePracticeStore()
const configStore = useConfigStore()

const SETTINGS_KEY = 'exambot-search-settings'

const ALL_TYPES = ['single_choice', 'multi_choice', 'true_false', 'fill_blank', 'short_answer'] as QuestionType[]

const typeLabelKeys: Record<string, 'typeSingle' | 'typeMulti' | 'typeTrueFalse' | 'typeFillBlank' | 'typeShortAnswer'> = {
  single_choice: 'typeSingle',
  multi_choice: 'typeMulti',
  true_false: 'typeTrueFalse',
  fill_blank: 'typeFillBlank',
  short_answer: 'typeShortAnswer',
}

// ---------- settings (persisted) ----------
interface StoredSettings {
  bankIds: string[] | null
  scope: MatchScope
  types: string[] | null
}

function loadSettings(): StoredSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (raw) return { bankIds: null, scope: 'stem', types: null, ...JSON.parse(raw) }
  } catch {}
  return { bankIds: null, scope: 'stem', types: null }
}

const stored = loadSettings()
const selectedBankIds = ref<string[] | null>(stored.bankIds)
const scope = ref<MatchScope>(stored.scope === 'stem_options' ? 'stem_options' : 'stem')
const selectedTypes = ref<string[] | null>(stored.types)
const showSettings = ref(false)

watch(
  [selectedBankIds, scope, selectedTypes],
  () => {
    try {
      localStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify({ bankIds: selectedBankIds.value, scope: scope.value, types: selectedTypes.value }),
      )
    } catch {}
  },
  { deep: true },
)

function toggleBank(id: string) {
  if (selectedBankIds.value === null) {
    selectedBankIds.value = [id]
    return
  }
  const idx = selectedBankIds.value.indexOf(id)
  if (idx >= 0) {
    selectedBankIds.value.splice(idx, 1)
    if (selectedBankIds.value.length === 0) selectedBankIds.value = null
  } else {
    selectedBankIds.value.push(id)
  }
}

function toggleType(t: string) {
  if (selectedTypes.value === null) {
    selectedTypes.value = [t]
    return
  }
  const idx = selectedTypes.value.indexOf(t)
  if (idx >= 0) {
    selectedTypes.value.splice(idx, 1)
    if (selectedTypes.value.length === 0) selectedTypes.value = null
  } else {
    selectedTypes.value.push(t)
  }
}

// ---------- search ----------
const query = ref('')
const hits = ref<SearchHit[]>([])
const searched = ref(false)
let debounceTimer: ReturnType<typeof setTimeout> | null = null

function runSearch() {
  hits.value = searchQuestions(query.value, practiceStore.banks, {
    bankIds: selectedBankIds.value,
    scope: scope.value,
    types: selectedTypes.value as QuestionType[] | null,
  })
  searched.value = query.value.trim().length > 0
}

watch(
  [query, selectedBankIds, scope, selectedTypes],
  () => {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(runSearch, 200)
  },
  { deep: true },
)

const expandedAnalysis = ref(new Set<string>())

function hitKey(hit: SearchHit, idx: number): string {
  return `${hit.bankId}-${hit.question.id}-${idx}`
}

function toggleAnalysis(key: string) {
  if (expandedAnalysis.value.has(key)) expandedAnalysis.value.delete(key)
  else expandedAnalysis.value.add(key)
}

function isCorrectOption(hit: SearchHit, idx: number): boolean {
  const q = hit.question
  if (q.type === 'single_choice' || q.type === 'multi_choice') {
    const letters = q.answer.toUpperCase().replace(/[^A-H]/g, '')
    return letters.includes(String.fromCharCode(65 + idx))
  }
  if (q.type === 'true_false') {
    return q.answer.trim().toLowerCase() === (q.options[idx] || '').trim().toLowerCase()
  }
  return false
}

// ---------- AI answer ----------
const aiLoading = ref(false)
const aiError = ref('')
const aiResult = ref<AnswerResult | null>(null)
let abortController: AbortController | null = null

watch(query, () => {
  aiResult.value = null
  aiError.value = ''
})

async function askAI() {
  const q = query.value.trim()
  if (!q || aiLoading.value) return
  if (!configStore.configured) {
    aiError.value = i18n.t('searchNotConfigured')
    return
  }
  aiLoading.value = true
  aiError.value = ''
  aiResult.value = null
  abortController = new AbortController()
  const language = i18n.locale === 'zh' ? 'Chinese' : 'English'
  try {
    const config = configStore.getConfig()
    if (isCloudflare() && configStore.aiProvider === 'custom') {
      const { answerViaCustomAI } = await import('@/utils/answerClient')
      aiResult.value = await answerViaCustomAI(q, language, config, abortController.signal)
    } else {
      aiResult.value = await api.answerQuestion(q, language, config, abortController.signal)
    }
  } catch (e: any) {
    if (e?.name !== 'AbortError') aiError.value = e?.message || String(e)
  } finally {
    aiLoading.value = false
    abortController = null
  }
}

function cancelAI() {
  abortController?.abort()
  aiLoading.value = false
}

onMounted(() => {
  if (!configStore.configured) configStore.loadSaved()
})

onBeforeUnmount(() => {
  if (debounceTimer) clearTimeout(debounceTimer)
  abortController?.abort()
})

const hasBanks = computed(() => practiceStore.banks.length > 0)
</script>

<template>
  <div>
    <!-- Header -->
    <div class="flex items-center gap-2 mb-1">
      <button class="btn-icon" @click="router.push('/search')">
        <ArrowLeftIcon class="w-5 h-5" />
      </button>
      <h1 class="text-display-sm">{{ i18n.t('searchModeText') }}</h1>
    </div>
    <p class="text-body-lg mb-4" style="color: rgb(var(--md-on-surface-variant))">{{ i18n.t('searchModeTextDesc') }}</p>

    <!-- Search input -->
    <div class="card-filled p-4 mb-4">
      <div class="flex items-start gap-2">
        <MagnifyingGlassIcon class="w-5 h-5 mt-2 shrink-0" style="color: rgb(var(--md-on-surface-variant))" />
        <textarea
          v-model="query"
          rows="2"
          class="flex-1 bg-transparent resize-none outline-none text-body-lg"
          :placeholder="i18n.t('searchInputPlaceholder')"
          style="color: rgb(var(--md-on-surface))"
        />
        <button
          class="btn-icon shrink-0"
          :style="{ color: showSettings ? 'rgb(var(--md-primary))' : 'rgb(var(--md-on-surface-variant))' }"
          @click="showSettings = !showSettings"
          :title="i18n.t('searchSettings')"
        >
          <AdjustmentsHorizontalIcon class="w-5 h-5" />
        </button>
      </div>

      <!-- Settings panel -->
      <div v-if="showSettings" class="mt-4 pt-4 space-y-4" style="border-top: 1px solid rgb(var(--md-outline-variant) / 0.4)">
        <!-- Bank scope -->
        <div>
          <div class="text-label-lg mb-2" style="color: rgb(var(--md-on-surface-variant))">{{ i18n.t('searchBankScope') }}</div>
          <div class="flex flex-wrap gap-2">
            <button
              class="chip-filter"
              :class="{ 'chip-filter-active': selectedBankIds === null }"
              @click="selectedBankIds = null"
            >
              {{ i18n.t('searchAllBanks') }}
            </button>
            <button
              v-for="bank in practiceStore.banks"
              :key="bank.id"
              class="chip-filter"
              :class="{ 'chip-filter-active': selectedBankIds !== null && selectedBankIds.includes(bank.id) }"
              @click="toggleBank(bank.id)"
            >
              {{ bank.name }}
            </button>
          </div>
        </div>

        <!-- Match scope -->
        <div>
          <div class="text-label-lg mb-2" style="color: rgb(var(--md-on-surface-variant))">{{ i18n.t('searchMatchScope') }}</div>
          <div class="flex flex-wrap gap-2">
            <button class="chip-filter" :class="{ 'chip-filter-active': scope === 'stem' }" @click="scope = 'stem'">
              {{ i18n.t('searchMatchStem') }}
            </button>
            <button class="chip-filter" :class="{ 'chip-filter-active': scope === 'stem_options' }" @click="scope = 'stem_options'">
              {{ i18n.t('searchMatchStemOptions') }}
            </button>
          </div>
        </div>

        <!-- Type filter -->
        <div>
          <div class="text-label-lg mb-2" style="color: rgb(var(--md-on-surface-variant))">{{ i18n.t('searchTypeFilter') }}</div>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="t in ALL_TYPES"
              :key="t"
              class="chip-filter"
              :class="{ 'chip-filter-active': selectedTypes === null || selectedTypes.includes(t) }"
              @click="toggleType(t)"
            >
              {{ i18n.t(typeLabelKeys[t]!) }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- AI row -->
    <div class="flex items-center justify-between mb-4">
      <span v-if="searched" class="text-body-md" style="color: rgb(var(--md-on-surface-variant))">
        {{ i18n.t('searchResultCount', { count: hits.length }) }}
      </span>
      <span v-else />
      <button class="btn-tonal text-sm flex items-center gap-1.5" :disabled="!query.trim() || aiLoading" @click="askAI">
        <SparklesIcon class="w-4 h-4" />
        {{ i18n.t('searchAskAI') }}
      </button>
    </div>

    <!-- AI card -->
    <div
      v-if="aiLoading || aiError || aiResult"
      class="card-filled p-4 sm:p-5 mb-4 border"
      :style="{ borderColor: 'rgb(var(--md-primary) / 0.4)' }"
    >
      <div class="flex items-center gap-2 mb-2">
        <SparklesIcon class="w-5 h-5" style="color: rgb(var(--md-primary))" />
        <span class="text-title-md" style="color: rgb(var(--md-primary))">{{ i18n.t('searchAskAI') }}</span>
      </div>

      <div v-if="aiLoading" class="flex items-center justify-between">
        <span class="text-body-md" style="color: rgb(var(--md-on-surface-variant))">{{ i18n.t('searchAiThinking') }}</span>
        <button class="btn-outlined !h-8 text-xs !px-3" @click="cancelAI">{{ i18n.t('searchCancel') }}</button>
      </div>

      <div v-else-if="aiError">
        <p class="text-body-md mb-3" :style="{ color: 'rgb(var(--md-error))' }">{{ aiError }}</p>
        <div class="flex gap-2">
          <button class="btn-tonal !h-8 text-xs !px-3" @click="askAI">{{ i18n.t('searchRetry') }}</button>
          <button
            v-if="aiError === i18n.t('searchNotConfigured')"
            class="btn-outlined !h-8 text-xs !px-3"
            @click="router.push('/config')"
          >
            {{ i18n.t('searchGotoConfig') }}
          </button>
        </div>
      </div>

      <div v-else-if="aiResult" class="space-y-3">
        <div>
          <div class="text-label-lg mb-1" style="color: rgb(var(--md-on-surface-variant))">{{ i18n.t('tableAnswer') }}</div>
          <p class="text-body-lg whitespace-pre-wrap">{{ aiResult.answer }}</p>
        </div>
        <div>
          <div class="text-label-lg mb-1" style="color: rgb(var(--md-on-surface-variant))">{{ i18n.t('tableAnalysis') }}</div>
          <p class="text-body-md whitespace-pre-wrap" style="color: rgb(var(--md-on-surface-variant))">{{ aiResult.analysis }}</p>
        </div>
      </div>
    </div>

    <!-- Empty states -->
    <div v-if="!hasBanks" class="card-outlined p-8 text-center">
      <p class="text-body-lg" style="color: rgb(var(--md-on-surface-variant))">{{ i18n.t('searchNoBanks') }}</p>
    </div>
    <div v-else-if="searched && hits.length === 0" class="card-outlined p-8 text-center">
      <h3 class="text-title-lg mb-1">{{ i18n.t('searchNoResults') }}</h3>
      <p class="text-body-md" style="color: rgb(var(--md-on-surface-variant))">{{ i18n.t('searchNoResultsHint') }}</p>
    </div>

    <!-- Results -->
    <div class="space-y-3">
      <div v-for="(hit, idx) in hits" :key="hitKey(hit, idx)" class="card-outlined p-4">
        <!-- meta row -->
        <div class="flex items-center gap-2 flex-wrap mb-2">
          <span
            class="text-[11px] font-medium px-2 py-0.5 rounded-full"
            :style="{ backgroundColor: 'rgb(var(--md-secondary-container))', color: 'rgb(var(--md-on-secondary-container))' }"
          >
            {{ i18n.t(typeLabelKeys[hit.question.type] || 'typeShortAnswer') }}
          </span>
          <span
            class="text-[11px] px-2 py-0.5 rounded-full truncate max-w-[50%]"
            :style="{ backgroundColor: 'rgb(var(--md-surface-container-highest))', color: 'rgb(var(--md-on-surface-variant))' }"
          >
            {{ hit.bankName }}
          </span>
          <span class="text-[11px] ml-auto tabular-nums" style="color: rgb(var(--md-primary))">
            {{ i18n.t('searchSimilarity') }} {{ Math.round(hit.score * 100) }}%
          </span>
        </div>

        <!-- stem -->
        <p class="text-body-lg mb-2 whitespace-pre-wrap">{{ hit.question.stem }}</p>

        <!-- options -->
        <div v-if="hit.question.options.length" class="space-y-1 mb-2">
          <div
            v-for="(opt, oi) in hit.question.options"
            :key="oi"
            class="text-body-md flex gap-2"
            :style="{
              color: isCorrectOption(hit, oi) ? 'rgb(var(--md-primary))' : 'rgb(var(--md-on-surface-variant))',
              fontWeight: isCorrectOption(hit, oi) ? 600 : 400,
            }"
          >
            <span>{{ String.fromCharCode(65 + oi) }}.</span>
            <span class="whitespace-pre-wrap">{{ opt }}</span>
          </div>
        </div>

        <!-- answer -->
        <div class="text-body-md mb-1">
          <span class="text-label-lg mr-2" style="color: rgb(var(--md-on-surface-variant))">{{ i18n.t('tableAnswer') }}</span>
          <span class="font-semibold" style="color: rgb(var(--md-primary))">{{ hit.question.answer }}</span>
        </div>

        <!-- analysis (collapsible) -->
        <template v-if="hit.question.analysis">
          <button
            class="flex items-center gap-1 text-sm font-medium"
            style="color: rgb(var(--md-primary))"
            @click="toggleAnalysis(hitKey(hit, idx))"
          >
            {{ expandedAnalysis.has(hitKey(hit, idx)) ? i18n.t('searchHideAnalysis') : i18n.t('searchShowAnalysis') }}
            <ChevronDownIcon
              class="w-4 h-4 transition-transform"
              :style="{ transform: expandedAnalysis.has(hitKey(hit, idx)) ? 'rotate(180deg)' : 'rotate(0)' }"
            />
          </button>
          <p
            v-if="expandedAnalysis.has(hitKey(hit, idx))"
            class="text-body-md mt-2 whitespace-pre-wrap"
            style="color: rgb(var(--md-on-surface-variant))"
          >
            {{ hit.question.analysis }}
          </p>
        </template>
      </div>
    </div>
  </div>
</template>
