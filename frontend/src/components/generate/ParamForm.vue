<script setup lang="ts">
import { useExamStore } from '@/stores/exam'
import { useI18nStore } from '@/stores/i18n'
import { QuestionType, Difficulty } from '@exameow/shared'
import { ChartBarIcon, LanguageIcon, ChevronDownIcon } from '@heroicons/vue/24/outline'

const store = useExamStore()
const i18n = useI18nStore()

const typeOptions = [
  { title: 'typeSingle', value: QuestionType.SingleChoice },
  { title: 'typeMulti', value: QuestionType.MultiChoice },
  { title: 'typeTrueFalse', value: QuestionType.TrueFalse },
  { title: 'typeFillBlank', value: QuestionType.FillBlank },
  { title: 'typeShortAnswer', value: QuestionType.ShortAnswer },
]

const difficultyOptions = [
  { title: 'diffEasy', value: Difficulty.Easy },
  { title: 'diffMedium', value: Difficulty.Medium },
  { title: 'diffHard', value: Difficulty.Hard },
]

function toggleType(type: QuestionType) {
  const idx = store.questionTypes.indexOf(type)
  if (idx >= 0) { store.questionTypes.splice(idx, 1); store.typeCounts[type] = 0 }
  else { store.questionTypes.push(type); store.typeCounts[type] = 5 }
}
</script>

<template>
  <div class="card-filled p-5">
    <label class="text-label-md block mb-4" style="color: rgb(var(--md-on-surface-variant))">{{ i18n.t('genQuestionTypes') }}</label>

    <!-- Filter Chips -->
    <div class="flex flex-wrap gap-2 mb-5">
      <button
        v-for="opt in typeOptions"
        :key="opt.value"
        class="chip-filter"
        :class="{ 'chip-filter-active': store.questionTypes.includes(opt.value) }"
        @click="toggleType(opt.value)"
      >
        {{ i18n.t(opt.title as any) }}
      </button>
    </div>

    <!-- Per-type counts -->
    <TransitionGroup name="list" tag="div" class="space-y-2 mb-5">
      <div
        v-for="type in store.questionTypes"
        :key="type"
        class="flex items-center gap-3 p-3 rounded-2xl transition-colors duration-200"
        :style="{ backgroundColor: 'rgb(var(--md-surface-container-low))' }"
      >
        <span
          class="inline-flex items-center px-3 h-8 rounded-lg text-xs font-medium !cursor-default"
          :style="{ backgroundColor: 'rgb(var(--md-primary-container))', color: 'rgb(var(--md-on-primary-container))' }"
        >
          {{ i18n.t(typeOptions.find(o => o.value === type)?.title as any) }}
        </span>
        <span class="text-body-md flex-1" style="color: rgb(var(--md-on-surface-variant))">{{ i18n.t('genQuestions') }}</span>
        <input
          :value="store.typeCounts[type] || 0"
          type="number"
          min="1"
          max="999"
          class="w-20 text-center font-semibold text-base px-3 py-2 rounded-xl border outline-none transition-all duration-200"
          :style="{
            backgroundColor: 'rgb(var(--md-surface))',
            borderColor: 'rgb(var(--md-outline-variant))',
            color: 'rgb(var(--md-on-surface))',
          }"
          @input="(e: Event) => { const v = parseInt((e.target as HTMLInputElement).value) || 0; store.typeCounts[type] = Math.max(0, v) }"
        />
      </div>
    </TransitionGroup>

    <div class="divider my-4" />

    <!-- Options -->
    <div class="grid grid-cols-2 gap-4">
      <div class="relative">
        <label class="text-label-md block mb-2" style="color: rgb(var(--md-on-surface-variant))">{{ i18n.t('genDifficulty') }}</label>
        <div class="relative">
          <ChartBarIcon class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 z-10" style="color: rgb(var(--md-on-surface-variant))" />
          <select
            v-model="store.difficulty"
            class="input-outlined text-sm !py-2.5 !pl-10 appearance-none cursor-pointer"
          >
            <option v-for="d in difficultyOptions" :key="d.value" :value="d.value">
              {{ i18n.t(d.title as any) }}
            </option>
          </select>
          <ChevronDownIcon class="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style="color: rgb(var(--md-on-surface-variant))" />
        </div>
      </div>

      <div class="relative">
        <label class="text-label-md block mb-2" style="color: rgb(var(--md-on-surface-variant))">{{ i18n.t('genLanguage') }}</label>
        <div class="relative">
          <LanguageIcon class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 z-10" style="color: rgb(var(--md-on-surface-variant))" />
          <select v-model="store.language" class="input-outlined text-sm !py-2.5 !pl-10 appearance-none cursor-pointer">
            <option value="zh-CN">{{ i18n.t('practiceLangZh') }}</option>
            <option value="en-US">{{ i18n.t('practiceLangEn') }}</option>
          </select>
          <ChevronDownIcon class="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style="color: rgb(var(--md-on-surface-variant))" />
        </div>
      </div>

      <div class="col-span-2">
        <label class="text-label-md block mb-2" style="color: rgb(var(--md-on-surface-variant))">{{ i18n.t('genTopic') }}</label>
        <input
          v-model="store.topicFilter"
          :placeholder="i18n.t('genTopicPlaceholder')"
          class="input-outlined text-sm !py-2.5"
        />
      </div>
    </div>
  </div>
</template>
