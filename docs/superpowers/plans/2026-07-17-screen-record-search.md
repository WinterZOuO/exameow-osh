# 录屏搜题 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement real-time screen-recording question search using Tauri multi-window, local OCR, and local bank matching.

**Architecture:** Rust xcap captures screen regions → base64 JPEG returned to frontend → 1.5s interval with image-diff gating → PaddleOCR extraction → `searchQuestions()` matching → best result displayed in a draggable floating answer panel. Two secondary Tauri windows: a transparent recording overlay (upper-mid) and an answer float (bottom-right), communicating via Tauri events.

**Tech Stack:** Vue 3 + TypeScript, Tauri v2 (Rust), xcap (screen capture), PaddleOCR (ppu-paddle-ocr), Pinia

## Global Constraints

- **Platform:** Only Tauri desktop (macOS/Windows/Linux) and Tauri mobile (Android/iOS). Web/Docker/Cloudflare show "not supported".
- **OCR mode:** Local PaddleOCR only. No LLM vision fallback for screen recording.
- **Screenshot interval:** 1.5 seconds, skipped when image unchanged (64×48 thumbhash comparison).
- **Manual refresh:** Pull-down or double-tap gesture on answer float (NOT a button).
- **Float buttons:** Exactly 3 — collapse, adjust, exit.
- **Result layout:** Answer highlighted top row → stem 2-line clamp → options.
- **Window communication:** Tauri `emit`/`listen` events only.
- **Version:** 2.1.1 (no version bump).
- **No test suite exists.**

---

## File Structure

| Action | File | Purpose |
|--------|------|---------|
| Create | `frontend/src/views/ScreenRecordView.vue` | Start page at `/search/screen-record` |
| Create | `frontend/src/components/search/RecordOverlay.vue` | Transparent recording overlay content |
| Create | `frontend/src/components/search/AnswerFloat.vue` | Floating answer panel content |
| Create | `frontend/src/composables/useScreenRecord.ts` | Core orchestration logic |
| Create | `frontend/src/stores/screenRecord.ts` | Screen recording state (region, results) |
| Modify | `frontend/src/views/SearchHomeView.vue` | Enable screenRecord card |
| Modify | `frontend/src/router/index.ts` | Add `/search/screen-record` route |
| Modify | `frontend/src/i18n/locales.ts` | Add new locale strings |
| Modify | `frontend/src/api/bridge.ts` | Add `captureScreen` method |
| Modify | `frontend/src/api/index.ts` | Add `captureScreen` (Tauri-only) |
| Modify | `src-tauri/src/lib.rs` | Add `capture_screen` Tauri command |
| Modify | `src-tauri/Cargo.toml` | Add `xcap` and `image` deps |
| Modify | `src-tauri/tauri.conf.json` | Register child windows |
| Modify | `src-tauri/capabilities/default.json` | Add child window labels |

---

### Task 1: Rust — xcap dependency + capture_screen command

**Files:**
- Modify: `src-tauri/Cargo.toml`
- Modify: `src-tauri/src/lib.rs`

**Interfaces:**
- Produces: `capture_screen(x: i32, y: i32, w: i32, h: i32) -> Result<String, CommandError>` (returns base64 JPEG)

- [ ] **Step 1: Add xcap and image dependencies to Cargo.toml**

In `src-tauri/Cargo.toml`, add to `[dependencies]`:

```toml
xcap = "0.5"
image = { version = "0.25", default-features = false, features = ["jpeg"] }
```

- [ ] **Step 2: Implement capture_screen command in lib.rs**

In `src-tauri/src/lib.rs`, add the new import after `use base64::Engine;` (line 14):

```rust
use image::GenericImageView;
```

Add the new command before line 232 (`fn greet`):

