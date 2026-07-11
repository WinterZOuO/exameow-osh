<script setup lang="ts">
import { computed } from 'vue'
import type { Question } from '@exambot/shared'

const props = defineProps<{ questions: Question[] }>()

const typeLabel: Record<string, string> = {
  single_choice: 'Single',
  multi_choice: 'Multi',
  true_false: 'T/F',
  fill_blank: 'Fill',
  short_answer: 'Short',
}

const headers = [
  { title: '#', key: 'id', width: 70, sortable: false },
  { title: 'Type', key: 'qtypeTag', width: 100, sortable: false },
  { title: 'Question', key: 'stem', sortable: false },
  { title: 'Options', key: 'options', sortable: false },
  { title: 'Answer', key: 'answer', width: 160, sortable: false },
  { title: 'Analysis', key: 'analysis', sortable: false, width: 220 },
]

const items = computed(() =>
  props.questions.map((q, i) => ({
    id: q.id || `${i + 1}`,
    qtypeTag: typeLabel[q.type] || q.type,
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
