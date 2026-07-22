<script setup lang="ts">
import { computed } from 'vue'
import { useI18nStore } from '@/stores/i18n'
import type { PracticeMode } from '@exameow/shared'
import {
  QueueListIcon,
  ArrowPathRoundedSquareIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  PlayIcon,
} from '@heroicons/vue/24/outline'

const props = defineProps<{
  modelValue: PracticeMode | null
  hasWrongQuestions?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: PracticeMode): void
  (e: 'confirm', v: PracticeMode): void
}>()

const i18n = useI18nStore()

const modes = computed(() => {
  const all = [
    {
      value: 'sequential' as PracticeMode,
      title: i18n.t('practiceModeSequential'),
      desc: i18n.t('practiceModeSequentialDesc'),
      icon: QueueListIcon,
    },
    {
      value: 'random' as PracticeMode,
      title: i18n.t('practiceModeRandom'),
      desc: i18n.t('practiceModeRandomDesc'),
      icon: ArrowPathRoundedSquareIcon,
    },
    {
      value: 'mock' as PracticeMode,
      title: i18n.t('practiceModeMock'),
      desc: i18n.t('practiceModeMockDesc'),
      icon: ClockIcon,
    },
    {
      value: 'wrong' as PracticeMode,
      title: i18n.t('wrongModeTitle'),
      desc: i18n.t('wrongModeDesc'),
      icon: ExclamationTriangleIcon,
    },
  ]
  if (!props.hasWrongQuestions) {
    return all.filter(m => m.value !== 'wrong')
  }
  return all
})

function select(mode: PracticeMode) {
  emit('update:modelValue', mode)
}

function start() {
  if (props.modelValue) {
    emit('confirm', props.modelValue)
  }
}
</script>

<template>
  <div class="space-y-3">
    <h3 class="text-title-sm" :style="{ color: 'rgb(var(--md-on-surface))' }">
      {{ i18n.t('practiceSelectModeTitle') }}
    </h3>
    <button
      v-for="m in modes"
      :key="m.value"
      class="w-full text-left p-4 rounded-xl border transition-all duration-200 flex items-start gap-4"
      :class="[
        props.modelValue === m.value
          ? 'border-[rgb(var(--md-primary))] bg-[rgba(var(--md-primary),0.08)]'
          : ''
      ]"
      :style="
        props.modelValue === m.value
          ? {}
          : {
              borderColor: 'rgb(var(--md-outline-variant))',
              backgroundColor: 'rgb(var(--md-surface))',
            }
      "
      @click="select(m.value)"
    >
      <div
        class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
        :style="{
          backgroundColor:
            props.modelValue === m.value
              ? 'rgb(var(--md-primary-container))'
              : 'rgb(var(--md-surface-container-high))',
        }"
      >
        <component
          :is="m.icon"
          class="w-5 h-5"
          :style="{
            color:
              props.modelValue === m.value
                ? 'rgb(var(--md-on-primary-container))'
                : 'rgb(var(--md-on-surface-variant))',
          }"
        />
      </div>
      <div class="flex-1 min-w-0">
        <div class="text-title-sm" :style="{ color: 'rgb(var(--md-on-surface))' }">{{ m.title }}</div>
        <div class="text-body-sm mt-0.5" :style="{ color: 'rgb(var(--md-on-surface-variant))' }">{{ m.desc }}</div>
      </div>
      <div
        class="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-1.5"
        :style="{
          borderColor:
            props.modelValue === m.value
              ? 'rgb(var(--md-primary))'
              : 'rgb(var(--md-outline-variant))',
        }"
      >
        <div
          v-if="props.modelValue === m.value"
          class="w-2.5 h-2.5 rounded-full"
          :style="{ backgroundColor: 'rgb(var(--md-primary))' }"
        />
      </div>
    </button>
    <button
      class="btn-filled w-full mt-4"
      :disabled="!props.modelValue"
      @click="start"
    >
      <PlayIcon class="w-4 h-4" />
      {{ props.modelValue === 'mock' ? i18n.t('practiceMockConfigTitle') : i18n.t('practiceStartBtn') }}
    </button>
  </div>
</template>
