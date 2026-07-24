import type {
  Question,
  PublishExamRequest,
  PublishExamResponse,
  StoredExam,
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
    await bucket.delete(`exams/${code}.json`)
    return null
  }
  return exam
}

function json(data: unknown, status = 200): Response {
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
  const title = (req.title || '').trim()
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
