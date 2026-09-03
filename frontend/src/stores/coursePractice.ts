import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '@/api'
import type { SharedQuestion } from '@/api/http'
import { useQuestionsStore } from './questions'

/**
 * 課程共享題庫嘅練習流程（W7）。
 *
 * 同 `stores/practice.ts` 嗰套本機 bank 練習分開——呢度嘅「抽題」淨係
 * 喺前端由 `stores/questions.ts` 已經攞返嚟嘅 `status='active'` 共享池
 * 隨機揀 N 條，session 本身淨係喺記憶體度（唔似 practice.ts 咁存
 * localStorage）——重新整頁就要重新開始一次練習，呢個係刻意收窄嘅
 * scope：W7 嘅要求淨係「抽題 → 答 → 對答案 → 寫 attempts」，跨 reload
 * 保存進度中途嘅 session 唔喺呢個 checklist 度。
 *
 * 對唔對即刻喺前端判（判法照抄 `practice.ts` 嗰套），寫 `attempts` 純粹
 * 記低已經判過嘅結果 —— server 唔重新判一次。
 */

interface SessionItem {
  question: SharedQuestion
  userAnswer: string | null
  isCorrect: boolean | null
  submitted: boolean
}

interface CoursePracticeSession {
  courseId: string
  questions: SessionItem[]
  currentIndex: number
  startedAt: number
  finishedAt: number | null
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i]!, a[j]!] = [a[j]!, a[i]!]
  }
  return a
}

/**
 * 撞成隻 token 先算 exact match——直接用 `.includes()` 撞子字串會有問題：
 * "FALSE" 呢個字本身就藏咗個 "A"，會俾 TRUE 嗰組嘅 'A' 誤中副車，一條答案
 * 係「錯」嘅判斷題判到變咗「啱」（起呢個 store 測試嗰陣直接撞到）。單一個
 * 字/字母嘅 token 唔應該做 substring，淨係多過一個字嘅 token（例如成句
 * 「答案：正确」）先俾佢做 fallback。
 */
function normalizeTF(ans: string): string {
  const t = ans.trim().toUpperCase()
  const trueTokens = ['A', '√', '对', '正确', 'TRUE', 'T', '是', 'YES', 'Y', '1']
  const falseTokens = ['B', '×', '错', '错误', 'FALSE', 'F', '否', 'NO', 'N', '0']
  if (trueTokens.includes(t)) return 'TRUE'
  if (falseTokens.includes(t)) return 'FALSE'
  if (falseTokens.some(v => v.length > 1 && t.includes(v))) return 'FALSE'
  if (trueTokens.some(v => v.length > 1 && t.includes(v))) return 'TRUE'
  return t
}

/** `short_answer` 冇自動判——留返 view 層用 AI judge 或者用戶自己撳「啱/唔啱」 */
function gradeAnswer(q: SharedQuestion, answer: string | null): boolean | null {
  if (q.type === 'single_choice' || q.type === 'multi_choice') {
    const userAns = (answer ?? '').trim().toUpperCase().replace(/[^A-H]/g, '').split('').sort().join('')
    const correctAns = q.answer.trim().toUpperCase().replace(/[^A-H]/g, '').split('').sort().join('')
    return userAns === correctAns
  }
  if (q.type === 'true_false') {
    return normalizeTF(answer ?? '') === normalizeTF(q.answer)
  }
  if (q.type === 'fill_blank') {
    const userAns = (answer ?? '').trim().toLowerCase()
    const correctAns = q.answer.trim().toLowerCase()
    return userAns !== '' && userAns === correctAns
  }
  return null
}