```rust
#[tauri::command]
fn capture_screen(x: i32, y: i32, w: i32, h: i32) -> Result<String, CommandError> {
    let monitors = xcap::Monitor::all()
        .map_err(|e| CommandError(format!("Failed to enumerate monitors: {e}")))?;
    let primary = monitors
        .into_iter()
        .next()
        .ok_or_else(|| CommandError("No monitor found".to_string()))?;
    let image = primary
        .capture_image()
        .map_err(|e| CommandError(format!("Failed to capture screen: {e}")))?;
    let cropped = image.crop_imm(
        x.max(0) as u32,
        y.max(0) as u32,
        w.max(1) as u32,
        h.max(1) as u32,
    );
    let mut buf = std::io::Cursor::new(Vec::new());
    cropped
        .write_to(&mut buf, image::ImageFormat::Jpeg)
        .map_err(|e| CommandError(format!("Failed to encode JPEG: {e}")))?;
    Ok(base64::engine::general_purpose::STANDARD.encode(buf.into_inner()))
}
```

- [ ] **Step 3: Register command in invoke_handler**

In the `invoke_handler` macro call (around line 266), add `capture_screen` to the handler list after `load_vision_config`:

```rust
.invoke_handler(tauri::generate_handler![
    greet,
    get_models,
    generate_exam,
    answer_question,
    judge_answer,
    extract_question_text,
    parse_file_text,
    parse_file_bytes,
    export_csv,
    export_xlsx,
    export_xlsx_data,
    save_to_downloads,
    save_config,
    load_config,
    save_vision_config,
    load_vision_config,
    capture_screen,
])
```

- [ ] **Step 4: Build verify**

```bash
cargo build -p exameow
```

Expected: compile succeeds with no errors.

- [ ] **Step 5: Commit**

```bash
git add src-tauri/Cargo.toml src-tauri/src/lib.rs
git commit -m "feat: add xcap screen capture Tauri command"
```

---

### Task 2: Tauri — multi-window configuration

**Files:**
- Modify: `src-tauri/tauri.conf.json`
- Modify: `src-tauri/capabilities/default.json`

**Interfaces:**
- Produces: registered window labels `record-overlay` and `answer-float` usable by `WebviewWindow` JS API.

- [ ] **Step 1: Add child windows to tauri.conf.json**

In `src-tauri/tauri.conf.json`, in `app.windows` array, add two entries after the `main` window object:

```json
{
  "label": "record-overlay",
  "title": "Recording Area",
  "width": 700,
  "height": 300,
  "x": 162,
  "y": 100,
  "decorations": false,
  "transparent": true,
  "alwaysOnTop": true,
  "resizable": false,
  "visible": false,
  "url": "/src-windows/record-overlay",
  "create": false
},
{
  "label": "answer-float",
  "title": "Answer",
  "width": 320,
  "height": 280,
  "decorations": false,
  "alwaysOnTop": true,
  "resizable": true,
  "visible": false,
  "url": "/src-windows/answer-float",
  "create": false
}
```

The `url` fields point to hash-routed paths. The `create: false` means windows are created programmatically from frontend.

- [ ] **Step 2: Add window labels to capabilities**

In `src-tauri/capabilities/default.json`, in the `windows` array, add the new labels:

```json
"windows": ["main", "record-overlay", "answer-float"]
```

- [ ] **Step 3: Commit**

```bash
git add src-tauri/tauri.conf.json src-tauri/capabilities/default.json
git commit -m "feat: configure Tauri multi-window for screen recording"
```

---

### Task 3: Frontend API layer — captureScreen

**Files:**
- Modify: `frontend/src/api/bridge.ts`
- Modify: `frontend/src/api/index.ts`

**Interfaces:**
- Produces: `api.captureScreen(x: number, y: number, w: number, h: number) => Promise<string>` (base64 JPEG)
- Tauri-only: non-Tauri platforms throw "not supported".

- [ ] **Step 1: Add captureScreen to bridge.ts**

In `frontend/src/api/bridge.ts`, add at the end of the `tauriApi` object (after line 126, before the closing `}`):

