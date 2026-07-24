import type {
  ExamResultEntry,
  ExamResultsResponse,
  GradedQuestion,
  PublicQuestion,
  PublishExamRequest,
  PublishExamResponse,
  PublishedExamInfo,
  Question,
  StoredExam,
  SubmitExamRequest,
  SubmitExamResponse,
} from './types'

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const CODE_LENGTH = 6
export const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000
const MAX_QUESTIONS = 500
const MAX_WINDOW_MS = 7 * 24 * 60 * 60 * 1000

export function generateCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH))
  let code = ''
  for (const b of bytes) code += CODE_ALPHABET[b % CODE_ALPHABET.length]
  return code
}

export function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function isExpired(exam: StoredExam): boolean {
  return Date.now() - exam.createdAt > MAX_AGE_MS
}

export async function readExam(bucket: R2Bucket, code: string): Promise<StoredExam | null> {
  const obj = await bucket.get(`exams/${code}.json`)
  if (!obj) return null
  const exam = (await obj.json()) as StoredExam
  if (isExpired(exam)) {
    await bucket.delete([`exams/${code}.json`, `results/${code}.json`])
    return null
  }
  return exam
}

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export async function handlePublish(
  bucket: R2Bucket,
  body: unknown,
  origin: string,
): Promise<Response> {
  const req = body as Partial<PublishExamRequest>
  if (typeof req.title !== 'string') return json({ error: 'Title is required' }, 400)
  const title = req.title.trim()
  const questions = req.questions
  const { startAt, endAt, durationMinutes } = req

  if (!title) return json({ error: 'Title is required' }, 400)
  if (!Array.isArray(questions) || questions.length === 0 || questions.length > MAX_QUESTIONS) {
    return json({ error: `Questions must be 1-${MAX_QUESTIONS}` }, 400)
  }
  if (
    typeof startAt !== 'number' ||
    typeof endAt !== 'number' ||
    typeof durationMinutes !== 'number' ||
    !(startAt < endAt) ||
    durationMinutes <= 0 ||
    endAt - startAt > MAX_WINDOW_MS
  ) {
    return json({ error: 'Invalid time window or duration' }, 400)
  }
  if (JSON.stringify(questions).length > 5 * 1024 * 1024) {
    return json({ error: 'Payload too large' }, 400)
  }

  let code = generateCode()
  for (let i = 0; i < 5; i++) {
    const head = await bucket.head(`exams/${code}.json`)
    if (!head) break
    code = generateCode()
  }

  const adminToken = randomToken()
  const stored: StoredExam = {
    title,
    questions: questions as Question[],
    startAt,
    endAt,
    durationMinutes,
    createdAt: Date.now(),
    adminTokenHash: await sha256Hex(adminToken),
  }
  await bucket.put(`exams/${code}.json`, JSON.stringify(stored))

  const res: PublishExamResponse = {
    code,
    adminToken,
    manageUrl: `${origin}/#/manage/${code}?token=${adminToken}`,
  }
  return json(res)
}

function normalizeChoice(s: string): string {
  return s.trim().toUpperCase().replace(/[^A-H]/g, '').split('').sort().join('')
}

function isTrueAnswer(a: string): boolean {
  const t = a.trim()
  return ['A', '√', '对', '正确', 'TRUE', 'T', '是', 'YES', 'Y', '1'].some(
    (v) =>
      t.toUpperCase() === v.toUpperCase() ||
      (v.length > 1 && t.includes(v) && !/[不非错没]/.test(t.replace(v, ''))),
  )
}

function grade(q: Question, user: string | undefined): boolean | null {
  if (q.type === 'short_answer') return null
  if (!user || !user.trim()) return false
  switch (q.type) {
    case 'single_choice':
    case 'multi_choice':
      return normalizeChoice(user) === normalizeChoice(q.answer)
    case 'true_false':
      return isTrueAnswer(user) === isTrueAnswer(q.answer)
    case 'fill_blank':
      return user.trim().toLowerCase() === q.answer.trim().toLowerCase()
    default:
      return false
  }
}

function windowCheck(exam: StoredExam): Response | null {
  const now = Date.now()
  if (now < exam.startAt) return json({ error: 'not_started', startAt: exam.startAt }, 403)
  if (now > exam.endAt) return json({ error: 'ended' }, 403)
  return null
}

