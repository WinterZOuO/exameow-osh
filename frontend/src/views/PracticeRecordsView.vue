<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18nStore } from '@/stores/i18n'
import { usePracticeHistoryStore } from '@/stores/practiceHistory'
import { ArrowLeftIcon, FireIcon, CheckCircleIcon, CalendarDaysIcon, Squares2X2Icon } from '@heroicons/vue/24/outline'

const router = useRouter()
const i18n = useI18nStore()
const history = usePracticeHistoryStore()

const isDark = ref(document.documentElement.classList.contains('dark'))
let observer: MutationObserver | null = null
onMounted(() => {
  observer = new MutationObserver(() => {
    isDark.value = document.documentElement.classList.contains('dark')
  })
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
})
onUnmounted(() => observer?.disconnect())

const LIGHT_LEVELS = ['rgba(var(--md-surface-container-highest))', '#9be9a8', '#40c463', '#30a14e', '#216e39']
const DARK_LEVELS = ['rgba(var(--md-surface-container-highest))', '#0e4429', '#006d32', '#26a641', '#39d353']

function level(count: number): number {
  if (count <= 0) return 0
  if (count < 10) return 1
  if (count < 25) return 2
  if (count < 50) return 3
  return 4
}

function cellColor(count: number): string {
  return (isDark.value ? DARK_LEVELS : LIGHT_LEVELS)[level(count)]!
}

interface DayCell {
  key: string
  count: number
}

