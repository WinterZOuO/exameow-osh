import * as pdfjsLib from 'pdfjs-dist'
import { recognizeImage } from './ocr'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

const MIN_CHARS_PER_PAGE = 30
const MAX_PDF_RENDER_SIDE = 2000

function renderScaleForViewport(viewport: { width: number; height: number }): number {
  const longSide = Math.max(viewport.width, viewport.height)
  if (longSide <= MAX_PDF_RENDER_SIDE) return 1
  return MAX_PDF_RENDER_SIDE / longSide
}

export async function extractPdfText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

  const texts: string[] = []

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const pageText = content.items
      .map((item: any) => item.str)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
    if (pageText) texts.push(pageText)
  }

  return texts.join('\n\n')
}

export async function extractPdfTextWithOcr(
  file: File,
  onProgress: (done: number, total: number, ocrPages: number) => void,
  signal?: AbortSignal,
): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError')

  const total = pdf.numPages
  const texts: string[] = []
  let ocrPages = 0

  for (let i = 1; i <= total; i++) {
    if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError')

    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const pageText = content.items
      .map((item: any) => item.str)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()

    if (pageText.length >= MIN_CHARS_PER_PAGE) {
      if (pageText) texts.push(pageText)
    } else {
      const viewport = page.getViewport({ scale: renderScaleForViewport(page.getViewport({ scale: 1 })) })
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(viewport.width)
      canvas.height = Math.round(viewport.height)
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('canvas 2d context unavailable')
      await page.render({ canvasContext: ctx, viewport } as unknown as Parameters<typeof page.render>[0]).promise
      if (signal?.aborted) {
        canvas.width = 0
        canvas.height = 0
        throw new DOMException('Cancelled', 'AbortError')
      }
      try {
        const text = await recognizeImage(canvas)
        if (text) texts.push(text)
        ocrPages++
      } catch (e) {
        console.warn(`[pdfParser] OCR failed for page ${i}:`, e)
      } finally {
        canvas.width = 0
        canvas.height = 0
      }
    }

    onProgress(i, total, ocrPages)
  }

  return texts.join('\n\n')
}

export async function getPdfPageCount(file: File, signal?: AbortSignal): Promise<number> {
  const arrayBuffer = await file.arrayBuffer()
  if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError')
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError')
  return pdf.numPages
}

