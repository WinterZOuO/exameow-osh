<script setup lang="ts">
import { computed } from 'vue'
import { useI18nStore } from '@/stores/i18n'
import { useWrongQuestionsStore } from '@/stores/wrongQuestions'
import type { QuestionBank } from '@exambot/shared'
import {
  ClockIcon,
  DocumentTextIcon,
  TrashIcon,
  ArrowRightIcon,
  ExclamationTriangleIcon,
} from '@heroicons/vue/24/outline'

const props = defineProps<{
  banks: QuestionBank[]
  selectedId: string | null
}>()

const emit = defineEmits<{
  (e: 'select', id: string): void
  (e: 'delete', id: string): void
  (e: 'import'): void
  (e: 'manageWrong', bankId: string): void
}>()

const i18n = useI18nStore()
const wrongStore = useWrongQuestionsStore()

const sourceLabel = (source: string): string => {
  if (source === 'ai-generated') return i18n.t('practiceSourceAI')
  if (source === 'csv-import' || source === 'kaoshibao-import') return i18n.t('practiceSourceImport')
  return source
}

const formatDate = (ts: number): string => {
  const d = new Date(ts)
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
}

const typeCounts = (bank: QuestionBank) => {
  const counts: Record<string, number> = {}
  for (const q of bank.questions) {
    counts[q.type] = (counts[q.type] || 0) + 1
  }
  return counts
}
</script>

<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between">
      <h3 class="text-title-sm" :style="{ color: 'rgb(var(--md-on-surface))' }">
        {{ i18n.t('practiceSelectBank') }}
      </h3>
      <button class="btn-text text-sm" @click="emit('import')">
        {{ i18n.t('practiceImportBtn') }}
      </button>
    </div>

    <!-- Empty State -->
    <div
      v-if="banks.length === 0"
      class="card-outlined p-8 text-center"
    >
      <DocumentTextIcon class="w-12 h-12 mx-auto mb-3" :style="{ color: 'rgb(var(--md-on-surface-muted))' }" />
      <div class="text-title-sm mb-1" :style="{ color: 'rgb(var(--md-on-surface))' }">
        {{ i18n.t('practiceEmptyTitle') }}
      </div>
      <div class="text-body-sm mb-5" :style="{ color: 'rgb(var(--md-on-surface-variant))' }">
        {{ i18n.t('practiceEmptyHint') }}
      </div>
      <button class="btn-filled" @click="emit('import')">
        {{ i18n.t('practiceImportBtn') }}
      </button>
    </div>

    <!-- Bank Cards -->
    <button
      v-for="bank in banks"
      :key="bank.id"
      class="w-full text-left card-elevated p-3 sm:p-5 transition-all duration-200 group relative"
      :style="
        selectedId === bank.id
          ? { outline: '2px solid rgb(var(--md-primary))', outlineOffset: '1px' }
          : {}
      "
      @click="emit('select', bank.id)"
    >
      <div class="flex items-start gap-3 sm:gap-4">
        <div
          class="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0"
          :style="{ backgroundColor: 'rgb(var(--md-primary-container))' }"
        >
          <DocumentTextIcon class="w-5 h-5 sm:w-6 sm:h-6" :style="{ color: 'rgb(var(--md-on-primary-container))' }" />
        </div>

        <div class="flex-1 min-w-0">
          <div class="text-title-sm truncate" :style="{ color: 'rgb(var(--md-on-surface))' }">{{ bank.name }}</div>
          <div class="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-body-sm" :style="{ color: 'rgb(var(--md-on-surface-variant))' }">
            <span>{{ i18n.t('practiceQuestions', { n: bank.questions.length }) }}</span>
            <span class="w-1 h-1 rounded-full hidden sm:block" :style="{ backgroundColor: 'rgb(var(--md-on-surface-muted))' }" />
            <span>{{ sourceLabel(bank.source) }}</span>
            <span class="w-1 h-1 rounded-full hidden sm:block" :style="{ backgroundColor: 'rgb(var(--md-on-surface-muted))' }" />
            <span class="flex items-center gap-1">
              <ClockIcon class="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              {{ formatDate(bank.createdAt) }}
            </span>
          </div>
        </div>

        <ArrowRightIcon
          class="w-4 h-4 sm:w-5 sm:h-5 shrink-0 mt-1.5 transition-transform group-hover:translate-x-0.5"
          :style="{ color: 'rgb(var(--md-on-surface-muted))' }"
        />
      </div>

      <div class="flex items-center gap-1 mt-3 sm:mt-0 sm:absolute sm:right-4 sm:top-4">
        <button
          class="btn-icon !w-7 !h-7 sm:!w-8 sm:!h-8"
          :style="{ color: 'rgb(var(--md-error))' }"
          @click.stop="emit('delete', bank.id)"
        >
          <TrashIcon class="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>
        <button
          v-if="wrongStore.hasWrongQuestions(bank.id)"
          class="btn-icon !w-7 !h-7 sm:!w-8 sm:!h-8"
          :style="{ color: 'rgb(var(--md-error))' }"
          @click.stop="emit('manageWrong', bank.id)"
        >
          <ExclamationTriangleIcon class="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>
      </div>
    </button>
  </div>
</template>
