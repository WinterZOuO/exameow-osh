<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18nStore } from '@/stores/i18n'
import { useConfigStore } from '@/stores/config'
import { useCoursesStore } from '@/stores/courses'
import { useQuestionsStore } from '@/stores/questions'
import { useCoursePracticeStore } from '@/stores/coursePractice'
import { api } from '@/api'
import type { JudgeResult, ExplainResult } from '@exameow/shared'
import QuestionCard from '@/components/practice/QuestionCard.vue'
import {
  ArrowLeftIcon,
  PlayIcon,
  CheckCircleIcon,
  XCircleIcon,
  MinusCircleIcon,
  ArrowPathRoundedSquareIcon,
} from '@heroicons/vue/24/outline'

/**
 * 課程共享題庫嘅練習流程（W7）。抽題／判分／攞返 attempts 聚合都喺
 * `stores/coursePractice.ts`；呢度淨係畫面同 AI judge/explain 呢類要摞
 * 網絡請求嘅互動（同 `PracticeView.vue` 果套 `handleAiJudge`/`handleAiExplain`
 * 一樣嘅寫法，抄過嚟改個目標 store）。
 */

const route = useRoute()
const router = useRouter()
const i18n = useI18nStore()
const configStore = useConfigStore()
const coursesStore = useCoursesStore()
const questionsStore = useQuestionsStore()
const practiceStore = useCoursePracticeStore()

const courseId = computed(() => String(route.params.id))
const courseTitle = ref('')
const loadError = ref('')
const questionCount = ref(10)
const mySummary = ref<{ attempted: number; correct: number } | null>(null)

type ViewState = 'setup' | 'practice' | 'result'
const viewState = ref<ViewState>('setup')

const pool = computed(() => questionsStore.byCourse[courseId.value] ?? [])

onMounted(async () => {
  practiceStore.clearSession()
  try {
    const course = await coursesStore.getCourse(courseId.value)
    courseTitle.value = course.title
  } catch (e: any) {
    loadError.value = e.message || String(e)
    return
  }
  try {
    await questionsStore.fetchQuestions(courseId.value)
  } catch (e: any) {
    loadError.value = e.message || String(e)
  }
  try {
    mySummary.value = await api.myAttemptSummary(courseId.value)
  } catch {
    // 純粹顯示用嘅統計，攞唔到就唔顯示,唔阻住個練習流程
  }
  questionCount.value = Math.min(10, pool.value.length) || 1
})

function goBack() {
  router.push(`/courses/${courseId.value}`)
}

function startPractice() {
  practiceStore.startSession(courseId.value, pool.value, questionCount.value)
  viewState.value = 'practice'
}

function retryPractice() {
  startPractice()
}

// ---------------------------------------------------------------- 答題互動

async function handleSubmit(answer: string | null) {
  await practiceStore.submitAnswer(answer)
}

function handleSelect(answer: string | null) {
  practiceStore.setAnswer(answer)
}

async function handleSelfCheck(correct: boolean) {
  await applyGrade(correct)
}

async function handleRegrade(correct: boolean) {
  await applyGrade(correct)
}

async function applyGrade(correct: boolean) {
  await practiceStore.selfCheck(correct)
}

async function handleToggleFlag() {
  await practiceStore.toggleFlag()
}

function goNext() {
  if (practiceStore.isLastQuestion) {
    practiceStore.finishSession()
    viewState.value = 'result'
    return
  }
  practiceStore.nextQuestion()
}

function goPrev() {
  practiceStore.prevQuestion()
}

// ---------------------------------------------------------------- AI 判分／解釋（同 PracticeView 一樣嘅寫法）

const aiJudging = ref(false)
const aiFeedback = ref<string | null>(null)
const aiJudgeError = ref<string | null>(null)
let judgeAbort: AbortController | null = null
const aiExplaining = ref(false)
const aiExplainError = ref<string | null>(null)
let explainAbort: AbortController | null = null

function handleAiCancel() {
  judgeAbort?.abort()
  explainAbort?.abort()
}