```typescript
  async captureScreen(x: number, y: number, w: number, h: number): Promise<string> {
    return invoke<string>('capture_screen', { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) })
  },
```

- [ ] **Step 2: Add captureScreen to api/index.ts**

In `frontend/src/api/index.ts`, add at the end of the `api` object (before the closing `};` on line 179):

```typescript
  async captureScreen(x: number, y: number, w: number, h: number): Promise<string> {
    if (!isTauri()) {
      throw new Error('Screen capture is only available in the desktop/mobile app')
    }
    return tauriApi.captureScreen(x, y, w, h)
  },
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/api/bridge.ts frontend/src/api/index.ts
git commit -m "feat: add captureScreen to API layer"
```

---

### Task 4: i18n — new locale strings

**Files:**
- Modify: `frontend/src/i18n/locales.ts`

**Interfaces:**
- Produces: locale keys available to all components via `i18n.t()`.

- [ ] **Step 1: Add type definitions**

In `frontend/src/i18n/locales.ts`, in the `LocaleMessages` interface (after line 225, `searchModeScreenRecordDesc`), add:

```typescript
  searchScreenRecordStart: string
  searchScreenRecordStop: string
  searchScreenRecordNotSupported: string
  searchScreenRecordDesc: string
  searchScreenRecordAnswer: string
  searchScreenRecordNoMatch: string
  searchScreenRecordLoading: string
  searchScreenRecordCollapse: string
  searchScreenRecordAdjust: string
  searchScreenRecordExit: string
  searchScreenRecordRefresh: string
```

- [ ] **Step 2: Add Chinese translations**

In the `zh` object (after line 491, `searchModeScreenRecordDesc`), add:

```typescript
  searchScreenRecordStart: '开始录制',
  searchScreenRecordStop: '停止录制',
  searchScreenRecordNotSupported: '录屏搜题仅支持桌面端和移动端应用',
  searchScreenRecordDesc: '启动后，调整录制框覆盖题目区域，AI 将实时识别并搜索本地题库',
  searchScreenRecordAnswer: '答案',
  searchScreenRecordNoMatch: '未匹配到题目',
  searchScreenRecordLoading: '模型加载中…',
  searchScreenRecordCollapse: '收起',
  searchScreenRecordAdjust: '调整录制区域',
  searchScreenRecordExit: '退出录屏',
  searchScreenRecordRefresh: '下拉或双击刷新',
```

- [ ] **Step 3: Add English translations**

In the `en` object (after line 756, `searchModeScreenRecordDesc`), add:

```typescript
  searchScreenRecordStart: 'Start Recording',
  searchScreenRecordStop: 'Stop Recording',
  searchScreenRecordNotSupported: 'Screen recording search is only available in the desktop and mobile app',
  searchScreenRecordDesc: 'After starting, adjust the recording frame over the question area for real-time AI recognition',
  searchScreenRecordAnswer: 'Answer',
  searchScreenRecordNoMatch: 'No matching question found',
  searchScreenRecordLoading: 'Loading model…',
  searchScreenRecordCollapse: 'Collapse',
  searchScreenRecordAdjust: 'Adjust area',
  searchScreenRecordExit: 'Exit recording',
  searchScreenRecordRefresh: 'Pull down or double-tap to refresh',
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/i18n/locales.ts
git commit -m "feat: add screen recording locale strings"
```

---

### Task 5: Router + SearchHomeView — enable screenRecord

**Files:**
- Modify: `frontend/src/router/index.ts`
- Modify: `frontend/src/views/SearchHomeView.vue`

**Interfaces:**
- Produces: `/search/screen-record` route → `ScreenRecordView.vue`
- `SearchHomeView.vue` `screenRecord` card now clickable

- [ ] **Step 1: Add route**

In `frontend/src/router/index.ts`, after the `/search/photo` route (line 38), add:

