import type { AIConfig, AnswerResult } from '@exambot/shared'

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
