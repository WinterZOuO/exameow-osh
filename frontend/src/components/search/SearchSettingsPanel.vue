<script setup lang="ts">
import { useI18nStore } from '@/stores/i18n'
import { usePracticeStore } from '@/stores/practice'
import { useSearchSettings } from '@/composables/useSearchSettings'
import type { QuestionType } from '@quizseek/shared'

const ALL_TYPES = ['single_choice', 'multi_choice', 'true_false', 'fill_blank', 'short_answer'] as QuestionType[]

const typeLabelKeys: Record<string, 'typeSingle' | 'typeMulti' | 'typeTrueFalse' | 'typeFillBlank' | 'typeShortAnswer'> = {
  single_choice: 'typeSingle',
  multi_choice: 'typeMulti',
  true_false: 'typeTrueFalse',
  fill_blank: 'typeFillBlank',
  short_answer: 'typeShortAnswer',
}

const i18n = useI18nStore()
const practiceStore = usePracticeStore()
const { selectedBankIds, scope, selectedTypes, toggleBank, toggleType } = useSearchSettings()
</script>

<template>
  <div class="space-y-4">
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

    <div>
      <div class="text-label-lg mb-2" style="color: rgb(var(--md-on-surface-variant))">{{ i18n.t('searchMatchScope') }}</div>
      <div class="flex flex-wrap gap-2">
        <button class="chip-filter" :class="{ 'chip-filter-active': scope === 'stem_options' }" @click="scope = 'stem_options'">
          {{ i18n.t('searchMatchStemOptions') }}
        </button>
        <button class="chip-filter" :class="{ 'chip-filter-active': scope === 'stem' }" @click="scope = 'stem'">
          {{ i18n.t('searchMatchStem') }}
        </button>
      </div>
    </div>

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
</template>
