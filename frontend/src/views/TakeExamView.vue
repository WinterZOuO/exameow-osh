<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18nStore } from '@/stores/i18n'
import { fetchExam, submitExam, RelayError } from '@/api/relay'
import type { PublishedExamInfo, SubmitExamResponse } from '@exameow/shared'

const route = useRoute()
const router = useRouter()
const i18n = useI18nStore()

const code = (route.params.code as string || '').toUpperCase()
const studentName = (route.query.name as string || '').trim()

const loading = ref(true)
const errorKey = ref<'not_found' | 'not_started' | 'ended' | ''>('')
const notStartedTime = ref('')
const exam = ref<PublishedExamInfo | null>(null)
const answers = ref<Record<string, string>>({})
const remainingSec = ref(0)
const startedAt = ref(0)
const submitting = ref(false)
const submitError = ref('')
const result = ref<SubmitExamResponse | null>(null)
let timer: ReturnType<typeof setInterval> | null = null

const unansweredCount = computed(() => {
  if (!exam.value) return 0
  return exam.value.questions.filter((q) => !(answers.value[q.id] || '').trim()).length
})

const timeText = computed(() => {
  const s = Math.max(0, remainingSec.value)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`
})

function isSelected(qid: string, label: string, multi: boolean): boolean {
  const a = answers.value[qid] || ''
  if (multi) return a.includes(label)
  return a === label
}

function select(qid: string, label: string, multi: boolean) {
  if (result.value) return
  if (!multi) {
    answers.value[qid] = label
    return
  }
  const cur = answers.value[qid] || ''
  const next = cur.includes(label) ? cur.replace(label, '') : (cur + label).split('').sort().join('')
  answers.value[qid] = next
}

async function doSubmit() {
  if (submitting.value || result.value || !exam.value) return
  if (timer) clearInterval(timer)
  submitError.value = ''
  submitting.value = true
  try {
    result.value = await submitExam(code, {
      name: studentName,
      answers: answers.value,
      durationSec: Math.round((Date.now() - startedAt.value) / 1000),
    })
  } catch (e) {
    if (e instanceof RelayError && e.code === 'ended') errorKey.value = 'ended'
    else submitError.value = e instanceof Error ? e.message : String(e)
  } finally {
    submitting.value = false
  }
}

function handleSubmitClick() {
  if (unansweredCount.value > 0 && !window.confirm(i18n.t('takeSubmitConfirm', { n: unansweredCount.value }))) return
  doSubmit()
}

onMounted(async () => {
  try {
    const info = await fetchExam(code)
    exam.value = info
    startedAt.value = Date.now()
    const durationSec = info.durationMinutes * 60
    const windowSec = Math.floor((info.endAt - Date.now()) / 1000)
    remainingSec.value = Math.min(durationSec, windowSec)
    timer = setInterval(() => {
      remainingSec.value--
      if (remainingSec.value <= 0) doSubmit()
    }, 1000)
  } catch (e) {
    if (e instanceof RelayError) {
      if (e.code === 'not_started') {
        errorKey.value = 'not_started'
        if (e.startAt) notStartedTime.value = new Date(e.startAt).toLocaleString()
      }
      else if (e.code === 'ended') errorKey.value = 'ended'
      else errorKey.value = 'not_found'
    } else {
      errorKey.value = 'not_found'
    }
  } finally {
    loading.value = false
  }
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

const optionLabels = 'ABCDEFGH'.split('')
const isMulti = (t: string) => t === 'multi_choice'
const isChoice = (t: string) => ['single_choice', 'multi_choice', 'true_false'].includes(t)
</script>

<template>
  <div class="max-w-2xl mx-auto">
    <p v-if="loading" class="text-center py-10">{{ i18n.t('takeLoading') }}</p>

    <div v-else-if="errorKey" class="card-filled p-6 text-center space-y-4">
      <p class="text-body-lg" style="color: rgb(var(--md-error))">
        <template v-if="errorKey === 'not_started'">{{ i18n.t('takeNotStarted', { time: notStartedTime }) }}</template>
        <template v-else-if="errorKey === 'ended'">{{ i18n.t('takeEnded') }}</template>
        <template v-else>{{ i18n.t('takeNotFound') }}</template>
      </p>
      <button class="btn-tonal" @click="router.push('/')">{{ i18n.t('takeBackHome') }}</button>
    </div>

    <template v-else-if="exam && !result">
      <div class="sticky top-0 z-10 card-filled p-4 mb-4 flex items-center justify-between elevation-1">
        <div>
          <h1 class="text-title-md">{{ exam.title }}</h1>
          <p class="text-label-sm">{{ studentName }}</p>
        </div>
        <div class="text-right">
          <div class="text-label-sm">{{ i18n.t('takeTimeLeft') }}</div>
          <div class="text-title-md tabular-nums" style="color: rgb(var(--md-primary))">{{ timeText }}</div>
        </div>
      </div>

      <div v-for="(q, i) in exam.questions" :key="q.id" class="card-outlined p-4 mb-3">
        <p class="text-sm mb-3"><span class="font-bold mr-1">{{ i + 1 }}.</span>{{ q.stem }}</p>
        <div v-if="isChoice(q.type)" class="space-y-2">
          <button
            v-for="(opt, oi) in q.options"
            :key="oi"
            class="w-full text-left px-3 py-2 rounded-xl text-sm transition-colors"
            :style="isSelected(q.id, optionLabels[oi]!, isMulti(q.type))
              ? { backgroundColor: 'rgb(var(--md-primary))', color: 'rgb(var(--md-on-primary))' }
              : { backgroundColor: 'rgba(var(--md-primary) / 0.08)' }"
            @click="select(q.id, optionLabels[oi]!, isMulti(q.type))"
          >
            {{ optionLabels[oi] }}. {{ opt }}
          </button>
        </div>
        <input
          v-else-if="q.type === 'fill_blank'"
          v-model="answers[q.id]"
          class="input-outlined w-full"
        />
        <textarea v-else v-model="answers[q.id]" rows="3" class="input-outlined w-full" />
      </div>

      <div
        v-if="submitError"
        class="px-4 py-3 rounded-2xl text-sm mb-3 flex items-start justify-between gap-2"
        style="background-color: rgb(var(--md-error-container)); color: rgb(var(--md-on-error-container))"
      >
        <span>{{ i18n.t('takeSubmitFailed') }}: {{ submitError }}</span>
        <button class="shrink-0" @click="submitError = ''">✕</button>
      </div>

      <button class="btn-filled w-full !h-12 mb-8" :disabled="submitting" @click="handleSubmitClick">
        {{ submitting ? i18n.t('takeSubmitting') : i18n.t('takeSubmit') }}
      </button>
    </template>

    <template v-else-if="result">
      <div class="card-filled p-6 text-center mb-4">
        <div class="text-label-sm">{{ i18n.t('takeScore') }}</div>
        <div class="text-5xl font-bold my-2" style="color: rgb(var(--md-primary))">
          {{ result.score }} / {{ result.totalScore }}
        </div>
        <p v-if="result.pendingCount > 0" class="text-sm" style="color: rgb(var(--md-on-surface-variant))">
          {{ i18n.t('takePendingReview', { n: result.pendingCount }) }}
        </p>
      </div>
      <div v-for="(g, i) in result.graded" :key="g.question.id" class="card-outlined p-4 mb-3">
        <p class="text-sm mb-2"><span class="font-bold mr-1">{{ i + 1 }}.</span>{{ g.question.stem }}</p>
        <div class="text-label-sm">{{ i18n.t('takeYourAnswer') }}</div>
        <div class="text-sm mb-2" :style="{ color: g.isCorrect === false ? 'rgb(var(--md-error))' : 'rgb(var(--md-on-surface))' }">
          {{ g.userAnswer || i18n.t('takeUnanswered') }}
        </div>
        <div class="text-label-sm">{{ i18n.t('takeCorrectAnswer') }}</div>
        <div class="text-sm mb-2" style="color: rgb(var(--md-primary))">{{ g.question.answer }}</div>
        <div v-if="g.question.analysis" class="text-xs" style="color: rgb(var(--md-on-surface-variant))">{{ g.question.analysis }}</div>
      </div>
      <button class="btn-tonal w-full mb-8" @click="router.push('/')">{{ i18n.t('takeBackHome') }}</button>
    </template>
  </div>
</template>
