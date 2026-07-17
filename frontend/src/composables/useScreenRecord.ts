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
    await setupWindows()
    startTimer()
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
    const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow')
    const { getCurrentWindow } = await import('@tauri-apps/api/window')

    const screenWidth = window.screen.width
    const screenHeight = window.screen.height

    // Plain test window — no decorations false, no transparent, no alwaysOnTop
    const testWin = new WebviewWindow('record-overlay', {
      url: '/',
      title: 'TEST WINDOW',
      width: 400,
      height: 300,
      x: 100,
      y: 100,
      visible: true,
    })

    await testWin

    const mainWin = getCurrentWindow()
    await mainWin.minimize()
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
