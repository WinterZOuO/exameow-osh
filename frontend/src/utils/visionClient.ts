import type { VisionConfig } from '@exambot/shared'

const EXTRACT_SYSTEM_PROMPT = `You are an OCR assistant for exam questions. The user sends a photo containing one exam question (it may include options).

## Output Rules
1. Transcribe the question text exactly as it appears in the image, preserving the original language.
2. Include the stem and all options (one option per line, e.g. "A. ..."), if present.
3. Ignore surrounding page furniture: headers, footers, page numbers, watermarks, and unrelated questions cut off at the edges.
4. Output plain text only — no JSON, no markdown fences, no commentary.
5. If no question text is visible, output an empty string.`

export async function extractQuestionViaLLM(
  imageDataUrl: string,
  config: VisionConfig,
  signal?: AbortSignal,
): Promise<string> {
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
        { role: 'system', content: EXTRACT_SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Transcribe the exam question in this image.' },
            { type: 'image_url', image_url: { url: imageDataUrl } },
          ],
        },
      ],
      temperature: 0.2,
      max_tokens: 16384,
    }),
    signal,
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text().catch(() => '')}`)
  const data = await res.json()
  const content = data.choices?.[0]?.message?.content
  if (typeof content !== 'string') throw new Error('AI returned no content')
  return content.trim()
}
