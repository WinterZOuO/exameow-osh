import type { AIConfig, AnswerResult, JudgeParams, JudgeResult } from '@exambot/shared'

const SYSTEM_PROMPT = `You are an expert exam-solving assistant. The user will give you an exam question (it may include options). Solve it.

## Output Rules
1. Respond ONLY with a valid JSON object — no explanation outside JSON, no markdown fences.
2. The JSON object MUST have exactly these fields:
   - "answer": the concise answer. For choice questions give the option letter(s) plus the option content; for true/false questions answer "True" or "False" (or the equivalent in the requested language); otherwise give the answer text directly.
   - "analysis": a clear step-by-step explanation of why this answer is correct.
3. Use the requested language for both fields.
4. If the question is ambiguous or unanswerable, still fill "answer" with your best attempt and explain the uncertainty in "analysis".`

export async function answerViaCustomAI(
  question: string,
  language: string,
  config: AIConfig,
  signal?: AbortSignal,
): Promise<AnswerResult> {
  const endpoint = config.endpoint.replace(/\/+$/, '')
  const res = await fetch(`${endpoint}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.api_key}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Language: ${language}\n\nQUESTION:\n${question}` },
      ],
      temperature: 0.7,
      max_tokens: 16384,
    }),
    signal,
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text().catch(() => '')}`)
  const data = await res.json()
  const content = data.choices?.[0]?.message?.content
  if (typeof content !== 'string') throw new Error('AI returned no content')
  return parseAnswer(content)
}

export function parseAnswer(raw: string): AnswerResult {
  let cleaned = raw.trim()
  cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, '')
  cleaned = cleaned.replace(/\n?```\s*$/i, '')

  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  const json = start >= 0 && end >= start ? cleaned.slice(start, end + 1) : cleaned

  const parsed = JSON.parse(json)
  if (typeof parsed?.answer !== 'string' || typeof parsed?.analysis !== 'string') {
    throw new Error('AI answer missing "answer"/"analysis" fields')
  }
  return { answer: parsed.answer, analysis: parsed.analysis }
}

const JUDGE_SYSTEM_PROMPT = `You are a strict but fair exam grader. You will be given an exam question, the reference answer, an optional reference analysis, and a student's answer. Decide whether the student's answer is correct.

## Grading Rules
1. Judge by meaning, not wording: if the student's answer is semantically equivalent to the reference answer, it is correct even if phrased differently.
2. A partial answer that misses key points required by the reference answer is incorrect.
3. Extra correct information does not make the answer wrong, unless it contradicts the reference answer.

## Output Rules
1. Respond ONLY with a valid JSON object — no explanation outside JSON, no markdown fences.
2. The JSON object MUST have exactly these fields:
   - "correct": true or false
   - "feedback": one or two sentences explaining why the answer is correct, or what is missing or wrong.
3. Write "feedback" in the requested language.`

function buildJudgeUserPrompt(params: JudgeParams, language: string): string {
  const analysis = params.analysis ?? ''
  const analysisBlock = analysis.trim() ? `\n\nREFERENCE ANALYSIS:\n${analysis}` : ''
  return `Language: ${language}\n\nQUESTION:\n${params.stem}\n\nREFERENCE ANSWER:\n${params.reference_answer}${analysisBlock}\n\nSTUDENT ANSWER:\n${params.user_answer}`
}

export async function judgeViaCustomAI(
  params: JudgeParams,
  language: string,
  config: AIConfig,
  signal?: AbortSignal,
): Promise<JudgeResult> {
  const endpoint = config.endpoint.replace(/\/+$/, '')
  const res = await fetch(`${endpoint}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.api_key}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: JUDGE_SYSTEM_PROMPT },
        { role: 'user', content: buildJudgeUserPrompt(params, language) },
      ],
      temperature: 0.7,
      max_tokens: 16384,
    }),
    signal,
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text().catch(() => '')}`)
  const data = await res.json()
  const content = data.choices?.[0]?.message?.content
  if (typeof content !== 'string') throw new Error('AI returned no content')
  return parseJudge(content)
}

export function parseJudge(raw: string): JudgeResult {
  let cleaned = raw.trim()
  cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, '')
  cleaned = cleaned.replace(/\n?```\s*$/i, '')

  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  const json = start >= 0 && end >= start ? cleaned.slice(start, end + 1) : cleaned

  const parsed = JSON.parse(json)
  if (typeof parsed?.correct !== 'boolean' || typeof parsed?.feedback !== 'string') {
    throw new Error('AI judge missing "correct"/"feedback" fields')
  }
  return { correct: parsed.correct, feedback: parsed.feedback }
}
