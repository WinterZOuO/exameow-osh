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
    <h3 class="text-title-md font-bold tracking-tight mb-2" :style="{ color: 'rgb(var(--md-on-surface))' }">
      {{ i18n.t('practiceSelectModeTitle') }}
    </h3>
    <button
      v-for="m in modes"
      :key="m.value"
      class="w-full text-left p-4.5 rounded-[24px] border transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] flex items-center gap-4 cursor-pointer active:scale-[0.98] shadow-sm"
      :class="[
        props.modelValue === m.value
          ? 'border-[rgb(var(--md-primary))] bg-[rgba(var(--md-primary),0.07)] shadow-md'
          : 'border-[rgb(var(--md-outline-variant)/0.4)] bg-[rgb(var(--md-surface-container-low))] hover:bg-[rgb(var(--md-surface-container))]'
      ]"
      @click="select(m.value)"
    >
      <div
        class="w-12 h-12 rounded-[20px] flex items-center justify-center shrink-0 transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
        :class="{ 'scale-105': props.modelValue === m.value }"
        :style="{
          backgroundColor:
            props.modelValue === m.value
              ? 'rgb(var(--md-primary-container))'
              : 'rgb(var(--md-surface-container-high))',
        }"
      >
        <component
          :is="m.icon"
          class="w-6 h-6 transition-colors duration-200"
          :style="{
            color:
              props.modelValue === m.value
                ? 'rgb(var(--md-on-primary-container))'
                : 'rgb(var(--md-on-surface-variant))',
          }"
        />
      </div>
      <div class="flex-1 min-w-0">
        <div class="text-title-sm font-bold" :style="{ color: 'rgb(var(--md-on-surface))' }">{{ m.title }}</div>
        <div class="text-body-sm mt-0.5" :style="{ color: 'rgb(var(--md-on-surface-variant))' }">{{ m.desc }}</div>
      </div>
      <div
        class="w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
        :style="{
          borderColor:
            props.modelValue === m.value
              ? 'rgb(var(--md-primary))'
              : 'rgb(var(--md-outline-variant))',
        }"
      >
        <div
          v-if="props.modelValue === m.value"
          class="w-3 h-3 rounded-full animate-spring-pop"
          :style="{ backgroundColor: 'rgb(var(--md-primary))' }"
        />
      </div>
    </button>
    <button
      class="btn-filled w-full mt-5 !h-12 !text-base !font-semibold shadow-md"
      :disabled="!props.modelValue"
      @click="start"
    >
      <PlayIcon class="w-5 h-5" />
      <span>{{ props.modelValue === 'mock' ? i18n.t('practiceMockConfigTitle') : i18n.t('practiceStartBtn') }}</span>
    </button>
  </div>
</template>
