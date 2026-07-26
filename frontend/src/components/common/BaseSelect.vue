<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { ChevronDownIcon, CheckIcon } from '@heroicons/vue/24/outline'

export interface SelectOption {
  value: any
  label: string
  hint?: string
}

const props = defineProps<{
  modelValue: any
  options: SelectOption[]
  placeholder?: string
}>()

const emit = defineEmits<{ (e: 'update:modelValue', v: any): void }>()

const open = ref(false)
const root = ref<HTMLElement | null>(null)

const selected = computed(() => props.options.find((o) => o.value === props.modelValue))

function pick(v: any) {
  emit('update:modelValue', v)
  open.value = false
}

function onDocClick(e: MouseEvent) {
  if (root.value && !root.value.contains(e.target as Node)) open.value = false
}

onMounted(() => document.addEventListener('click', onDocClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocClick))
</script>

<template>
  <div ref="root" class="relative">
    <button
      type="button"
      class="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-sm outline-none transition-all duration-200 cursor-pointer"
      :style="{
        border: `1.5px solid ${open ? 'rgb(var(--md-primary))' : 'rgb(var(--md-outline-variant))'}`,
        color: 'rgb(var(--md-on-surface))',
        backgroundColor: 'rgb(var(--md-surface-container-low))',
      }"
      @click.stop="open = !open"
    >
      <span class="truncate" :style="selected ? {} : { color: 'rgb(var(--md-on-surface-muted))' }">
        {{ selected?.label ?? placeholder ?? '' }}
      </span>
      <ChevronDownIcon
        class="w-4 h-4 shrink-0 transition-transform duration-200"
        :class="{ 'rotate-180': open }"
        style="color: rgb(var(--md-on-surface-variant))"
      />
    </button>

    <Transition name="scale">
      <div
        v-if="open"
        class="absolute left-0 right-0 top-full mt-1 z-30 max-h-64 overflow-y-auto rounded-2xl elevation-2 py-1.5"
        style="background-color: rgb(var(--md-surface-container-high))"
      >
        <button
          v-for="o in options"
          :key="String(o.value)"
          type="button"
          class="w-full flex items-center gap-2 px-4 py-2.5 text-left text-sm transition-colors hover:bg-[rgb(var(--md-primary)/0.08)]"
          :style="o.value === modelValue
            ? { color: 'rgb(var(--md-primary))', backgroundColor: 'rgb(var(--md-primary) / 0.10)' }
            : { color: 'rgb(var(--md-on-surface))' }"
          @click.stop="pick(o.value)"
        >
          <span class="flex-1 min-w-0 truncate">{{ o.label }}</span>
          <span v-if="o.hint" class="text-xs shrink-0" style="color: rgb(var(--md-on-surface-variant))">{{ o.hint }}</span>
          <CheckIcon v-if="o.value === modelValue" class="w-4 h-4 shrink-0" />
        </button>
      </div>
    </Transition>
  </div>
</template>
