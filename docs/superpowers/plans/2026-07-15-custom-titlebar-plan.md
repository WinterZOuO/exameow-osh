# Custom TitleBar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dedicated 38px desktop titlebar (drag + double-click maximize + window controls / traffic-light space), fix missing Tauri window permissions, and remove the circular frame from logo.png.

**Architecture:** New `TitleBar.vue` rendered above the page header only in Tauri desktop. Window drag/maximize uses the official Tauri pattern (single `mousedown`, `e.detail === 2` â†?toggleMaximize, else startDragging). `capabilities/default.json` gains the `core:window:*` permissions that all window APIs need. AppShell loses its drag handlers, macOS padding hack, and absolutely-positioned WindowControls.

**Tech Stack:** Vue 3 + TypeScript + Tailwind, Tauri v2 (`@tauri-apps/api/window`), PowerShell System.Drawing (one-off image crop).

**Spec:** `docs/superpowers/specs/2026-07-15-custom-titlebar-design.md`

## Global Constraints

- Node `^22.18.0 || >=24.12.0`, pnpm 9, Vite dev port **5273** (5173 is in a Windows reserved port range â€?do not change back)
- No new npm or cargo dependencies
- Frontend has **no unit-test framework** â€?each task verifies via `pnpm --dir frontend type-check` plus manual checks; final task is a full manual QA pass
- Working dir: `D:\AI\ExamBot`
- All UI text through existing `i18n.t()` keys; no new i18n keys needed (`appName` already exists)

---

### Task 1: Grant window permissions in capabilities

**Files:**
- Modify: `src-tauri/capabilities/default.json`

**Interfaces:**
- Produces: IPC permissions consumed by `getCurrentWindow().startDragging() / toggleMaximize() / minimize() / close() / isMaximized()` used in Tasks 3-4. Without this, every window API call fails silently.

- [ ] **Step 1: Add the five `core:window` permissions**

Replace the full file content with:

```json
{
  "identifier": "default",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "core:window:allow-start-dragging",
    "core:window:allow-toggle-maximize",
    "core:window:allow-minimize",
    "core:window:allow-close",
    "core:window:allow-is-maximized",
    "dialog:default",
    "dialog:allow-open",
    "dialog:allow-save",
    "fs:default",
    "fs:allow-read-text-file",
    "fs:allow-read-file",
    "fs:allow-write-text-file",
    "opener:default",
    "opener:allow-open-path",
    "sharekit:default"
  ]
}
```

- [ ] **Step 2: Verify JSON is valid**

Run: `node -e "JSON.parse(require('fs').readFileSync('src-tauri/capabilities/default.json','utf8')); console.log('OK')"`
Expected: `OK`

(Full validation happens when `tauri dev` regenerates permissions in Task 5 â€?invalid permission identifiers make the Rust build fail with a clear error.)

- [ ] **Step 3: Commit**

```bash
git add src-tauri/capabilities/default.json
git commit -m "fix: grant core:window permissions for drag/maximize/minimize/close"
```

---

### Task 2: Remove circular frame from logo.png

**Files:**
- Modify: `frontend/public/logo.png` (binary, regenerated)

**Interfaces:**
- Produces: `logo.png` as a full-bleed white square with the blue glyph centered â€?CSS `rounded-md`/`rounded-xl` then renders it as a rounded square. Consumed by Task 3 (TitleBar) and the existing header `<img>`.

Background: current 512Ã—512 image is a white circle (diameter â‰?60px, transparent corners) with the blue glyph at x132-380, y120-390. Cropping the centered 320Ã—320 region (96..416) stays fully inside the circle and fully contains the glyph.

- [ ] **Step 1: Crop and upscale with System.Drawing (PowerShell)**

```powershell
Add-Type -AssemblyName System.Drawing
$src = [System.Drawing.Bitmap]::new('D:\AI\ExamBot\frontend\public\logo.png')
$dst = [System.Drawing.Bitmap]::new(512, 512)
$g = [System.Drawing.Graphics]::FromImage($dst)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.DrawImage($src, [System.Drawing.Rectangle]::new(0,0,512,512), [System.Drawing.Rectangle]::new(96,96,320,320), [System.Drawing.GraphicsUnit]::Pixel)
$g.Dispose(); $src.Dispose()
$dst.Save('D:\AI\ExamBot\frontend\public\logo-new.png', [System.Drawing.Imaging.ImageFormat]::Png)
$dst.Dispose()
Move-Item -Force 'D:\AI\ExamBot\frontend\public\logo-new.png' 'D:\AI\ExamBot\frontend\public\logo.png'
```

