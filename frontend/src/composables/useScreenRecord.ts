import { useScreenRecordStore } from '@/stores/screenRecord'
import { api } from '@/api'
import { recognizeImage } from '@/utils/ocr'
import { searchQuestions } from '@/utils/questionSearch'
import { usePracticeStore } from '@/stores/practice'

type TimerHandle = ReturnType<typeof setInterval> | null

let timer: TimerHandle = null
let captureBusy = false

function computeThumbHash(base64: string): Promise<string> {
  return new Promise<string>((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = 64
      canvas.height = 48
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, 64, 48)
      const data = ctx.getImageData(0, 0, 64, 48).data
      let hash = ''
      for (let i = 0; i < data.length; i += 16) {
        hash += String.fromCharCode(data[i]! + data[i + 1]! + data[i + 2]!)
      }
      resolve(hash)
    }
    img.onerror = () => resolve('')
    img.src = base64
  })
}

async function capture() {
  if (captureBusy) return
  const store = useScreenRecordStore()
  if (store.status !== 'recording') return
  captureBusy = true
  try {
    const { x, y, w, h } = store.region
    const jpeg = await api.captureScreen(x, y, w, h)
    const hash = await computeThumbHash(jpeg)
    if (hash === store.lastCaptureHash) return

    store.setLastCaptureHash(hash)

    const img = new Image()
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('Failed to load JPEG'))
      img.src = jpeg
    })

    const canvas = document.createElement('canvas')
    canvas.width = img.width
    canvas.height = img.height
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(img, 0, 0)

    const text = await recognizeImage(canvas)
    if (!text.trim()) return

    const practiceStore = usePracticeStore()
    const hits = searchQuestions(text, practiceStore.banks, {
      bankIds: null,
      scope: 'stem_options',
      types: null,
    })

    if (hits.length > 0) {
      const best = hits[0]!
      store.setResult(
        {
          question: best.question,
          bankName: best.bankName,
          score: best.score,
        },
        text,
      )
    } else {
      store.setResult(null, text)
    }
  } catch {
    // silently ignore captures that fail (e.g., window unavailable)
  } finally {
    captureBusy = false
  }
}

export function useScreenRecord() {
  const store = useScreenRecordStore()

  async function start() {
    try {
      await setupWindows()
      startTimer()
    } catch (e) {
      console.error('[ScreenRecord] start failed:', e)
      store.stopRecording()
      throw e
    }
  }

  function startTimer() {
    if (timer) clearInterval(timer)
    timer = setInterval(capture, 1500)
  }

  function stopTimer() {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  }

  async function setupWindows() {
    console.log('[ScreenRecord] setupWindows start')
    const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow')
    const { getCurrentWindow } = await import('@tauri-apps/api/window')

    const screenWidth = window.screen.width
    const screenHeight = window.screen.height
    console.log('[ScreenRecord] screen:', screenWidth, 'x', screenHeight)

    const rw = Math.round(screenWidth * 0.6)
    const rh = Math.round(screenHeight * 0.4)
    const rx = Math.round((screenWidth - rw) / 2)
    const ry = Math.round(screenHeight * 0.08)

    store.setRegion({ x: rx, y: ry, w: rw, h: rh })
    console.log('[ScreenRecord] creating record-overlay at', rx, ry, rw, rh)

    const recordWin = new WebviewWindow('record-overlay', {
      url: '/index.html#/src-windows/record-overlay',
      x: rx,
      y: ry,
      width: rw,
      height: rh,
      decorations: false,
      transparent: true,
      alwaysOnTop: true,
      resizable: false,
      visible: true,
      focus: true,
    })
    console.log('[ScreenRecord] record-overlay window object created')

    const floatW = 320
    const floatH = 280
    const floatX = screenWidth - floatW - 20
    const floatY = screenHeight - floatH - 40
    console.log('[ScreenRecord] creating answer-float at', floatX, floatY, floatW, floatH)

    const floatWin = new WebviewWindow('answer-float', {
      url: '/index.html#/src-windows/answer-float',
      x: floatX,
      y: floatY,
      width: floatW,
      height: floatH,
      decorations: false,
      alwaysOnTop: true,
      resizable: true,
      visible: true,
      focus: true,
    })
    console.log('[ScreenRecord] answer-float window object created')

    await Promise.all([recordWin, floatWin])
    console.log('[ScreenRecord] both windows ready')

    const mainWin = getCurrentWindow()
    await mainWin.minimize()
    console.log('[ScreenRecord] main window minimized')
  }

  async function stop() {
    stopTimer()
    store.stopRecording()
    const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow')
    const { getCurrentWindow } = await import('@tauri-apps/api/window')

    try {
      const recordWin = await WebviewWindow.getByLabel('record-overlay')
      if (recordWin) await recordWin.close()
    } catch { /* ignore */ }

    try {
      const floatWin = await WebviewWindow.getByLabel('answer-float')
      if (floatWin) await floatWin.close()
    } catch { /* ignore */ }

    const mainWin = getCurrentWindow()
    await mainWin.unminimize()
    await mainWin.setFocus()
  }

  async function refresh() {
    captureBusy = false
    await capture()
  }

  return { start, stop, refresh }
}