```typescript
    {
      path: '/search/screen-record',
      name: 'search-screen-record',
      component: () => import('@/views/ScreenRecordView.vue'),
      meta: { title: 'Screen Record Search' },
    },
```

- [ ] **Step 2: Enable screenRecord card**

In `frontend/src/views/SearchHomeView.vue`, change the `screenRecord` mode entry (line 20):

Change:
```typescript
{ key: 'screenRecord', titleKey: 'searchModeScreenRecord', descKey: 'searchModeScreenRecordDesc', icon: ComputerDesktopIcon, available: false, supported: isDesktopTauri() || isTauriMobile, path: '' },
```

To:
```typescript
{ key: 'screenRecord', titleKey: 'searchModeScreenRecord', descKey: 'searchModeScreenRecordDesc', icon: ComputerDesktopIcon, available: true, supported: isDesktopTauri() || isTauriMobile, path: '/search/screen-record' },
```

- [ ] **Step 3: Verify**

```bash
cd frontend && pnpm run type-check
```

Expected: no type errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/router/index.ts frontend/src/views/SearchHomeView.vue
git commit -m "feat: enable screenRecord search mode and route"
```

---

### Task 6: Store — screenRecord.ts

**Files:**
- Create: `frontend/src/stores/screenRecord.ts`

**Interfaces:**
- Produces: Pinia store `useScreenRecordStore`
  - `status: 'idle' | 'recording' | 'paused'`
  - `region: { x: number, y: number, w: number, h: number }`
  - `currentResult: { question: Question, bankName: string, score: number } | null`
  - `ocrText: string`
  - `lastCaptureHash: string`
  - `overlayVisible: boolean`
  - Methods: `startRecording()`, `stopRecording()`, `setRegion()`, `setResult()`, `toggleOverlay()`, `collapseFloat()`

- [ ] **Step 1: Create screenRecord store**

Create `frontend/src/stores/screenRecord.ts`:

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/stores/screenRecord.ts
git commit -m "feat: add screenRecord Pinia store"
```

---

### Task 7: ScreenRecordView.vue — start page

**Files:**
- Create: `frontend/src/views/ScreenRecordView.vue`

**Interfaces:**
- Consumes: `useScreenRecordStore`, `useScreenRecord` composable, `useI18nStore`
- Produces: Full-page view with start/stop UI for screen recording

- [ ] **Step 1: Create ScreenRecordView.vue**

Create `frontend/src/views/ScreenRecordView.vue`:

```vue
<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useI18nStore } from '@/stores/i18n'
import { useScreenRecordStore } from '@/stores/screenRecord'
import { isDesktopTauri, isMobileDevice, isTauri } from '@/utils/platform'
import { VideoCameraIcon, ArrowLeftIcon } from '@heroicons/vue/24/outline'

const router = useRouter()
const i18n = useI18nStore()
const store = useScreenRecordStore()

const isTauriMobile = isTauri() && isMobileDevice()
const supported = isDesktopTauri() || isTauriMobile

async function startRecording() {
  store.startRecording()
  const { useScreenRecord } = await import('@/composables/useScreenRecord')
  const { start, stop } = useScreenRecord()
  await start()
}

function goBack() {
  router.push('/search')
}
</script>

<template>
  <div>
    <button
      class="card-filled w-fit px-4 py-2 flex items-center gap-2 mb-5 transition-all duration-200 cursor-pointer hover:shadow-md"
      style="color: rgb(var(--md-on-surface-variant))"
      @click="goBack"
    >
      <ArrowLeftIcon class="w-5 h-5" />
      <span class="text-body-md">{{ i18n.t('btnBack') }}</span>
    </button>

    <div v-if="!supported" class="card-filled p-6 text-center">
      <VideoCameraIcon class="w-12 h-12 mx-auto mb-3" style="color: rgb(var(--md-on-surface-variant))" />
      <p class="text-title-md mb-2">{{ i18n.t('searchModeScreenRecord') }}</p>
      <p class="text-body-md" style="color: rgb(var(--md-on-surface-variant))">
        {{ i18n.t('searchScreenRecordNotSupported') }}
      </p>
    </div>

    <template v-else>
      <h1 class="text-display-sm mb-1">{{ i18n.t('searchModeScreenRecord') }}</h1>
      <p class="text-body-lg mb-6" style="color: rgb(var(--md-on-surface-variant))">
        {{ i18n.t('searchScreenRecordDesc') }}
      </p>

      <div class="card-filled p-6 flex flex-col items-center gap-4">
        <VideoCameraIcon class="w-16 h-16" style="color: rgb(var(--md-primary))" />
        <button
          class="px-8 py-3 rounded-full text-title-md font-medium transition-all duration-200 cursor-pointer"
          :style="{
            backgroundColor: 'rgb(var(--md-primary))',
            color: 'rgb(var(--md-on-primary))',
          }"
          @click="startRecording"
        >
          {{ i18n.t('searchScreenRecordStart') }}
        </button>
        <p class="text-body-sm" style="color: rgb(var(--md-on-surface-variant))">
          {{ i18n.t('searchScreenRecordRefresh') }}
        </p>
      </div>
    </template>
  </div>
</template>
```

