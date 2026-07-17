import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Question } from '@exameow/shared'

export interface ScreenRegion {
  x: number
  y: number
  w: number
  h: number
}

export interface MatchResult {
  question: Question
  bankName: string
  score: number
}

export const useScreenRecordStore = defineStore('screenRecord', () => {
  const status = ref<'idle' | 'recording' | 'paused'>('idle')
  const region = ref<ScreenRegion>({
    x: 100,
    y: 100,
    w: 700,
    h: 300,
  })
  const currentResult = ref<MatchResult | null>(null)
  const ocrText = ref('')
  const lastCaptureHash = ref('')
  const overlayVisible = ref(true)
  const collapsed = ref(false)

  const isRecording = computed(() => status.value === 'recording')
  const answerText = computed(() => {
    if (!currentResult.value) return null
    return currentResult.value.question.answer
  })

  function startRecording() {
    status.value = 'recording'
    currentResult.value = null
    ocrText.value = ''
  }

  function stopRecording() {
    status.value = 'idle'
    currentResult.value = null
    ocrText.value = ''
    lastCaptureHash.value = ''
  }

  function setRegion(r: Partial<ScreenRegion>) {
    region.value = { ...region.value, ...r }
  }

  function setResult(result: MatchResult | null, text: string) {
    currentResult.value = result
    ocrText.value = text
  }

  function setLastCaptureHash(hash: string) {
    lastCaptureHash.value = hash
  }

  function toggleOverlay() {
    overlayVisible.value = !overlayVisible.value
  }

  function setCollapsed(v: boolean) {
    collapsed.value = v
  }

  return {
    status,
    region,
    currentResult,
    ocrText,
    lastCaptureHash,
    overlayVisible,
    collapsed,
    isRecording,
    answerText,
    startRecording,
    stopRecording,
    setRegion,
    setResult,
    setLastCaptureHash,
    toggleOverlay,
    setCollapsed,
  }
})
