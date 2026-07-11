<script setup lang="ts">
import { computed } from 'vue'
import type { Question } from '@exambot/shared'
import { useI18nStore } from '@/stores/i18n'

const i18n = useI18nStore()
const props = defineProps<{ questions: Question[] }>()

const typeLabel: Record<string, string> = {
  single_choice: 'typeSingle',
  multi_choice: 'typeMulti',
  true_false: 'typeTrueFalse',
  fill_blank: 'typeFillBlank',
  short_answer: 'typeShortAnswer',
}

const headers = computed(() => [
  { title: i18n.t('tableNum'), key: 'id', width: 70, sortable: false },
  { title: i18n.t('tableType'), key: 'qtypeTag', width: 100, sortable: false },
  { title: i18n.t('tableQuestion'), key: 'stem', sortable: false },
  { title: i18n.t('tableOptions'), key: 'options', sortable: false },
  { title: i18n.t('tableAnswer'), key: 'answer', width: 160, sortable: false },
  { title: i18n.t('tableAnalysis'), key: 'analysis', sortable: false, width: 220 },
])

const items = computed(() =>
  props.questions.map((q, i) => ({
    id: q.id || `${i + 1}`,
    qtypeTag: i18n.t(typeLabel[q.type] as any) || q.type,
    qtype: q.type,
    stem: q.stem,
    options: q.options.join(' · '),
    answer: q.answer,
    analysis: q.analysis,
  })),
)
</script>

<template>
  <v-card>
    <v-data-table
      :headers="headers"
      :items="items"
      density="comfortable"
      items-per-page="25"
      class="rounded-xl"
    >
      <template #item.qtypeTag="{ value, item }">
        <v-chip
          size="small"
          variant="flat"
          :color="
            item.qtype === 'single_choice' ? 'primary' :
            item.qtype === 'true_false' ? 'warning' :
            'secondary'
          "
          class="font-weight-medium"
          style="font-size: 11px;"
        >
          {{ value }}
        </v-chip>
      </template>

      <template #item.stem="{ value }">
        <div style="max-width: 360px; white-space: normal; line-height: 1.5; font-weight: 500;">
          {{ value }}
        </div>
      </template>

      <template #item.options="{ value }">
        <div style="max-width: 280px; white-space: normal; font-size: 13px; color: #5B6F8C;">
          {{ value || '-' }}
        </div>
      </template>

      <template #item.answer="{ value }">
        <div style="font-weight: 600; color: #1B7B34;">
          {{ value }}
        </div>
      </template>

      <template #item.analysis="{ value }">
        <div style="max-width: 220px; white-space: normal; font-size: 13px; line-height: 1.4; color: #5B6F8C;">
          {{ value || '-' }}
        </div>
      </template>

      <template #bottom />
    </v-data-table>
  </v-card>
</template>