- [ ] **Step 2: Verify**

```bash
cd frontend && pnpm run type-check
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/views/ScreenRecordView.vue
git commit -m "feat: add ScreenRecordView start page"
```

---

### Task 8: useScreenRecord.ts — core composable

**Files:**
- Create: `frontend/src/composables/useScreenRecord.ts`

**Interfaces:**
- Consumes: `useScreenRecordStore`, `api.captureScreen`, `recognizeImage` (ocr.ts), `searchQuestions` (questionSearch.ts), Tauri window/event APIs
- Produces: `useScreenRecord()` → `{ start(), stop(), refresh() }`

- [ ] **Step 1: Create useScreenRecord.ts**

Create `frontend/src/composables/useScreenRecord.ts`:

```typescript
import { useScreenRecordStore } from '@/stores/screenRecord'
import { api } from '@/api'
import { recognizeImage } from '@/utils/ocr'
import { searchQuestions } from '@/utils/questionSearch'
import { usePracticeStore } from '@/stores/practice'

type TimerHandle = ReturnType<typeof setInterval> | null

let timer: TimerHandle = null
let captureBusy = false

function computeThumbHash(base64: string): string {
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
        hash += String.fromCharCode(data[i] + data[i + 1] + data[i + 2])
      }
      resolve(hash)
    }
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
      const best = hits[0]
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

    const rw = Math.round(screenWidth * 0.6)
    const rh = Math.round(screenHeight * 0.4)
    const rx = Math.round((screenWidth - rw) / 2)
    const ry = Math.round(screenHeight * 0.08)

    store.setRegion({ x: rx, y: ry, w: rw, h: rh })

    const recordWin = new WebviewWindow('record-overlay', {
      url: '/#/src-windows/record-overlay',
      x: rx,
      y: ry,
      width: rw,
      height: rh,
      decorations: false,
      transparent: true,
      alwaysOnTop: true,
      resizable: false,
      visible: true,
    })

    const floatW = 320
    const floatH = 280
    const floatX = screenWidth - floatW - 20
    const floatY = screenHeight - floatH - 40

    const floatWin = new WebviewWindow('answer-float', {
      url: '/#/src-windows/answer-float',
      x: floatX,
      y: floatY,
      width: floatW,
      height: floatH,
      decorations: false,
      alwaysOnTop: true,
      resizable: true,
      visible: true,
    })

    await Promise.all([recordWin, floatWin])

    const mainWin = getCurrentWindow()
    await mainWin.minimize()
  }

  async function stop() {
    stopTimer()
    store.stopRecording()
    const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow')
    const { getCurrentWindow } = await import('@tauri-apps/api/window')

    try {
      const recordWin = WebviewWindow.getByLabel('record-overlay')
      if (recordWin) await recordWin.close()
    } catch { /* ignore */ }

    try {
      const floatWin = WebviewWindow.getByLabel('answer-float')
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
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/composables/useScreenRecord.ts
git commit -m "feat: add useScreenRecord composable"
```

