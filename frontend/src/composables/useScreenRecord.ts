import { useScreenRecordStore, type ScreenRegion } from '@/stores/screenRecord'
import { api } from '@/api'
import { recognizeImage, preloadOcr } from '@/utils/ocr'
import { searchQuestions, decideScanResult } from '@/utils/questionSearch'
import { usePracticeStore } from '@/stores/practice'
import { isAndroid } from '@/utils/platform'

type TimerHandle = ReturnType<typeof setInterval> | null

let timer: TimerHandle = null
let captureBusy = false
let captureQueued = false
let floatUnlistenFns: Array<() => void> = []

function log(...args: unknown[]) {
  console.log('[录屏搜题]', ...args)
}

function computeThumbHash(src: string): Promise<string> {
  return new Promise<string>((resolve) => {
    const img = new Image()
    img.onload = () => {
      const W = 128
      const H = 96
      const canvas = document.createElement('canvas')
      canvas.width = W
      canvas.height = H
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!
      ctx.drawImage(img, 0, 0, W, H)
      const data = ctx.getImageData(0, 0, W, H).data
      let sig = ''
      for (let i = 0; i < data.length; i += 4) {
        const lum = (data[i]! * 3 + data[i + 1]! * 4 + data[i + 2]!) >> 3
        sig += (lum >> 4).toString(16)
      }
      resolve(sig)
    }
    img.onerror = () => resolve('')
    img.src = src
  })
}

let processBusy = false
let processQueued: string | null = null

async function processFrame(dataUrl: string) {
  const store = useScreenRecordStore()
  if (store.status !== 'recording') return
  const hash = await computeThumbHash(dataUrl)
  if (hash && hash === store.lastCaptureHash) return
  store.setLastCaptureHash(hash)

  const img = new Image()
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject(new Error('Failed to load JPEG'))
    img.src = dataUrl
  })

  const MAX_SIDE = 1280
  const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(img.width * scale))
  canvas.height = Math.max(1, Math.round(img.height * scale))
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

  const t1 = performance.now()
  const text = await recognizeImage(canvas)
  const ocrMs = Math.round(performance.now() - t1)

  if (store.status !== 'recording') {
    log('识别完成时已暂停，丢弃结果')
    return
  }
  if (!text.trim()) {
    log(`OCR ${ocrMs}ms，无文本`)
    return
  }
  log(`OCR ${ocrMs}ms (${canvas.width}x${canvas.height}):`, text.slice(0, 100) + (text.length > 100 ? '…' : ''))

  const practiceStore = usePracticeStore()
  const hits = searchQuestions(text, practiceStore.banks, {
    bankIds: null,
    scope: 'stem_options',
    types: null,
    mode: 'scan',
  })

  log('候选:', hits.length
    ? hits.slice(0, 3).map((hh) => `${hh.question.stem.slice(0, 16)}…=${hh.score.toFixed(2)}`).join(' | ')
    : '无')

  const decision = decideScanResult(store.currentResult?.question ?? null, hits)
  log('决策:', decision.reason, `→ ${decision.action}`)

  if (decision.action === 'set' && decision.hit) {
    store.setResult(
      {
        question: decision.hit.question,
        bankName: decision.hit.bankName,
        score: decision.hit.score,
      },
      text,
    )
  } else if (decision.action === 'clear') {
    store.setResult(null, text)
  }
}

async function captureOnce() {
  const store = useScreenRecordStore()
  if (store.status !== 'recording') return
  try {
    const { x, y, w, h } = store.region
    const t0 = performance.now()
    const jpeg = await api.captureScreen(x, y, w, h)
    log(`截图 ${Math.round(performance.now() - t0)}ms`)
    await processFrame(`data:image/jpeg;base64,${jpeg}`)
  } catch (e) {
    console.warn('[录屏搜题] capture failed:', e)
  }
}

async function capture() {
  if (captureBusy) {
    captureQueued = true
    return
  }
  captureBusy = true
  try {
    do {
      captureQueued = false
      await captureOnce()
    } while (captureQueued)
  } finally {
    captureBusy = false
  }
}

