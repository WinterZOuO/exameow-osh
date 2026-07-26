import { Ai } from '@cloudflare/workers-types'
import { DEFAULT_MODEL } from './types'

interface AIChatInput {
  model?: string
  systemPrompt: string
  userPrompt: string
}

function isReadableStream(value: unknown): value is ReadableStream {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as ReadableStream).getReader === 'function'
  )
}

function consumeSseLine(line: string, out: { text: string }): void {
  const trimmed = line.trim()
  if (!trimmed.startsWith('data:')) return
  const data = trimmed.slice(5).trim()
  if (!data || data === '[DONE]') return
  try {
    const parsed = JSON.parse(data)
    if (typeof parsed.response === 'string') {
      out.text += parsed.response
    } else if (typeof parsed.choices?.[0]?.delta?.content === 'string') {
      out.text += parsed.choices[0].delta.content
    } else if (typeof parsed.choices?.[0]?.message?.content === 'string') {
      out.text += parsed.choices[0].message.content
    }
  } catch {}
}

async function readStreamText(stream: ReadableStream): Promise<string> {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  const out = { text: '' }
  let buffer = ''
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) consumeSseLine(line, out)
    }
    buffer += decoder.decode()
    if (buffer) consumeSseLine(buffer, out)
  } finally {
    reader.releaseLock()
  }
  return out.text
}

export async function aiChat(
  ai: Ai,
  input: AIChatInput
): Promise<string> {
  const model = input.model || DEFAULT_MODEL

  const result: any = await ai.run(model as any, {
    messages: [
      { role: 'system', content: input.systemPrompt },
      { role: 'user', content: input.userPrompt },
    ],
    temperature: 0.7,
    max_tokens: 16384,
    stream: false,
  })

  console.log('AI result type:', typeof result, 'keys:', result ? Object.keys(result) : 'null')

  // CF Workers AI returns { response: string } for text generation
  if (typeof result === 'string') {
    if (!result.trim()) throw new Error('AI returned empty response')
    return result
  }

  // Some models return a ReadableStream directly even with stream: false
  if (isReadableStream(result)) {
    const text = await readStreamText(result)
    if (!text.trim()) throw new Error('AI returned empty response')
    return text
  }

  if (result && typeof result === 'object') {
    // Handle { response: "..." }
    if (result.response && typeof result.response === 'string') {
      if (!result.response.trim()) throw new Error('AI returned empty response')
      return result.response
    }

    // Handle { response: ReadableStream } — some models ignore stream: false
    if (isReadableStream(result.response)) {
      const text = await readStreamText(result.response)
      if (!text.trim()) throw new Error('AI returned empty response')
      return text
    }

    // Handle { response: [...content segments] } — some models return arrays
    if (Array.isArray(result.response)) {
      const text = result.response
        .map((seg: any) => (typeof seg === 'string' ? seg : (seg?.text ?? seg?.content ?? '')))
        .join('')
      if (text.trim()) return text
    }

    // Handle { response: { text | content } }
    if (result.response && typeof result.response === 'object') {
      const inner = result.response as any
      const text =
        typeof inner.text === 'string'
          ? inner.text
          : typeof inner.content === 'string'
            ? inner.content
            : ''
      if (text.trim()) return text
    }

    // Some models might return { choices: [{ message: { content: "..." } }] }
    if (result.choices?.[0]?.message?.content) {
      return result.choices[0].message.content
    }
  }

  const payload = (() => {
    try {
      return JSON.stringify(result)?.slice(0, 500) ?? 'null'
    } catch {
      return String(result)
    }
  })()
  throw new Error(`AI returned unexpected response: type=${typeof result} keys=${result ? Object.keys(result).join(',') : 'null'} payload=${payload}`)
}
