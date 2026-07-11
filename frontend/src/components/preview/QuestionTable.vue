<script setup lang="ts">
import { computed } from 'vue'
import type { Question } from '@exambot/shared'

const props = defineProps<{ questions: Question[] }>()

const headers = [
  { title: '#', key: 'id', width: 80 },
  { title: 'Type', key: 'type', width: 120 },
  { title: 'Question', key: 'stem' },
  { title: 'Options', key: 'options' },
  { title: 'Answer', key: 'answer', width: 150 },
  { title: 'Analysis', key: 'analysis', width: 200 },
]

const items = computed(() =>
  props.questions.map((q, i) => ({
    id: q.id || `${i + 1}`,
    type: q.type,
    stem: q.stem,
    options: q.options.join(' | '),
    answer: q.answer,
    analysis: q.analysis,
  })),
)
</script>

<template>
  <v-data-table
    :headers="headers"
    :items="items"
    density="compact"
    hover
    class="elevation-1"
  >
    <template v-slot:item.stem="{ value }">
      <div style="max-width: 300px; white-space: normal;">{{ value }}</div>
    </template>
    <template v-slot:item.analysis="{ value }">
      <div style="max-width: 200px; white-space: normal;">{{ value || '-' }}</div>
    </template>
  </v-data-table>
</template>
