import { Ai } from '@cloudflare/workers-types'
import { DEFAULT_MODEL } from './types'

interface AIChatInput {
  model?: string
  systemPrompt: string
  userPrompt: string
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

  if (result && typeof result === 'object') {
    // Handle { response: "..." }
    if (result.response && typeof result.response === 'string') {
      if (!result.response.trim()) throw new Error('AI returned empty response')
      return result.response
    }

    // Handle streaming response (ReadableStream)
    if (result.response && typeof result.response === 'object') {
      throw new Error('Unexpected streaming response from AI model')
    }

    // Some models might return { choices: [{ message: { content: "..." } }] }
    if (result.choices?.[0]?.message?.content) {
      return result.choices[0].message.content
    }
  }

  throw new Error(`AI returned unexpected response: type=${typeof result} keys=${result ? Object.keys(result).join(',') : 'null'}`)
}