async function handleAiJudge() {
  const item = practiceStore.currentItem
  if (!item || !item.userAnswer || aiJudging.value || item.submitted) return

  if (!configStore.configured) {
    await configStore.loadSaved()
    if (!configStore.configured) {
      aiJudgeError.value = i18n.t('searchNotConfigured')
      return
    }
  }

  aiJudging.value = true
  aiJudgeError.value = null
  aiFeedback.value = null
  judgeAbort = new AbortController()
  const language = i18n.promptLanguage
  const q = item.question
  const params = {
    stem: q.stem,
    reference_answer: q.answer,
    analysis: q.analysis || undefined,
    user_answer: item.userAnswer,
  }

  try {
    const result: JudgeResult = await api.judgeAnswer(params, language, configStore.model, judgeAbort.signal)
    if (practiceStore.currentItem !== item) return
    aiFeedback.value = result.feedback
    await applyGrade(result.correct)
  } catch (e: any) {
    if (e?.name !== 'AbortError') aiJudgeError.value = e?.message || String(e)
  } finally {
    aiJudging.value = false
    judgeAbort = null
  }
}

async function handleAiExplain() {
  const item = practiceStore.currentItem
  if (!item || !item.submitted || aiExplaining.value) return

  if (!configStore.configured) {
    await configStore.loadSaved()
    if (!configStore.configured) {
      aiExplainError.value = i18n.t('searchNotConfigured')
      return
    }
  }

  aiExplaining.value = true
  aiExplainError.value = null
  explainAbort = new AbortController()
  const language = i18n.promptLanguage
  const q = item.question
  const optionsText = q.options.length
    ? '\n' + q.options.map((o, i) => `${String.fromCharCode(65 + i)}. ${o}`).join('\n')
    : ''
  const params = {
    stem: q.stem + optionsText,
    reference_answer: q.answer,
    analysis: q.analysis || undefined,
  }

  try {
    const result: ExplainResult = await api.explainQuestion(params, language, configStore.model, explainAbort.signal)
    if (practiceStore.currentItem !== item) return
    practiceStore.saveAiAnalysis(result.explanation)
  } catch (e: any) {
    if (e?.name !== 'AbortError') aiExplainError.value = e?.message || String(e)
  } finally {
    aiExplaining.value = false
    explainAbort = null
  }
}

const typeLabelKeys: Record<string, string> = {
  single_choice: 'typeSingle',
  multi_choice: 'typeMulti',
  true_false: 'typeTrueFalse',
  fill_blank: 'typeFillBlank',
  short_answer: 'typeShortAnswer',
}
function typeLabel(type: string): string {
  const key = typeLabelKeys[type]
  return key ? i18n.t(key as any) : type
}
</script>