- [ ] **Step 2: Verify corners are now opaque white**

```powershell
Add-Type -AssemblyName System.Drawing
$bmp = [System.Drawing.Bitmap]::new('D:\AI\ExamBot\frontend\public\logo.png')
"size: $($bmp.Width)x$($bmp.Height)"
foreach ($p in @(@(2,2), @(509,2), @(2,509), @(509,509), @(256,256))) {
  $px = $bmp.GetPixel($p[0], $p[1]); "($($p[0]),$($p[1])): A=$($px.A) R=$($px.R) G=$($px.G) B=$($px.B)"
}
$bmp.Dispose()
```

Expected: `size: 512x512`; all four corners `A=255 R=255 G=255 B=255` (opaque white, no transparency); center white.

- [ ] **Step 3: Commit**

```bash
git add frontend/public/logo.png
git commit -m "fix: crop circular frame out of logo, keep rounded-square glyph"
```

---

### Task 3: Create TitleBar.vue

**Files:**
- Create: `frontend/src/components/layout/TitleBar.vue`

**Interfaces:**
- Consumes: `isTauri/isMacOS/isWindows/isLinux` from `@/utils/platform`; `useI18nStore` from `@/stores/i18n`; `WindowControls.vue` (unchanged â€?its root div accepts a class from the parent, its buttons are `height: 100%`); permissions from Task 1.
- Produces: `<TitleBar />` component (no props, no emits) consumed by Task 4.

- [ ] **Step 1: Create the component**

Full content of `frontend/src/components/layout/TitleBar.vue`:

```vue
<script setup lang="ts">
import { getCurrentWindow } from '@tauri-apps/api/window'
import { isTauri, isMacOS, isWindows, isLinux } from '@/utils/platform'
import { useI18nStore } from '@/stores/i18n'
import WindowControls from './WindowControls.vue'

const i18n = useI18nStore()
const isMac = isMacOS()
const showControls = isTauri() && (isWindows() || isLinux())

function onMouseDown(e: MouseEvent) {
  if (!isTauri()) return
  if (e.buttons !== 1) return
  const target = e.target as HTMLElement
  if (target.closest('button, a, input, select')) return
  const win = getCurrentWindow()
  if (e.detail === 2) {
    win.toggleMaximize()
  } else {
    win.startDragging()
  }
}
</script>

<template>
  <div
    class="sticky top-0 z-40 h-[38px] flex items-center select-none shrink-0"
    :class="isMac ? 'pl-[80px]' : 'pl-3'"
    :style="{ backgroundColor: 'rgb(var(--md-surface))' }"
    @mousedown="onMouseDown"
  >
    <router-link to="/practice" class="flex items-center gap-2 no-underline">
      <img src="/logo.png" alt="ExamBot" class="w-5 h-5 rounded-md shrink-0" />
      <span class="text-xs font-medium" :style="{ color: 'rgb(var(--md-on-surface-variant))' }">
        {{ i18n.t('appName') }}
      </span>
    </router-link>
    <div class="flex-1 h-full" />
    <WindowControls v-if="showControls" class="h-full" />
  </div>
</template>
```

Notes for the implementer:
- Single `mousedown` handler on purpose: on Windows, `startDragging()` enters a modal loop that swallows the second click, so a separate `dblclick` listener never fires reliably. `e.detail === 2` on `mousedown` is the officially documented Tauri pattern.
- `closest('button, a, input, select')` keeps the logo link and window buttons clickable without starting a drag.
- macOS gets `pl-[80px]` for the native traffic lights (`TitleBarStyle::Overlay` in `src-tauri/src/lib.rs:162`) and renders no `WindowControls`.

- [ ] **Step 2: Type-check**