export const useCoursePracticeStore = defineStore('coursePractice', () => {
  const session = ref<CoursePracticeSession | null>(null)
  /**
   * 寫 attempts/flag 失敗要俾用戶知——呢度係新開嘅 server 寫入路徑,
   * 唔重演 `practice.ts` 舊時 `catch {}` 靜默吞嘅問題。
   */
  const recordError = ref<string | null>(null)

  const currentItem = computed<SessionItem | null>(() => {
    if (!session.value) return null
    return session.value.questions[session.value.currentIndex] ?? null
  })
  const progress = computed(() => {
    if (!session.value) return { current: 0, total: 0 }
    return { current: session.value.currentIndex + 1, total: session.value.questions.length }
  })
  const isFirstQuestion = computed(() => !session.value || session.value.currentIndex === 0)
  const isLastQuestion = computed(() => {
    if (!session.value) return false
    return session.value.currentIndex >= session.value.questions.length - 1
  })
  const answeredCount = computed(() => session.value ? session.value.questions.filter(q => q.submitted).length : 0)
  const score = computed(() => session.value ? session.value.questions.filter(q => q.isCorrect === true).length : 0)

  function startSession(courseId: string, pool: SharedQuestion[], count: number) {
    const n = Math.max(1, Math.min(count, pool.length))
    const selected = shuffleArray(pool).slice(0, n)
    session.value = {
      courseId,
      questions: selected.map(q => ({ question: { ...q }, userAnswer: null, isCorrect: null, submitted: false })),
      currentIndex: 0,
      startedAt: Date.now(),
      finishedAt: null,
    }
    recordError.value = null
  }

  function setAnswer(answer: string | null) {
    const item = currentItem.value
    if (!item || item.submitted) return
    item.userAnswer = answer
  }

  async function recordAttempt(item: SessionItem) {
    if (!session.value) return
    try {
      await api.recordAttempt(session.value.courseId, item.question.id, item.userAnswer ?? '', item.isCorrect === true)
    } catch (e: any) {
      recordError.value = e?.message || String(e)
    }
  }

  async function submitAnswer(answer: string | null): Promise<boolean | null> {
    const item = currentItem.value
    if (!item) return null
    item.userAnswer = answer
    item.isCorrect = gradeAnswer(item.question, answer)
    item.submitted = true
    await recordAttempt(item)
    return item.isCorrect
  }

  /** short_answer/fill_blank 自己核對之後撳「啱」/「唔啱」，或者 AI judge 判完之後由 view 層call 呢個 */
  async function selfCheck(correct: boolean) {
    const item = currentItem.value
    if (!item) return
    item.isCorrect = correct
    item.submitted = true
    await recordAttempt(item)
  }

  async function toggleFlag(): Promise<boolean | null> {
    const item = currentItem.value
    if (!item || !session.value) return null
    try {
      const flagged = await useQuestionsStore().toggleFlag(session.value.courseId, item.question.id)
      item.question.flagged_by_me = flagged
      item.question.flag_count += flagged ? 1 : -1
      return flagged
    } catch (e: any) {
      recordError.value = e?.message || String(e)
      return null
    }
  }

  /** AI 解釋（`aiExplain`）攞返嚟嘅內容純粹本次 session 內顯示,唔寫返共享題庫 */
  function saveAiAnalysis(text: string) {
    const item = currentItem.value
    if (item) item.question.aiAnalysis = text
  }

  function nextQuestion() {
    if (!session.value) return
    if (session.value.currentIndex < session.value.questions.length - 1) {
      session.value.currentIndex++
    }
  }

  function prevQuestion() {
    if (!session.value) return
    if (session.value.currentIndex > 0) {
      session.value.currentIndex--
    }
  }

  function finishSession() {
    if (session.value) session.value.finishedAt = Date.now()
  }

  function clearSession() {
    session.value = null
    recordError.value = null
  }

  return {
    session,
    currentItem,
    progress,
    isFirstQuestion,
    isLastQuestion,
    answeredCount,
    score,
    recordError,
    startSession,
    setAnswer,
    submitAnswer,
    selfCheck,
    toggleFlag,
    saveAiAnalysis,
    nextQuestion,
    prevQuestion,
    finishSession,
    clearSession,
  }
})
