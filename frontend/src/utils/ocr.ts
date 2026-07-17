import { isCloudflare } from './platform'
import ortWasmUrl from 'onnxruntime-web/ort-wasm-simd-threaded.jsep.wasm?url'
import ortMjsUrl from 'onnxruntime-web/ort-wasm-simd-threaded.jsep.mjs?url'

type OcrService = {
  recognize: (input: HTMLCanvasElement, options?: Record<string, unknown>) => Promise<{ text: string }>
  destroy: () => Promise<void>
}

let servicePromise: Promise<OcrService> | null = null

const ORT_CDN = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.27.0/dist/'

async function createService(): Promise<OcrService> {
  const [ppu, ort] = await Promise.all([
    import('ppu-paddle-ocr/web'),
    import('onnxruntime-web'),
  ])
  ort.env.wasm.wasmPaths = isCloudflare()
    ? ORT_CDN
    : { wasm: new URL(ortWasmUrl, location.href).href, mjs: new URL(ortMjsUrl, location.href).href }
  const model = isCloudflare()
    ? ppu.V6_TINY_MODEL
    : { detection: '/ocr/detection.onnx', recognition: '/ocr/recognition.onnx', charactersDictionary: '/ocr/dict.txt' }
  const service = new ppu.PaddleOcrService({ model })
  await service.initialize()
  return service as unknown as OcrService
}

export function preloadOcr(): Promise<void> {
  if (!servicePromise) servicePromise = createService()
  return servicePromise.then(() => undefined)
}

export async function recognizeImage(canvas: HTMLCanvasElement): Promise<string> {
  if (!servicePromise) servicePromise = createService()
  let service: OcrService
  try {
    service = await servicePromise
  } catch (e) {
    servicePromise = null
    throw e
  }
  const result = await service.recognize(canvas)
  return (result.text || '').trim()
}