Run: `pnpm --dir frontend type-check`
Expected: exit 0, no errors. (Component not yet mounted anywhere â€?that's Task 4.)

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/layout/TitleBar.vue
git commit -m "feat: add dedicated desktop TitleBar with drag and double-click maximize"
```

---

### Task 4: Integrate TitleBar into AppShell, strip old window chrome

**Files:**
- Modify: `frontend/src/components/layout/AppShell.vue`

**Interfaces:**
- Consumes: `<TitleBar />` from Task 3.
- Produces: final AppShell layout â€?TitleBar (desktop Tauri only) above the header; header sticky offset `top-[38px]` on desktop Tauri; logo hidden in header on desktop Tauri (it lives in TitleBar); all drag handlers, macOS padding hack, and WindowControls removed from the header.

- [ ] **Step 1: Rewrite the script block**

Replace lines 1-60 of `frontend/src/components/layout/AppShell.vue` (the whole `<script setup>`) with:

```vue
<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18nStore } from '@/stores/i18n'
import { isTauri, isMacOS, isWindows, isLinux } from '@/utils/platform'
import TitleBar from './TitleBar.vue'
import {
  Cog6ToothIcon,
  SparklesIcon,
  SunIcon,
  MoonIcon,
  AcademicCapIcon,
} from '@heroicons/vue/24/outline'

const router = useRouter()
const route = useRoute()
const i18n = useI18nStore()

const isDark = ref(false)
const isDesktopTauri = isTauri() && (isWindows() || isMacOS() || isLinux())

function applyDark() {
  document.documentElement.classList.toggle('dark', isDark.value)
  localStorage.setItem('exambot-dark', isDark.value ? '1' : '0')
}

watch(isDark, applyDark, { immediate: true })

const saved = localStorage.getItem('exambot-dark')
if (saved === '1') isDark.value = true

const navItems = [
  { key: 'navPractice', path: '/practice', icon: AcademicCapIcon },
  { key: 'navGenerate', path: '/generate', icon: SparklesIcon },
  { key: 'navConfig', path: '/config', icon: Cog6ToothIcon },
]

const currentNavIndex = computed(() => navItems.findIndex(item => item.path === route.path))