function startTimer() {
  if (timer) clearInterval(timer)
  timer = setInterval(capture, 1200)
}

function stopTimer() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

export function useScreenRecord() {
  const store = useScreenRecordStore()

  // ===== Android (mobile) side: native plugin drives capture; the webview
  // receives cropped JPEG frames over a Channel and pushes results back =====

  async function processFrameMobile(dataUrl: string) {
    if (processBusy) {
      processQueued = dataUrl
      return
    }
    processBusy = true
    let current: string | null = dataUrl
    try {
      while (current) {
        const frame = current
        current = null
        try {
          await processFrame(frame)
        } catch (e) {
          console.warn('[录屏搜题] mobile frame failed:', e)
        }
        current = processQueued
        processQueued = null
      }
    } finally {
      processBusy = false
    }
    await pushAnswerToOverlay()
  }

  async function pushAnswerToOverlay() {
    const r = store.currentResult
    try {
      const { invoke } = await import('@tauri-apps/api/core')
      await invoke('plugin:screenrecord|show_answer', {
        paused: store.status === 'adjusting',
        found: !!r,
        answer: r?.question.answer ?? '',
        stem: r?.question.stem ?? '',
        options: r?.question.options ?? [],
        bankName: r?.bankName ?? '',
      })
    } catch { /* overlay gone */ }
  }

  async function startMobile() {
    const { invoke, Channel } = await import('@tauri-apps/api/core')

    preloadOcr().catch(() => {})

    const chan = new Channel<Record<string, unknown>>()
    chan.onmessage = (msg) => {
      switch (msg?.type) {
        case 'begin':
          store.beginRecording()
          store.setLastCaptureHash('')
          void pushAnswerToOverlay()
          break
        case 'frame':
          void processFrameMobile(`data:image/jpeg;base64,${String(msg.data ?? '')}`)
          break
        case 'adjust':
          store.pauseToAdjust()
          void pushAnswerToOverlay()
          break
        case 'refresh':
          store.setLastCaptureHash('')
          break
        case 'exit':
        case 'denied':
          store.stopRecording()
          break
      }
    }

    await invoke('plugin:screenrecord|start_session', { events: chan })
    await pushAnswerToOverlay()
  }

  // ===== Main window side =====
  async function start() {
    if (isAndroid()) {
      await startMobile()
      return
    }

    const screenWidth = window.screen.width
    const screenHeight = window.screen.height

    const rw = Math.round(screenWidth * 0.6)
    const rh = Math.round(screenHeight * 0.4)
    const rx = Math.round((screenWidth - rw) / 2)
    const ry = Math.round(screenHeight * 0.08)

    const floatW = 340
    const floatH = 320
    const floatX = screenWidth - floatW - 20
    const floatY = screenHeight - floatH - 40

    await api.createRecordWindows(rx, ry, rw, rh, floatX, floatY, floatW, floatH)
  }

  // ===== Answer-float window side (capture loop lives here: this window is
  // always visible, so WebKit never throttles or kills canvas/WASM work) =====

  async function initFloat() {
    const { listen } = await import('@tauri-apps/api/event')

    for (const fn of floatUnlistenFns) fn()
    floatUnlistenFns = []

    preloadOcr().catch(() => {})

    floatUnlistenFns.push(await listen<ScreenRegion>('screen-record:begin', (e) => {
      if (e.payload) store.setRegion(e.payload)
      store.beginRecording()
      store.setLastCaptureHash('')
      startTimer()
      void capture()
    }))

    floatUnlistenFns.push(await listen('screen-record:adjust', () => {
      stopTimer()
      store.pauseToAdjust()
    }))
  }

  async function refresh() {
    store.setLastCaptureHash('')
    await capture()
  }

  async function adjust() {
    stopTimer()
    store.pauseToAdjust()
    const { emit } = await import('@tauri-apps/api/event')
    await emit('screen-record:adjust')
  }

  async function stop() {
    stopTimer()
    store.stopRecording()
    for (const fn of floatUnlistenFns) fn()
    floatUnlistenFns = []
    try {
      await api.closeRecordWindows()
    } catch { /* ignore */ }
  }

  return { start, initFloat, refresh, adjust, stop }
}