---

### Task 9: RecordOverlay.vue — transparent recording overlay window

**Files:**
- Create: `frontend/src/components/search/RecordOverlay.vue`

**Interfaces:**
- Produces: Self-contained component for the `record-overlay` Tauri window rendered at `/src-windows/record-overlay`

- [ ] **Step 1: Create RecordOverlay.vue**

Create `frontend/src/components/search/RecordOverlay.vue`:

```vue
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useScreenRecordStore } from '@/stores/screenRecord'

const store = useScreenRecordStore()
const visible = ref(true)

onMounted(async () => {
  const { listen } = await import('@tauri-apps/api/event')
  const { getCurrentWindow } = await import('@tauri-apps/api/window')

  await listen('screen-record:overlay-toggle', () => {
    store.toggleOverlay()
  })

  const unlisten = await listen('screen-record:overlay-visibility', (event: any) => {
    visible.value = event.payload.visible
  })

  const win = getCurrentWindow()
  win.onResized(() => {
    // No-op: keep transparent size
  })
})
</script>

<template>
  <div
    v-if="visible"
    class="w-full h-full rounded-lg border-2 pointer-events-none"
    style="border-color: rgb(var(--md-primary)); background: rgba(var(--md-primary), 0.08);"
  >
  </div>
  <div v-else class="w-full h-full" />
</template>
```

- [ ] **Step 2: Add record-overlay window route to router**

Since the child windows need their own routes in the SPA, add the record-overlay route to the router. (The answer-float route will be added in Task 10 when its component is created.)

- [ ] **Step 3: Add record-overlay route to router**

In `frontend/src/router/index.ts`, after the `/search/screen-record` route, add:

```typescript
    {
      path: '/src-windows/record-overlay',
      component: () => import('@/components/search/RecordOverlay.vue'),
    },
```

- [ ] **Step 4: Verify**

```bash
cd frontend && pnpm run type-check
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/search/RecordOverlay.vue frontend/src/router/index.ts
git commit -m "feat: add RecordOverlay component and window routes"
```

---

### Task 10: AnswerFloat.vue — answer floating panel

**Files:**
- Create: `frontend/src/components/search/AnswerFloat.vue`

**Interfaces:**
- Consumes: `useScreenRecordStore`
- Produces: Self-contained component for the `answer-float` Tauri window

- [ ] **Step 1: Add answer-float window route to router**

In `frontend/src/router/index.ts`, after the `/src-windows/record-overlay` route (added in Task 9), add:

```typescript
    {
      path: '/src-windows/answer-float',
      component: () => import('@/components/search/AnswerFloat.vue'),
    },
```

- [ ] **Step 2: Create AnswerFloat.vue**

Create `frontend/src/components/search/AnswerFloat.vue`:

