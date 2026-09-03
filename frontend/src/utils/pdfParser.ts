import * as pdfjsLib from 'pdfjs-dist'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

// macOS Quartz 生成的 PDF 常把汉字映射到 Kangxi 部首/CJK 兼容字符码点
//（如 ⼈⼤⽹），视觉相同但码点不同，会严重影响搜题匹配，按 NFKC 归一化回标准汉字
function normalizeCompatChars(s: string): string {
  return s.replace(/[\u2E80-\u2EFF\u2F00-\u2FDF\uF900-\uFAFF]/g, (ch) => ch.normalize('NFKC'))
}

// page.getTextContent() 内部对 ReadableStream 做 for-await 迭代，
// 旧版 WKWebView 不支持 ReadableStream 异步迭代器（TypeError），
// 这里改用 streamTextContent() + getReader() 手动消费，兼容性更好。
async function getPageText(page: any): Promise<string> {
  const stream = page.streamTextContent()
  const reader = stream.getReader()
  const items: any[] = []
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      if (value?.items?.length) items.push(...value.items)
    }
  } finally {
    reader.releaseLock()
  }
  return normalizeCompatChars(
    items
      .map((item: any) => item.str)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
  )
}

export async function extractPdfText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })
  const pdf = await loadingTask.promise

  const texts: string[] = []

  try {
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const pageText = await getPageText(page)
      if (pageText) texts.push(pageText)
    }

    return texts.join('\n\n')
  } finally {
    await loadingTask.destroy()
  }
}

export async function extractPdfTextWithProgress(
  file: File,
  onProgress: (done: number, total: number) => void,
  signal?: AbortSignal,
): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })
  const pdf = await loadingTask.promise
  if (signal?.aborted) {
    await loadingTask.destroy()
    throw new DOMException('Cancelled', 'AbortError')
  }

  const total = pdf.numPages
  const texts: string[] = []

  try {
    for (let i = 1; i <= total; i++) {
      if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError')
      try {
        const page = await pdf.getPage(i)
        const pageText = await getPageText(page)
        if (pageText) texts.push(pageText)
      } catch (e: any) {
        if (e?.name === 'AbortError') throw e
        console.warn(`[pdfParser] Failed to extract text for page ${i}:`, e)
      }
      onProgress(i, total)
    }

    return texts.join('\n\n')
  } finally {
    await loadingTask.destroy()
  }
}

export async function getPdfPageCount(file: File, signal?: AbortSignal): Promise<number> {
  const arrayBuffer = await file.arrayBuffer()
  if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError')
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })
  const pdf = await loadingTask.promise
  if (signal?.aborted) {
    await loadingTask.destroy()
    throw new DOMException('Cancelled', 'AbortError')
  }
  const num = pdf.numPages
  await loadingTask.destroy()
  return num
}