<template>
  <div class="max-w-2xl mx-auto pb-8">
    <div class="flex items-center gap-3 mb-6">
      <button class="btn-icon" @click="goBack">
        <ArrowLeftIcon class="w-5 h-5" />
      </button>
      <div class="min-w-0">
        <h1 class="text-display-sm font-bold tracking-tight truncate">{{ courseTitle || '...' }}</h1>
        <p class="text-body-sm" style="color: rgb(var(--md-on-surface-variant))">{{ i18n.t('questionsTitle') }}</p>
      </div>
    </div>

    <div v-if="loadError" class="px-4 py-3 rounded-2xl text-sm" style="background-color: rgb(var(--md-error-container)); color: rgb(var(--md-on-error-container))">
      {{ loadError }}
    </div>

    <!-- 設定：抽幾多題 -->
    <template v-else-if="viewState === 'setup'">
      <div class="card-filled p-5 sm:p-6 mb-4">
        <div v-if="pool.length === 0" class="text-body-sm py-6 text-center" style="color: rgb(var(--md-on-surface-variant))">
          {{ i18n.t('practiceCourseNoQuestions') }}
        </div>
        <template v-else>
          <p v-if="mySummary" class="text-body-sm mb-4" style="color: rgb(var(--md-on-surface-variant))">
            {{ i18n.t('practiceCourseMySummary', { attempted: mySummary.attempted, correct: mySummary.correct }) }}
          </p>
          <label class="text-label-md font-semibold block mb-2" style="color: rgb(var(--md-on-surface-variant))">
            {{ i18n.t('practiceCourseCount', { total: pool.length }) }}
          </label>
          <input
            v-model.number="questionCount"
            type="number"
            min="1"
            :max="pool.length"
            class="input-outlined mb-4"
          />
          <button class="btn-filled w-full" @click="startPractice">
            <PlayIcon class="w-4 h-4" />
            {{ i18n.t('practiceStartBtn') }}
          </button>
        </template>
      </div>
    </template>

    <!-- 練習中 -->
    <template v-else-if="viewState === 'practice' && practiceStore.currentItem">
      <div class="flex items-center justify-between mb-3 text-sm" style="color: rgb(var(--md-on-surface-variant))">
        <span>{{ i18n.t('practiceQuestionCount', { c: practiceStore.progress.current, t: practiceStore.progress.total }) }}</span>
        <span>{{ i18n.t('practiceAnsweredCount', { a: practiceStore.answeredCount, t: practiceStore.progress.total }) }}</span>
      </div>
      <div class="h-1.5 rounded-full overflow-hidden w-full mb-4" :style="{ backgroundColor: 'rgba(var(--md-primary) / 0.12)' }">
        <div
          class="h-full rounded-full transition-all duration-500 ease-out"
          :style="{ backgroundColor: 'rgb(var(--md-primary))', width: ((practiceStore.progress.current / practiceStore.progress.total) * 100) + '%' }"
        />
      </div>

      <QuestionCard
        :key="practiceStore.currentItem.question.id"
        :question="practiceStore.currentItem.question"
        mode="random"
        :user-answer="practiceStore.currentItem.userAnswer"
        :is-correct="practiceStore.currentItem.isCorrect"
        :submitted="practiceStore.currentItem.submitted"
        :question-number="practiceStore.progress.current"
        :auto-advancing="false"
        :flagged="practiceStore.currentItem.question.flagged_by_me"
        :ai-configured="configStore.configured"
        :ai-judging="aiJudging"
        :ai-feedback="aiFeedback"
        :ai-judge-error="aiJudgeError"
        :ai-explaining="aiExplaining"
        :ai-explain-error="aiExplainError"
        @submit="handleSubmit"
        @select="handleSelect"
        @self-check="handleSelfCheck"
        @regrade="handleRegrade"
        @toggle-flag="handleToggleFlag"
        @ai-judge="handleAiJudge"
        @ai-cancel="handleAiCancel"
        @ai-explain="handleAiExplain"
      />

      <div v-if="practiceStore.recordError" class="mt-3 px-4 py-3 rounded-2xl text-sm" style="background-color: rgb(var(--md-error-container)); color: rgb(var(--md-on-error-container))">
        {{ practiceStore.recordError }}
      </div>

      <div class="flex items-center gap-2 mt-4">
        <button class="btn-tonal flex-1" :disabled="practiceStore.isFirstQuestion" @click="goPrev">
          {{ i18n.t('practicePrevBtn') }}
        </button>
        <button class="btn-filled flex-1" @click="goNext">
          {{ practiceStore.isLastQuestion ? i18n.t('practiceResultTitle') : i18n.t('practiceNextBtn') }}
        </button>
      </div>
    </template>

    <!-- 結果 -->
    <template v-else-if="viewState === 'result' && practiceStore.session">
      <div class="card-filled p-6 text-center mb-4">
        <div class="text-display-sm font-bold mb-1">{{ practiceStore.score }} / {{ practiceStore.progress.total }}</div>
        <div class="text-body-sm" style="color: rgb(var(--md-on-surface-variant))">{{ i18n.t('practiceScore') }}</div>
      </div>
      <div class="space-y-2 mb-4">
        <div
          v-for="(item, i) in practiceStore.session.questions"
          :key="item.question.id"
          class="flex items-center gap-3 px-3 py-2.5 rounded-xl"
          style="background-color: rgb(var(--md-surface-container-highest))"
        >
          <CheckCircleIcon v-if="item.isCorrect === true" class="w-5 h-5 shrink-0" :style="{ color: 'rgb(var(--md-primary))' }" />
          <XCircleIcon v-else-if="item.isCorrect === false" class="w-5 h-5 shrink-0" :style="{ color: 'rgb(var(--md-error))' }" />
          <MinusCircleIcon v-else class="w-5 h-5 shrink-0" :style="{ color: 'rgb(var(--md-on-surface-variant))' }" />
          <div class="min-w-0 flex-1">
            <div class="text-sm truncate">{{ i + 1 }}. {{ item.question.stem }}</div>
            <div class="text-xs" style="color: rgb(var(--md-on-surface-variant))">
              {{ typeLabel(item.question.type) }}
              <template v-if="item.isCorrect === null"> · {{ i18n.t('practiceUnanswered') }}</template>
            </div>
          </div>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <button class="btn-tonal flex-1" @click="goBack">
          {{ i18n.t('genBackToCourse') }}
        </button>
        <button class="btn-filled flex-1" @click="retryPractice">
          <ArrowPathRoundedSquareIcon class="w-4 h-4" />
          {{ i18n.t('practiceRetryBtn') }}
        </button>
      </div>
    </template>
  </div>
</template>