```vue
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useScreenRecordStore } from '@/stores/screenRecord'
import { useI18nStore } from '@/stores/i18n'
import {
  ChevronUpDownIcon,
  ArrowsPointingInIcon,
  XMarkIcon,
} from '@heroicons/vue/24/outline'

const store = useScreenRecordStore()
const i18n = useI18nStore()

let refreshFn: (() => void) | null = null

onMounted(async () => {
  const { listen } = await import('@tauri-apps/api/event')
  const { getCurrentWindow } = await import('@tauri-apps/api/window')

  const win = getCurrentWindow()
  win.startDragging()

  const { useScreenRecord } = await import('@/composables/useScreenRecord')
  const { refresh } = useScreenRecord()
  refreshFn = refresh
})

async function handleCollapse() {
  store.setCollapsed(!store.collapsed)
  const { getCurrentWindow } = await import('@tauri-apps/api/window')
  const win = getCurrentWindow()
  if (store.collapsed) {
    const screenWidth = window.screen.width
    await win.setPosition({ x: screenWidth - 40, y: 200 })
    await win.setSize({ width: 36, height: 80 })
  } else {
    const screenWidth = window.screen.width
    await win.setPosition({ x: screenWidth - 340, y: 200 })
    await win.setSize({ width: 320, height: 280 })
  }
}

async function handleAdjust() {
  store.toggleOverlay()
  const { emit } = await import('@tauri-apps/api/event')
  await emit('screen-record:overlay-toggle')
}

async function handleExit() {
  const { useScreenRecord } = await import('@/composables/useScreenRecord')
  const { stop } = useScreenRecord()
  await stop()
}

async function handleDoubleTap() {
  if (refreshFn) await refreshFn()
}
</script>

<template>
  <div
    class="h-full flex flex-col select-none"
    style="background: rgb(var(--md-surface)); border-radius: 16px; overflow: hidden; box-shadow: 0 8px 32px rgba(0,0,0,0.18);"
  >
    <div
      v-if="store.collapsed"
      class="flex-1 flex flex-col items-center justify-center gap-1 cursor-pointer"
      @click="handleCollapse"
    >
      <ChevronUpDownIcon class="w-5 h-5" style="color: rgb(var(--md-on-surface-variant))" />
      <span class="text-[10px]" style="color: rgb(var(--md-on-surface-variant))">搜题</span>
    </div>

    <template v-else>
      <div
        class="flex items-center justify-between px-4 py-2 shrink-0 cursor-grab active:cursor-grabbing"
        style="background: rgb(var(--md-surface-container-low)); border-bottom: 1px solid rgb(var(--md-outline-variant));"
        @dblclick="handleDoubleTap"
      >
        <span class="text-label-md font-medium" style="color: rgb(var(--md-on-surface))">
          {{ i18n.t('searchModeScreenRecord') }}
        </span>
        <div class="flex items-center gap-1">
          <button
            class="w-7 h-7 rounded-full flex items-center justify-center cursor-pointer"
            style="color: rgb(var(--md-on-surface-variant))"
            @click="handleCollapse"
            :title="i18n.t('searchScreenRecordCollapse')"
          >
            <ArrowsPointingInIcon class="w-4 h-4" />
          </button>
          <button
            class="w-7 h-7 rounded-full flex items-center justify-center cursor-pointer"
            style="color: rgb(var(--md-on-surface-variant))"
            @click="handleAdjust"
            :title="i18n.t('searchScreenRecordAdjust')"
          >
            <ChevronUpDownIcon class="w-4 h-4" />
          </button>
          <button
            class="w-7 h-7 rounded-full flex items-center justify-center cursor-pointer"
            style="color: rgb(var(--md-error))"
            @click="handleExit"
            :title="i18n.t('searchScreenRecordExit')"
          >
            <XMarkIcon class="w-4 h-4" />
          </button>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto px-4 py-3" @dblclick="handleDoubleTap">
        <div v-if="store.currentResult" class="space-y-2">
          <div
            class="text-title-sm font-bold px-2 py-1 rounded-lg inline-block"
            :style="{
              backgroundColor: 'rgb(var(--md-primary-container))',
              color: 'rgb(var(--md-on-primary-container))',
            }"
          >
            {{ i18n.t('searchScreenRecordAnswer') }}: {{ store.currentResult.question.answer }}
          </div>

          <p
            class="text-body-sm line-clamp-2"
            style="color: rgb(var(--md-on-surface))"
          >
            {{ store.currentResult.question.stem }}
          </p>

          <div
            v-if="store.currentResult.question.options?.length"
            class="grid gap-1 text-body-xs"
            style="color: rgb(var(--md-on-surface-variant))"
          >
            <span
              v-for="(opt, idx) in store.currentResult.question.options"
              :key="idx"
              :class="{
                'font-bold': store.currentResult.question.type !== 'short_answer'
                  && String.fromCharCode(65 + idx) === store.currentResult.question.answer?.trim().toUpperCase(),
              }"
              :style="
                store.currentResult.question.type !== 'short_answer'
                && String.fromCharCode(65 + idx) === store.currentResult.question.answer?.trim().toUpperCase()
                  ? { color: 'rgb(var(--md-primary))' }
                  : {}
              "
            >
              {{ String.fromCharCode(65 + idx) }}. {{ opt }}
            </span>
          </div>

          <p class="text-[10px]" style="color: rgb(var(--md-on-surface-variant))">
            {{ store.currentResult.bankName }}
          </p>
        </div>

        <div v-else class="flex items-center justify-center h-full">
          <p class="text-body-sm" style="color: rgb(var(--md-on-surface-variant))">
            {{ i18n.t('searchScreenRecordNoMatch') }}
          </p>
        </div>
      </div>
    </template>
  </div>
</template>
```

