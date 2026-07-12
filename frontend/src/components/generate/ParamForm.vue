<script setup lang="ts">
import { useExamStore } from '@/stores/exam'
import { useI18nStore } from '@/stores/i18n'
import { QuestionType, Difficulty } from '@exambot/shared'

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
  <div class="card">
    <label class="section-label">{{ i18n.t('genQuestionTypes') }}</label>

    <div class="space-y-2 mb-5">
      <div
        v-for="opt in typeOptions"
        :key="opt.value"
        class="flex items-center gap-3 px-3 py-1.5 rounded-2xl transition-colors"
        :class="store.questionTypes.includes(opt.value) ? 'bg-[rgb(var(--c-container))]' : ''"
      >
        <button
          class="chip shrink-0"
          :class="store.questionTypes.includes(opt.value) ? 'chip-active' : ''"
          @click="toggleType(opt.value)"
        >
          {{ i18n.t(opt.title as any) }}
        </button>

        <input
          v-if="store.questionTypes.includes(opt.value)"
          :value="store.typeCounts[opt.value] || 0"
          type="number"
          min="0"
          max="999"
          class="w-16 text-center font-bold text-sm px-2 py-1 rounded-lg border border-[rgb(var(--c-outline)/0.15)] bg-[rgb(var(--c-surface))] text-[rgb(var(--c-text))] outline-none focus:border-primary-500"
          @input="(e: Event) => { const v = parseInt((e.target as HTMLInputElement).value) || 0; store.typeCounts[opt.value] = Math.max(0, v) }"
        />
        <span v-else class="ml-auto text-xs text-[rgb(var(--c-text-secondary))]">点击选择</span>
      </div>
    </div>

    <div class="divider" />

    <div class="grid grid-cols-2 gap-4">
      <div>
        <label class="text-xs font-medium text-[rgb(var(--c-text-secondary))] mb-1.5 block">{{ i18n.t('genDifficulty') }}</label>
        <select v-model="store.difficulty" class="input-field text-sm !py-2.5">
          <option v-for="d in difficultyOptions" :key="d.value" :value="d.value">
            {{ i18n.t(d.title as any) }}
          </option>
        </select>
      </div>

      <div>
        <label class="text-xs font-medium text-[rgb(var(--c-text-secondary))] mb-1.5 block">{{ i18n.t('genLanguage') }}</label>
        <select v-model="store.language" class="input-field text-sm !py-2.5">
          <option value="zh-CN">中文</option>
          <option value="en-US">English</option>
        </select>
      </div>

      <div class="col-span-2">
        <label class="text-xs font-medium text-[rgb(var(--c-text-secondary))] mb-1.5 block">{{ i18n.t('genTopic') }}</label>
        <input
          v-model="store.topicFilter"
          :placeholder="i18n.t('genTopicPlaceholder')"
          class="input-field text-sm !py-2.5"
        />
      </div>
    </div>
  </div>
</template>
