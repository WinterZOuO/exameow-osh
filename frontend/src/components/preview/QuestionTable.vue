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
  single_choice: 'rgb(var(--md-primary))',
  multi_choice: 'rgb(var(--md-tertiary))',
  true_false: '#B06A00',
  fill_blank: '#1B6D3C',
  short_answer: '#A8365A',
}

const typeBg: Record<string, string> = {
  single_choice: 'rgba(var(--md-primary) / 0.12)',
  multi_choice: 'rgba(var(--md-tertiary) / 0.12)',
  true_false: 'rgba(176,106,0 / 0.12)',
  fill_blank: 'rgba(27,109,60 / 0.12)',
  short_answer: 'rgba(168,54,90 / 0.12)',
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
  <div class="rounded-[24px] sm:rounded-[28px] overflow-hidden elevation-1"
       :style="{ backgroundColor: 'rgb(var(--md-surface-container-low))' }">
    <div class="overflow-x-auto -mx-0" style="-webkit-overflow-scrolling: touch;">
      <table class="w-full text-sm min-w-[700px] sm:min-w-0">
        <thead>
          <tr :style="{ borderBottom: '1px solid rgb(var(--md-outline-variant) / 0.3)' }">
            <th class="text-left px-5 py-3.5 text-label-sm w-12" style="color: rgb(var(--md-on-surface-variant))">#</th>
            <th class="text-left px-5 py-3.5 text-label-sm w-24" style="color: rgb(var(--md-on-surface-variant))">{{ i18n.t('tableType') }}</th>
            <th class="text-left px-5 py-3.5 text-label-sm" style="color: rgb(var(--md-on-surface-variant))">{{ i18n.t('tableQuestion') }}</th>
            <th class="text-left px-5 py-3.5 text-label-sm" style="color: rgb(var(--md-on-surface-variant))">{{ i18n.t('tableOptions') }}</th>
            <th class="text-left px-5 py-3.5 text-label-sm w-36" style="color: rgb(var(--md-on-surface-variant))">{{ i18n.t('tableAnswer') }}</th>
            <th class="text-left px-5 py-3.5 text-label-sm w-48" style="color: rgb(var(--md-on-surface-variant))">{{ i18n.t('tableAnalysis') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, idx) in rows"
            :key="row.id"
            class="transition-colors duration-150"
            :style="{ borderBottom: '1px solid rgb(var(--md-outline-variant) / 0.12)' }"
            @mouseenter="(e: MouseEvent) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgb(var(--md-surface-container-highest))' }"
            @mouseleave="(e: MouseEvent) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent' }"
          >
            <td class="px-5 py-3 text-body-sm" style="color: rgb(var(--md-on-surface-variant))">{{ idx + 1 }}</td>
            <td class="px-5 py-3">
              <span
                class="inline-block px-3 py-1 rounded-full text-xs font-semibold"
                :style="{ backgroundColor: typeBg[row.qtype] || 'rgba(var(--md-on-surface-variant) / 0.12)', color: typeColor[row.qtype] || 'rgb(var(--md-on-surface-variant))' }"
              >
                {{ i18n.t((typeLabel[row.qtype] || row.qtype) as any) }}
              </span>
            </td>
            <td class="px-5 py-3 max-w-xs leading-relaxed font-medium" style="color: rgb(var(--md-on-surface))">{{ row.stem }}</td>
            <td class="px-5 py-3 text-body-sm max-w-xs leading-relaxed" style="color: rgb(var(--md-on-surface-variant))">{{ row.options || '-' }}</td>
            <td class="px-5 py-3 font-semibold leading-relaxed" style="color: #1B6D3C">{{ row.answer }}</td>
            <td class="px-5 py-3 text-body-sm max-w-[200px] leading-relaxed" style="color: rgb(var(--md-on-surface-variant))">{{ row.analysis || '-' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