- [ ] **Step 3: Verify**

```bash
cd frontend && pnpm run type-check
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/search/AnswerFloat.vue frontend/src/router/index.ts
git commit -m "feat: add AnswerFloat floating panel"
```

---

### Task 11: Integration — wire events and build verify

**Files:**
- Modify: `frontend/src/components/search/RecordOverlay.vue` (ensure event listener matches)
- Modify: `frontend/src/composables/useScreenRecord.ts` (ensure emit names match)

**Verification:** Ensure all pieces connect. The event names must match across the composable and child windows.

- [ ] **Step 1: Verify event name consistency**

Check in `useScreenRecord.ts`: `emit('screen-record:overlay-toggle')` 
Check in `RecordOverlay.vue`: `listen('screen-record:overlay-toggle')`
Match confirmed.

Check in `useScreenRecord.ts` the AnswerFloat gets store updates reactively (via Pinia) — no events needed since Pinia is shared across windows in the same Tauri app.

- [ ] **Step 2: Full type check**

```bash
cd frontend && pnpm run type-check
```

Expected: no errors.

- [ ] **Step 3: Rust build**

```bash
cargo build -p exameow
```

Expected: compile succeeds.

- [ ] **Step 4: Commit**

```bash
git add -A && git diff --cached --stat
```

Review and commit any remaining changes.

```bash
git commit -m "feat: wire screen recording event communication"
```

---

### Task 12: Smoke test (manual)

**No test suite exists.** Manual verification steps:

- [ ] **Step 1: Prerequisites**
  - Tauri dev environment running (`pnpm tauri dev`)
  - At least one question bank loaded in Practice
  - AI config configured

- [ ] **Step 2: Navigate**
  - Go to `/search` → "录屏搜题" card should be clickable (no "即将推出" badge)
  - Click → `/search/screen-record` → "开始录制" button visible

- [ ] **Step 3: Start recording**
  - Click "开始录制"
  - Main window minimizes
  - Recording overlay appears (transparent bordered area in upper-mid screen)
  - Answer float appears (bottom-right)

- [ ] **Step 4: Test recognition**
  - Open a document with a question from the bank visible inside the recording overlay area
  - After ~1.5s, answer float should show matched question

- [ ] **Step 5: Test float buttons**
  - Click "收起" → float shrinks to edge tag
  - Click tag → float expands
  - Click "调整" → recording overlay toggles visibility
  - Click "退出" → both windows close, main window restores

- [ ] **Step 6: Test manual refresh**
  - Double-tap answer area → triggers re-OCR

- [ ] **Step 7: Test no match**
  - Move to area with text that doesn't match any bank question
  - Float shows "未匹配到题目"

- [ ] **Step 8: Test unsupported platform**
  - Open in browser (non-Tauri) → shows "该平台不支持"