const headerStyle = {
  backgroundColor: 'rgb(var(--md-surface))',
  borderBottom: '1px solid rgb(var(--md-outline-variant) / 0.4)',
} as any
</script>
```

Removed vs. current file: `getCurrentWindow` import, `WindowControls` import, `showWindowControls`, `isMacOSOverlay`, `handleHeaderMouseDown`, `handleHeaderDblClick`. Added: `TitleBar` import, `isDesktopTauri`.

- [ ] **Step 2: Rewrite the top of the template**

Replace the current template section from `<div class="min-h-screen flex flex-col" ...>` through `</header>` (lines 63-127) with:

```vue
  <div class="min-h-screen flex flex-col" :style="{ backgroundColor: 'rgb(var(--md-surface))' }">
    <!-- ====== Desktop TitleBar (Tauri only) ====== -->
    <TitleBar v-if="isDesktopTauri" />

    <!-- ====== Top App Bar ====== -->
    <header
      class="sticky z-30 select-none"
      :class="isDesktopTauri ? 'top-[38px]' : 'top-0 safe-top'"
      :style="headerStyle"
    >
      <div class="mx-auto w-full max-w-[90rem] flex items-center h-14 sm:h-16 gap-2 sm:gap-3 px-3 sm:px-6">
        <!-- Logo (browser / mobile only â€?desktop shows it in TitleBar) -->
        <router-link
          v-if="!isDesktopTauri"
          to="/practice"
          class="flex items-center gap-3 shrink-0 no-underline"
        >
          <img src="/logo.png" alt="ExamBot" class="w-[38px] h-[38px] rounded-xl shrink-0" />
          <div class="hidden sm:block">
            <div class="text-title-md leading-tight" style="color: rgb(var(--md-on-surface))">{{ i18n.t('appName') }}</div>
            <div class="text-label-sm" style="color: rgb(var(--md-on-surface-variant))">{{ i18n.t('appSubtitle') }}</div>
          </div>
        </router-link>

        <!-- Desktop Nav â€?Segmented-like pills -->
        <div class="hidden sm:flex items-center" :class="isDesktopTauri ? '' : 'ml-6'">
          <nav
            class="flex items-center p-1 rounded-full gap-0.5"
            style="background-color: rgb(var(--md-surface-container-high))"
          >
            <button
              v-for="item in navItems"
              :key="item.path"
              class="relative flex items-center gap-1.5 px-4 h-9 rounded-full text-sm font-medium transition-all duration-300 ease-out"
              :style="route.path === item.path
                ? { backgroundColor: 'rgb(var(--md-secondary-container))', color: 'rgb(var(--md-on-secondary-container))' }
                : { color: 'rgb(var(--md-on-surface-variant))' }"
              @click="router.push(item.path)"
            >
              <component :is="item.icon" class="w-4 h-4" />
              {{ i18n.t(item.key as any) }}
            </button>
          </nav>
        </div>

        <!-- Spacer -->
        <div class="flex-1 self-stretch cursor-default" />

        <!-- Actions -->
        <div class="flex items-center gap-1">
          <button
            class="btn-icon text-xs !font-bold"
            @click="i18n.toggle()"
            :style="{ color: 'rgb(var(--md-on-surface-variant))' }"
          >
            {{ i18n.locale === 'zh' ? 'ä¸? : 'En' }}
          </button>
          <button class="btn-icon" @click="isDark = !isDark">
            <SunIcon v-if="isDark" class="w-5 h-5" />
            <MoonIcon v-else class="w-5 h-5" />
          </button>
        </div>

      </div>
    </header>
```

Everything after `</header>` (`<main>`, mobile `<nav>`, closing `</div>`, `<style>`) stays exactly as-is.

Key diffs vs. current template: `<TitleBar v-if="isDesktopTauri" />` added; header lost `@mousedown`/`@dblclick`/`safe-top`(desktop)/`top-0`(now conditional); inner div always `px-3 sm:px-6` (macOS `pl-[80px]` hack gone); header logo wrapped in `v-if="!isDesktopTauri"`; nav `ml-6` now conditional; `<WindowControls .../>` line deleted.

- [ ] **Step 3: Type-check**

Run: `pnpm --dir frontend type-check`
Expected: exit 0. If it reports unused imports in AppShell, the script block from Step 1 wasn't applied fully.

- [ ] **Step 4: Quick browser-mode smoke check**

Run: `pnpm --dir frontend dev` (background), then fetch `http://localhost:5273/` and confirm HTTP 200; open in a browser if available â€?header must look unchanged (logo visible, no titlebar). Stop the dev server afterwards.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/layout/AppShell.vue
git commit -m "fix: separate desktop titlebar from app header, remove overlap"
```

---

### Task 5: Full desktop verification (manual QA)

**Files:** none (verification only)

**Interfaces:**
- Consumes: everything from Tasks 1-4.

- [ ] **Step 1: Launch the desktop app**

Run: `start.bat` â†?choice `1` (or `pnpm tauri dev` with `frontend/node_modules/.bin` on PATH). First Rust compile may take minutes.
Expected: window opens with a 38px titlebar on top (logo + "ExamBot" left, minimize/maximize/close right), page header below it with nav pills â€?nothing overlapping.

- [ ] **Step 2: Manual checklist (user confirms)**

- [ ] Drag titlebar â†?window moves
- [ ] Double-click titlebar â†?maximizes; double-click again â†?restores
- [ ] Minimize / maximize / close buttons work
- [ ] Clicking logo in titlebar navigates, does not start a drag
- [ ] Maximize button icon toggles between the two SVG states (isMaximized listener works)
- [ ] Logo renders as rounded square, no circular frame (titlebar 20px + header views)
- [ ] Dark mode toggle: titlebar background follows theme

- [ ] **Step 3: Fix anything that fails, then final commit if changes were made**

Any fix goes through: reproduce â†?minimal change â†?re-run checklist item â†?commit with `fix:` message.

---

## Self-Review Notes

- Spec coverage: TitleBar component âœ?(Task 3), capabilities âœ?(Task 1), AppShell rework âœ?(Task 4), WindowControls "adapt height" resolved as no-op (root div takes parent class `h-full`, buttons already `height:100%`) â€?folded into Task 3 interface note, logo crop âœ?(Task 2), testing âœ?(Task 5, plus browser smoke in Task 4).
- No placeholders; all code blocks complete.
- Naming consistent: `isDesktopTauri`, `TitleBar.vue`, 38px everywhere (`h-[38px]` / `top-[38px]`).