const weeks = computed(() => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const end = new Date(today)
  end.setDate(end.getDate() + (6 - end.getDay()))
  const start = new Date(end)
  start.setDate(start.getDate() - 52 * 7 + 1)
  const cols: DayCell[][] = []
  const cursor = new Date(start)
  while (cursor <= end) {
    const week: DayCell[] = []
    for (let d = 0; d < 7; d++) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`
      week.push({ key, count: history.days[key]?.total ?? 0 })
      cursor.setDate(cursor.getDate() + 1)
    }
    cols.push(week)
  }
  return cols
})

const monthLabels = computed(() => {
  const labels: { col: number; text: string }[] = []
  let lastMonth = -1
  weeks.value.forEach((week, i) => {
    const m = new Date(week[0]!.key + 'T00:00:00').getMonth()
    if (m !== lastMonth) {
      labels.push({
        col: i,
        text: new Date(week[0]!.key + 'T00:00:00').toLocaleString(i18n.locale === 'zh' ? 'zh-CN' : 'en-US', { month: 'short' }),
      })
      lastMonth = m
    }
  })
  return labels
})

const stats = computed(() => {
  let total = 0
  let correct = 0
  let activeDays = 0
  const byType: Record<string, { total: number; correct: number }> = {}
  for (const day of Object.values(history.days)) {
    total += day.total
    correct += day.correct
    if (day.total > 0) activeDays++
    for (const [t, v] of Object.entries(day.byType)) {
      if (!byType[t]) byType[t] = { total: 0, correct: 0 }
      byType[t]!.total += v.total
      byType[t]!.correct += v.correct
    }
  }
  return { total, correct, activeDays, byType }
})

const accuracy = computed(() => (stats.value.total > 0 ? Math.round((stats.value.correct / stats.value.total) * 100) : 0))

const streak = computed(() => {
  let n = 0
  const cursor = new Date()
  cursor.setHours(0, 0, 0, 0)
  const keyOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const countOf = (d: Date) => history.days[keyOf(d)]?.total ?? 0
  if (countOf(cursor) === 0) cursor.setDate(cursor.getDate() - 1)
  while (countOf(cursor) > 0) {
    n++
    cursor.setDate(cursor.getDate() - 1)
  }
  return n
})

const GAUGE_R = 54
const GAUGE_C = 2 * Math.PI * GAUGE_R
const gaugeOffset = computed(() => GAUGE_C * (1 - accuracy.value / 100))

const TYPE_COLORS: Record<string, string> = {
  single_choice: '#42a5f5',
  multi_choice: '#ab47bc',
  true_false: '#ffa726',
  fill_blank: '#66bb6a',
  short_answer: '#ef5350',
}

const typeLabel = (t: string): string => {
  const labels: Record<string, string> = {
    single_choice: i18n.t('typeSingle'),
    multi_choice: i18n.t('typeMulti'),
    true_false: i18n.t('typeTrueFalse'),
    fill_blank: i18n.t('typeFillBlank'),
    short_answer: i18n.t('typeShortAnswer'),
  }
  return labels[t] ?? t
}

const PIE_R = 54
const PIE_C = 2 * Math.PI * PIE_R

const typeSegments = computed(() => {
  const entries = Object.entries(stats.value.byType)
    .filter(([, v]) => v.total > 0)
    .sort((a, b) => b[1].total - a[1].total)
  const total = entries.reduce((s, [, v]) => s + v.total, 0)
  let offset = 0
  return entries.map(([type, v]) => {
    const frac = total > 0 ? v.total / total : 0
    const seg = {
      type,
      count: v.total,
      color: TYPE_COLORS[type] ?? '#9e9e9e',
      dash: `${frac * PIE_C} ${PIE_C}`,
      offset: -offset * PIE_C,
    }
    offset += frac
    return seg
  })
})
</script>

<template>
  <div>
    <div class="flex items-center gap-2 mb-6">
      <button class="btn-icon" @click="router.push('/mine')">
        <ArrowLeftIcon class="w-5 h-5" />
      </button>
      <h1 class="text-display-sm">{{ i18n.t('mineRecords') }}</h1>
    </div>

    <!-- Heatmap -->
    <div class="card-outlined p-4 sm:p-5 mb-4 overflow-x-auto">
      <div class="inline-block min-w-full">
        <div class="relative h-5 mb-1 text-[11px]" style="color: rgb(var(--md-on-surface-variant))">
          <span
            v-for="m in monthLabels"
            :key="m.col"
            class="absolute"
            :style="{ left: `calc(${m.col} * (12px + 3px))` }"
          >{{ m.text }}</span>
        </div>
        <div class="flex gap-[3px]">
          <div v-for="(week, wi) in weeks" :key="wi" class="flex flex-col gap-[3px]">
            <div
              v-for="day in week"
              :key="day.key"
              class="w-3 h-3 rounded-[3px] transition-colors"
              :style="{ backgroundColor: cellColor(day.count) }"
              :title="`${day.key} · ${i18n.t('recordsDayTooltip', { n: day.count })}`"
            />
          </div>
        </div>
        <div class="flex items-center justify-end gap-1 mt-2 text-[11px]" style="color: rgb(var(--md-on-surface-variant))">
          {{ i18n.t('recordsLess') }}
          <div
            v-for="l in 5"
            :key="l"
            class="w-3 h-3 rounded-[3px]"
            :style="{ backgroundColor: cellColor([0, 5, 15, 35, 60][l - 1]!) }"
          />
          {{ i18n.t('recordsMore') }}
        </div>
      </div>
    </div>

    <!-- Stat cards -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
      <div class="card-outlined p-4 text-center">
        <Squares2X2Icon class="w-6 h-6 mx-auto mb-1" style="color: rgb(var(--md-primary))" />
        <div class="text-title-md">{{ stats.total }}</div>
        <div class="text-label-sm" style="color: rgb(var(--md-on-surface-variant))">{{ i18n.t('recordsTotal') }}</div>
      </div>
      <div class="card-outlined p-4 text-center">
        <CheckCircleIcon class="w-6 h-6 mx-auto mb-1" style="color: rgb(var(--md-primary))" />
        <div class="text-title-md">{{ accuracy }}%</div>
        <div class="text-label-sm" style="color: rgb(var(--md-on-surface-variant))">{{ i18n.t('recordsAccuracy') }}</div>
      </div>
      <div class="card-outlined p-4 text-center">
        <FireIcon class="w-6 h-6 mx-auto mb-1" style="color: #ff7043" />
        <div class="text-title-md">{{ streak }}</div>
        <div class="text-label-sm" style="color: rgb(var(--md-on-surface-variant))">{{ i18n.t('recordsStreak') }}</div>
      </div>
      <div class="card-outlined p-4 text-center">
        <CalendarDaysIcon class="w-6 h-6 mx-auto mb-1" style="color: rgb(var(--md-primary))" />
        <div class="text-title-md">{{ stats.activeDays }}</div>
        <div class="text-label-sm" style="color: rgb(var(--md-on-surface-variant))">{{ i18n.t('recordsActiveDays') }}</div>
      </div>
    </div>

    <!-- Charts -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div class="card-outlined p-5 flex flex-col items-center">
        <div class="text-label-sm mb-3 self-start" style="color: rgb(var(--md-on-surface-variant))">{{ i18n.t('recordsAccuracy') }}</div>
        <div class="relative w-32 h-32">
          <svg viewBox="0 0 128 128" class="w-full h-full -rotate-90">
            <circle cx="64" cy="64" :r="GAUGE_R" fill="none" stroke-width="18" style="stroke: rgba(var(--md-primary) / 0.1)" />
            <circle
              cx="64"
              cy="64"
              :r="GAUGE_R"
              fill="none"
              stroke-width="18"
              stroke-linecap="round"
              style="stroke: rgb(var(--md-primary)); transition: stroke-dashoffset 0.8s ease"
              :stroke-dasharray="GAUGE_C"
              :stroke-dashoffset="gaugeOffset"
            />
          </svg>
          <div class="absolute inset-0 flex flex-col items-center justify-center">
            <span class="text-xl font-bold" style="color: rgb(var(--md-primary))">{{ accuracy }}%</span>
            <span class="text-[11px]" style="color: rgb(var(--md-on-surface-variant))">{{ stats.correct }}/{{ stats.total }}</span>
          </div>
        </div>
        <div class="mt-3 space-y-1.5 w-full max-w-[200px]">
          <div class="flex items-center gap-2 text-sm">
            <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background-color: rgb(var(--md-primary))" />
            <span class="flex-1" style="color: rgb(var(--md-on-surface))">{{ i18n.t('practiceCorrect') }}</span>
            <span class="text-xs font-bold tabular-nums" style="color: rgb(var(--md-primary))">{{ accuracy }}%</span>
            <span class="text-xs tabular-nums" style="color: rgb(var(--md-on-surface-variant))">{{ stats.correct }}</span>
          </div>
          <div class="flex items-center gap-2 text-sm">
            <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background-color: rgb(var(--md-error))" />
            <span class="flex-1" style="color: rgb(var(--md-on-surface))">{{ i18n.t('practiceIncorrect') }}</span>
            <span class="text-xs font-bold tabular-nums" style="color: rgb(var(--md-error))">{{ stats.total > 0 ? 100 - accuracy : 0 }}%</span>
            <span class="text-xs tabular-nums" style="color: rgb(var(--md-on-surface-variant))">{{ stats.total - stats.correct }}</span>
          </div>
        </div>
      </div>

      <div class="card-outlined p-5 flex flex-col items-center">
        <div class="text-label-sm mb-3 self-start" style="color: rgb(var(--md-on-surface-variant))">{{ i18n.t('recordsTypeDist') }}</div>
        <div class="relative w-32 h-32">
          <svg viewBox="0 0 128 128" class="w-full h-full -rotate-90">
            <circle cx="64" cy="64" :r="PIE_R" fill="none" stroke-width="18" style="stroke: rgba(var(--md-primary) / 0.08)" />
            <circle
              v-for="seg in typeSegments"
              :key="seg.type"
              cx="64"
              cy="64"
              :r="PIE_R"
              fill="none"
              stroke-width="18"
              :stroke="seg.color"
              :stroke-dasharray="seg.dash"
              :stroke-dashoffset="seg.offset"
            />
          </svg>
          <div class="absolute inset-0 flex flex-col items-center justify-center">
            <span class="text-xl font-bold" style="color: rgb(var(--md-on-surface))">{{ stats.total }}</span>
            <span class="text-[11px]" style="color: rgb(var(--md-on-surface-variant))">{{ i18n.t('recordsTotal') }}</span>
          </div>
        </div>
        <div class="mt-3 space-y-1.5 w-full max-w-[200px]">
          <div v-for="seg in typeSegments" :key="seg.type" class="flex items-center gap-2 text-sm">
            <span class="w-2.5 h-2.5 rounded-full shrink-0" :style="{ backgroundColor: seg.color }" />
            <span class="flex-1 truncate" style="color: rgb(var(--md-on-surface))">{{ typeLabel(seg.type) }}</span>
            <span class="text-xs font-bold tabular-nums" :style="{ color: seg.color }">
              {{ stats.total > 0 ? Math.round((seg.count / stats.total) * 100) : 0 }}%
            </span>
            <span class="text-xs tabular-nums" style="color: rgb(var(--md-on-surface-variant))">{{ seg.count }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
