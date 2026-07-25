import type {
  ExamResultsResponse,
  PublishExamRequest,
  PublishExamResponse,
  PublishedExamInfo,
  SubmitExamRequest,
  SubmitExamResponse,
} from '@exameow/shared'

const RELAY_BASE: string =
  (import.meta.env.VITE_EXAM_RELAY as string | undefined) || 'https://exam.superagentparty.com'

export function examLinkFor(code: string): string {
  return `${RELAY_BASE}/#/take/${encodeURIComponent(code)}`
}

export class RelayError extends Error {
  constructor(
    public status: number,
    public code: string,
    public startAt?: number,
  ) {
    super(code)
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${RELAY_BASE}${path}`, init)
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
  if (!res.ok) {
    throw new RelayError(
      res.status,
      typeof data.error === 'string' ? data.error : 'unknown',
      typeof data.startAt === 'number' ? data.startAt : undefined,
    )
  }
  return data as T
}

export function publishExam(req: PublishExamRequest): Promise<PublishExamResponse> {
  return request('/api/exam/publish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })
}

export function fetchExam(code: string): Promise<PublishedExamInfo> {
  return request(`/api/exam/code/${encodeURIComponent(code)}`)
}

export function submitExam(code: string, req: SubmitExamRequest): Promise<SubmitExamResponse> {
  return request(`/api/exam/code/${encodeURIComponent(code)}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })
}

export function fetchResults(code: string, token: string): Promise<ExamResultsResponse> {
  return request(`/api/exam/code/${encodeURIComponent(code)}/results?token=${encodeURIComponent(token)}`)
}

export function deleteExam(code: string, token: string): Promise<{ ok: boolean }> {
  return request(`/api/exam/code/${encodeURIComponent(code)}?token=${encodeURIComponent(token)}`, {
    method: 'DELETE',
  })
}

export function reportExam(code: string, reason: string): Promise<{ ok: boolean }> {
  return request(`/api/exam/code/${encodeURIComponent(code)}/report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  })
}
