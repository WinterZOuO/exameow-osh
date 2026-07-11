<script setup lang="ts">
import { computed } from 'vue'
import type { Question } from '@exambot/shared'
import { useI18nStore } from '@/stores/i18n'

const i18n = useI18nStore()
const props = defineProps<{ questions: Question[] }>()

const typeLabel: Record<string, string> = {
  single_choice: 'typeSingle', multi_choice: 'typeMulti',
  true_false: 'typeTrueFalse', fill_blank: 'typeFillBlank',
  short_answer: 'typeShortAnswer',
}

const typeColor: Record<string, string> = {
  single_choice: 'bg-primary-500 text-white',
  multi_choice: 'bg-purple-500 text-white',
  true_false: 'bg-amber-500 text-white',
  fill_blank: 'bg-emerald-500 text-white',
  short_answer: 'bg-rose-500 text-white',
}

const rows = computed(() =>
  props.questions.map((q, i) => ({
    id: q.id || `${i + 1}`,
    qtype: q.type,
    stem: q.stem,
    options: q.options.join(' · '),
    answer: q.answer,
    analysis: q.analysis,
  })),
)
</script>

<template>
  <div class="card !p-0 overflow-hidden">
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-[rgb(var(--c-outline)/0.08)]">
            <th class="text-left px-4 py-3 font-semibold text-xs text-[rgb(var(--c-text-secondary))] uppercase tracking-wide w-12">#</th>
            <th class="text-left px-4 py-3 font-semibold text-xs text-[rgb(var(--c-text-secondary))] uppercase tracking-wide w-24">{{ i18n.t('tableType') }}</th>
            <th class="text-left px-4 py-3 font-semibold text-xs text-[rgb(var(--c-text-secondary))] uppercase tracking-wide">{{ i18n.t('tableQuestion') }}</th>
            <th class="text-left px-4 py-3 font-semibold text-xs text-[rgb(var(--c-text-secondary))] uppercase tracking-wide">{{ i18n.t('tableOptions') }}</th>
            <th class="text-left px-4 py-3 font-semibold text-xs text-[rgb(var(--c-text-secondary))] uppercase tracking-wide w-36">{{ i18n.t('tableAnswer') }}</th>
            <th class="text-left px-4 py-3 font-semibold text-xs text-[rgb(var(--c-text-secondary))] uppercase tracking-wide w-48">{{ i18n.t('tableAnalysis') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, idx) in rows"
            :key="row.id"
            class="border-b border-[rgb(var(--c-outline)/0.05)] hover:bg-[rgb(var(--c-container))] transition-colors"
          >
            <td class="px-4 py-2.5 text-[rgb(var(--c-text-secondary))] font-mono text-xs">{{ idx + 1 }}</td>
            <td class="px-4 py-2.5">
              <span class="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold" :class="typeColor[row.qtype] || 'bg-gray-500 text-white'">
                {{ i18n.t((typeLabel[row.qtype] || row.qtype) as any) }}
              </span>
            </td>
            <td class="px-4 py-2.5 font-medium max-w-xs whitespace-normal leading-snug">{{ row.stem }}</td>
            <td class="px-4 py-2.5 text-xs text-[rgb(var(--c-text-secondary))] max-w-xs whitespace-normal leading-snug">{{ row.options || '-' }}</td>
            <td class="px-4 py-2.5 font-semibold text-emerald-600 dark:text-emerald-400 whitespace-normal leading-snug">{{ row.answer }}</td>
            <td class="px-4 py-2.5 text-xs text-[rgb(var(--c-text-secondary))] max-w-[200px] whitespace-normal leading-snug">{{ row.analysis || '-' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
