<script setup lang="ts">
import { useExamStore } from '@/stores/exam'
import { useI18nStore } from '@/stores/i18n'
import { QuestionType, Difficulty } from '@exambot/shared'
import { MinusIcon, PlusIcon } from '@heroicons/vue/24/outline'

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

    <div class="space-y-1.5 mb-5">
      <div
        v-for="opt in typeOptions"
        :key="opt.value"
        class="flex items-center gap-3 px-3 py-2 rounded-2xl transition-colors"
        :class="store.questionTypes.includes(opt.value)
          ? 'bg-[rgb(var(--c-container))]'
          : ''"
      >
        <button
          class="chip shrink-0"
          :class="store.questionTypes.includes(opt.value) ? 'chip-active' : ''"
          @click="toggleType(opt.value)"
        >
          {{ i18n.t(opt.title as any) }}
        </button>

        <template v-if="store.questionTypes.includes(opt.value)">
          <div class="flex items-center gap-1.5 ml-auto">
            <button
              class="w-7 h-7 flex items-center justify-center rounded-full border border-[rgb(var(--c-outline)/0.2)] text-[rgb(var(--c-text-secondary))] hover:border-[rgb(var(--c-outline)/0.5)] transition-colors"
              @click="store.typeCounts[opt.value] = Math.max(0, (store.typeCounts[opt.value] || 0) - 1)"
            >
              <MinusIcon class="w-3.5 h-3.5" />
            </button>
            <span class="w-8 text-center font-bold text-[15px] tabular-nums">
              {{ store.typeCounts[opt.value] || 0 }}
            </span>
            <button
              class="w-7 h-7 flex items-center justify-center rounded-full border border-[rgb(var(--c-outline)/0.2)] text-[rgb(var(--c-text-secondary))] hover:border-[rgb(var(--c-outline)/0.5)] transition-colors"
              @click="store.typeCounts[opt.value] = Math.min(20, (store.typeCounts[opt.value] || 0) + 1)"
            >
              <PlusIcon class="w-3.5 h-3.5" />
            </button>
          </div>
        </template>
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