export async function handleGetExam(bucket: R2Bucket, code: string): Promise<Response> {
  const exam = await readExam(bucket, code)
  if (!exam) return json({ error: 'not_found' }, 404)
  const deny = windowCheck(exam)
  if (deny) return deny
  const publicQuestions: PublicQuestion[] = exam.questions.map(
    ({ id, type, stem, options }) => ({ id, type, stem, options }),
  )
  const info: PublishedExamInfo = {
    title: exam.title,
    questions: publicQuestions,
    startAt: exam.startAt,
    endAt: exam.endAt,
    durationMinutes: exam.durationMinutes,
  }
  return json(info)
}

export async function handleSubmit(
  bucket: R2Bucket,
  code: string,
  body: unknown,
): Promise<Response> {
  const exam = await readExam(bucket, code)
  if (!exam) return json({ error: 'not_found' }, 404)
  const deny = windowCheck(exam)
  if (deny) return deny

  const req = body as Partial<SubmitExamRequest>
  if (typeof req.name !== 'string') return json({ error: 'Name is required' }, 400)
  const name = req.name.trim()
  if (!name) return json({ error: 'Name is required' }, 400)
  const answers = req.answers && typeof req.answers === 'object' ? req.answers : {}
  const durationSec = typeof req.durationSec === 'number' ? Math.max(0, Math.round(req.durationSec)) : 0

  const graded: GradedQuestion[] = exam.questions.map((q) => {
    const raw = answers[q.id]
    const userAnswer = typeof raw === 'string' ? raw : null
    return { question: q, userAnswer, isCorrect: grade(q, userAnswer ?? undefined) }
  })
  const objective = graded.filter((g) => g.isCorrect !== null)
  const correctCount = objective.filter((g) => g.isCorrect === true).length
  const pendingCount = graded.filter((g) => g.isCorrect === null).length

  const entry: ExamResultEntry = {
    name,
    answers: Object.fromEntries(
      Object.entries(answers).filter(([, v]) => typeof v === 'string'),
    ),
    score: correctCount,
    totalScore: objective.length,
    correctCount,
    totalCount: exam.questions.length,
    pendingCount,
    durationSec,
    submittedAt: Date.now(),
    detail: graded.map((g) => ({ questionId: g.question.id, isCorrect: g.isCorrect })),
  }

  const resultsKey = `results/${code}.json`
  let stored = false
  for (let attempt = 0; attempt < 3; attempt++) {
    const existing = await bucket.get(resultsKey)
    let results: ExamResultEntry[] = []
    if (existing) {
      try {
        const parsed = (await existing.json()) as { results?: ExamResultEntry[] }
        if (Array.isArray(parsed.results)) results = parsed.results
      } catch {
        results = []
      }
    }
    results.push(entry)
    if (results.length > 500) results = results.slice(results.length - 500)
    const payload = JSON.stringify({ results })
    const put = existing
      ? await bucket.put(resultsKey, payload, { onlyIf: { etagMatches: existing.etag } })
      : await bucket.put(resultsKey, payload, { onlyIf: { etagDoesNotMatch: '*' } })
    if (put) {
      stored = true
      break
    }
  }
  if (!stored) {
    console.error(`Failed to update results index for exam ${code} after 3 attempts`)
  }

  const res: SubmitExamResponse = {
    score: entry.score,
    totalScore: entry.totalScore,
    correctCount,
    totalCount: entry.totalCount,
    pendingCount,
    graded,
  }
  return json(res)
}

export async function handleResults(
  bucket: R2Bucket,
  code: string,
  token: string,
): Promise<Response> {
  const exam = await readExam(bucket, code)
  if (!exam) return json({ error: 'not_found' }, 404)
  if (!token || (await sha256Hex(token)) !== exam.adminTokenHash) {
    return json({ error: 'unauthorized' }, 403)
  }
  const obj = await bucket.get(`results/${code}.json`)
  let results: ExamResultEntry[] = []
  if (obj) {
    try {
      const parsed = (await obj.json()) as { results?: ExamResultEntry[] }
      if (Array.isArray(parsed.results)) results = parsed.results
    } catch {
      results = []
    }
  }
  results.sort((a, b) => b.score - a.score || a.submittedAt - b.submittedAt)
  const res: ExamResultsResponse = { title: exam.title, questions: exam.questions, results }
  return json(res)
}
