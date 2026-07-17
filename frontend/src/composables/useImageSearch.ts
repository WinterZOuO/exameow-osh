import { ref, computed } from 'vue'
import { useVisionConfigStore } from '@/stores/visionConfig'
import { fileToCanvas, canvasToJpegDataUrl } from '@/utils/image'
import { recognizeImage } from '@/utils/ocr'
import { api } from '@/api'
import { isCloudflare } from '@/utils/platform'

export type RecognizePhase = 'idle' | 'loading-model' | 'recognizing'

export interface RecognizeOptions {
  forceOcr?: boolean
}

export function useImageSearch() {
  const visionStore = useVisionConfigStore()
  const phase = ref<RecognizePhase>('idle')
  const error = ref('')
  const usedFallback = ref(false)
  const busy = computed(() => phase.value !== 'idle')

  let generation = 0
  let abortController: AbortController | null = null

  async function recognize(file: Blob, opts: RecognizeOptions = {}): Promise<string | null> {
    const gen = ++generation
    error.value = ''
    usedFallback.value = false
    abortController?.abort()
    abortController = new AbortController()
    const signal = abortController.signal

    try {
      await visionStore.loadSaved()
      const useLlm = !opts.forceOcr && visionStore.mode === 'llm'

      if (useLlm && !visionStore.llmConfigured) {
        usedFallback.value = true
      }

      let text: string
      if (useLlm && visionStore.llmConfigured) {
        phase.value = 'recognizing'
        const canvas = await fileToCanvas(file)
        const dataUrl = canvasToJpegDataUrl(canvas)
        const config = visionStore.getConfig()
        if (isCloudflare()) {
          const { extractQuestionViaLLM } = await import('@/utils/visionClient')
          text = await extractQuestionViaLLM(dataUrl, config, signal)
        } else {
          text = await api.extractQuestionText(dataUrl, config, signal)
        }
      } else {
        phase.value = 'loading-model'
        const canvas = await fileToCanvas(file)
        phase.value = 'recognizing'
        text = await recognizeImage(canvas)
      }

      if (gen !== generation) return null
      return text.trim()
    } catch (e: any) {
      if (gen !== generation || e?.name === 'AbortError') return null
      error.value = e?.message || String(e)
      return null
    } finally {
      if (gen === generation) phase.value = 'idle'
    }
  }

  function cancel() {
    generation++
    abortController?.abort()
    phase.value = 'idle'
  }

  return { phase, error, busy, usedFallback, recognize, cancel }
}
