# UI Polish & Naming Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Four independent polish changes — iOS-style overlay scrollbars, a three-state (system/light/dark) theme, a download icon on the XLSX button, and removal of the third-party `kaoshibao` name from all code.

**Architecture:** Frontend-only for tasks 1-3 (CSS + Vue). Task 4 is a cross-cutting identifier rename spanning Rust (core/tauri/server) and frontend (api/views/utils/types), kept as one cohesive task so the Tauri invoke command name and HTTP route stay consistent on both sides.

**Tech Stack:** Vue 3 + TypeScript + Tailwind, Rust (calamine-based xlsx export already present), Heroicons.

**Spec:** `docs/superpowers/specs/2026-07-15-ui-polish-design.md`

## Global Constraints

- No new npm or cargo dependencies. Vite dev port stays 5273.
- Frontend has no unit-test framework — verify with `pnpm --dir frontend type-check` (exit 0). Rust verifies with `cargo test -p exambot-core` and `cargo build`.
- Working dir: `D:\AI\ExamBot`, branch `main`, shell PowerShell. Proxy if crates/npm stall: `$env:http_proxy="http://127.0.0.1:7892"; $env:https_proxy="http://127.0.0.1:7892"`.
- localStorage keys: new theme key is exactly `exambot-theme` with values `system|light|dark`; legacy key `exambot-dark` (`'1'`/`'0'`) is read once for migration, never written again.
- After Task 4, a case-insensitive grep for `kaoshibao` in `packages/`, `src-tauri/src/`, and `frontend/src/` must return zero hits (the `docs/` history is exempt).
- Commit after each task with the message given in the task.

---

### Task 1: iOS-style overlay scrollbars

**Files:**
- Modify: `frontend/src/assets/main.css` (append at end of file)

**Interfaces:** Pure CSS, global. No JS/TS impact.

- [ ] **Step 1: Append the scrollbar rules**

At the very end of `frontend/src/assets/main.css`, append:

```css

/* ===== iOS-style overlay scrollbars ===== */
* {
  scrollbar-width: thin;
  scrollbar-color: transparent transparent;
}
*:hover,
*:focus-within {
  scrollbar-color: rgb(var(--md-outline-variant) / 0.5) transparent;
}
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: transparent;
  border-radius: 3px;
}
*:hover::-webkit-scrollbar-thumb,
*:focus-within::-webkit-scrollbar-thumb {
  background: rgb(var(--md-outline-variant) / 0.5);
}
::-webkit-scrollbar-thumb:hover {
  background: rgb(var(--md-outline-variant) / 0.8);
}
```

- [ ] **Step 2: Type-check (sanity)**

Run: `pnpm --dir frontend type-check`
Expected: exit 0 (CSS-only change; this confirms nothing else broke).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/assets/main.css
git commit -m "feat: iOS-style thin overlay scrollbars"
```

---

### Task 2: Three-state theme (system / light / dark)

**Files:**
- Modify: `frontend/src/components/layout/AppShell.vue` (script block + theme toggle button)
- Modify: `frontend/index.html` (FOUC-prevention inline script)

**Interfaces:**
- Consumes: `.dark` class on `<html>` drives existing CSS var overrides in `main.css:74-113` (unchanged).
- Produces: `theme` state persisted under `exambot-theme`; `<html>.dark` reflects resolved theme.

- [ ] **Step 1: Rewrite the AppShell.vue script block**

Replace lines 1-30 of `frontend/src/components/layout/AppShell.vue` (imports through the `if (saved === '1')` line) with:

```vue
<script setup lang="ts">
import { ref, watch, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18nStore } from '@/stores/i18n'
import { isTauri, isMacOS, isWindows, isLinux } from '@/utils/platform'
import TitleBar from './TitleBar.vue'
import {
  Cog6ToothIcon,
  SparklesIcon,
  SunIcon,
  MoonIcon,
  ComputerDesktopIcon,
  AcademicCapIcon,
} from '@heroicons/vue/24/outline'

const router = useRouter()
const route = useRoute()
const i18n = useI18nStore()

type Theme = 'system' | 'light' | 'dark'
const THEME_KEY = 'exambot-theme'

function loadTheme(): Theme {
  const saved = localStorage.getItem(THEME_KEY)
  if (saved === 'system' || saved === 'light' || saved === 'dark') return saved
  const legacy = localStorage.getItem('exambot-dark')
  if (legacy === '1') return 'dark'
  if (legacy === '0') return 'light'
  return 'system'
}

const theme = ref<Theme>(loadTheme())
const media = window.matchMedia('(prefers-color-scheme: dark)')
const isDesktopTauri = isTauri() && (isWindows() || isMacOS() || isLinux())

function applyTheme() {
  const dark = theme.value === 'dark' || (theme.value === 'system' && media.matches)
  document.documentElement.classList.toggle('dark', dark)
  localStorage.setItem(THEME_KEY, theme.value)
}

function onMediaChange() {
  if (theme.value === 'system') applyTheme()
}

function cycleTheme() {
  theme.value = theme.value === 'system' ? 'light' : theme.value === 'light' ? 'dark' : 'system'
}

watch(theme, applyTheme, { immediate: true })
onMounted(() => media.addEventListener('change', onMediaChange))
onUnmounted(() => media.removeEventListener('change', onMediaChange))
</script>
```

Note: the old `isDesktopTauri` line is preserved (moved into this block). Removed: `isDark` ref, `applyDark`, its watch, and the legacy `saved` read.

- [ ] **Step 2: Replace the theme toggle button**

In `frontend/src/components/layout/AppShell.vue`, replace the button block (currently lines 104-107):

```vue
          <button class="btn-icon" @click="isDark = !isDark">
            <SunIcon v-if="isDark" class="w-5 h-5" />
            <MoonIcon v-else class="w-5 h-5" />
          </button>
```

with:

```vue
          <button class="btn-icon" @click="cycleTheme" :title="theme">
            <ComputerDesktopIcon v-if="theme === 'system'" class="w-5 h-5" />
            <SunIcon v-else-if="theme === 'light'" class="w-5 h-5" />
            <MoonIcon v-else class="w-5 h-5" />
          </button>
```

- [ ] **Step 3: Add the FOUC-prevention script to index.html**

In `frontend/index.html`, inside `<head>`, immediately after the `<link rel="icon" .../>` line (line 10), add:

```html
    <script>
      (function () {
        try {
          var t = localStorage.getItem('exambot-theme');
          if (t !== 'system' && t !== 'light' && t !== 'dark') {
            var legacy = localStorage.getItem('exambot-dark');
            t = legacy === '1' ? 'dark' : legacy === '0' ? 'light' : 'system';
          }
          var dark = t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
          if (dark) document.documentElement.classList.add('dark');
        } catch (e) {}
      })();
    </script>
```

- [ ] **Step 4: Type-check**

Run: `pnpm --dir frontend type-check`
Expected: exit 0. (Confirms `SunIcon`/`MoonIcon`/`ComputerDesktopIcon` are all used and imported; no dangling `isDark` references remain.)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/layout/AppShell.vue frontend/index.html
git commit -m "feat: three-state theme (system/light/dark) with system-follow and no FOUC"
```

---

### Task 3: XLSX button download icon

**Files:**
- Modify: `frontend/src/views/PreviewView.vue`
- Modify: `frontend/src/views/GenerateView.vue`

**Interfaces:** Icon swap only; `ArrowDownTrayIcon` is already imported in both files.

- [ ] **Step 1: PreviewView.vue**

In `frontend/src/views/PreviewView.vue`:
- On the XLSX export button (around line 132), change the icon component from `<TableCellsIcon class="w-4 h-4" />` to `<ArrowDownTrayIcon class="w-4 h-4" />`.
- In the import statement (line 9), remove `TableCellsIcon` from the `@heroicons/vue/24/outline` import list (leave `ArrowDownTrayIcon` and the others).

- [ ] **Step 2: GenerateView.vue**

In `frontend/src/views/GenerateView.vue`:
- On the XLSX export button (around line 188), change `<TableCellsIcon class="w-4 h-4" />` to `<ArrowDownTrayIcon class="w-4 h-4" />`.
- In the import statement (line 13), remove `TableCellsIcon` from the import list.

- [ ] **Step 3: Type-check**

Run: `pnpm --dir frontend type-check`
Expected: exit 0. (A leftover unused `TableCellsIcon` import would surface here only if `noUnusedLocals` is on; regardless, removing it is required by this task — confirm neither file still imports it.)

- [ ] **Step 4: Commit**

```bash
git add frontend/src/views/PreviewView.vue frontend/src/views/GenerateView.vue
git commit -m "feat: use download icon on XLSX export button"
```

---

### Task 4: Rename `kaoshibao` → generic `xlsx`

**Files (all listed edits are identifier renames — replace every occurrence in each file):**
- Rename: `packages/core/src/export/kaoshibao.rs` → `packages/core/src/export/xlsx.rs`
- Modify: `packages/core/src/export/mod.rs`, `packages/core/src/export/writer.rs`
- Modify: `src-tauri/src/lib.rs`
- Modify: `packages/server/src/routes.rs`, `packages/server/src/main.rs`
- Modify: `frontend/src/api/bridge.ts`, `frontend/src/api/http.ts`, `frontend/src/api/index.ts`
- Modify: `frontend/src/views/PreviewView.vue`, `frontend/src/views/GenerateView.vue`
- Modify: `frontend/src/utils/importParser.ts`, `frontend/src/stores/practice.ts`
- Modify: `packages/shared/src/types.ts`, `frontend/src/components/practice/BankListCard.vue`

**Interfaces:** The Tauri invoke command string (`bridge.ts`) must equal the Rust `#[tauri::command]` fn name; the HTTP path in `http.ts` must equal the Axum route in `main.rs`. Rename both sides together.

- [ ] **Step 1: Rename the Rust export file with git**

```bash
git mv packages/core/src/export/kaoshibao.rs packages/core/src/export/xlsx.rs
```

- [ ] **Step 2: Rust — core export**

In `packages/core/src/export/xlsx.rs` (the renamed file), apply these renames to every occurrence:
- `KAOSHIBAO_TYPE_MAP` → `XLSX_TYPE_MAP` (const declaration at line 7 and its use in the `to_chinese_type` loop)
- `pub fn export_kaoshibao(` → `pub fn export_xlsx(`
- `pub fn export_kaoshibao_to_writer(` → `pub fn export_xlsx_to_writer(`
- `fn generate_kaoshibao_xlsx(` → `fn generate_xlsx(` and its two internal call sites `generate_kaoshibao_xlsx(questions)` → `generate_xlsx(questions)`
- (Leave `to_chinese_type` unchanged — already generic.)

In `packages/core/src/export/mod.rs`, replace all 5 lines' worth so it reads:

```rust
mod writer;
mod xlsx;

pub use writer::{export_csv, export_csv_to_writer};
pub use xlsx::{export_xlsx, export_xlsx_to_writer};
```

In `packages/core/src/export/writer.rs` line 6:

```rust
use super::xlsx::to_chinese_type;
```

- [ ] **Step 3: Rust — build core**

Run: `cargo build -p exambot-core`
Expected: exit 0, no `kaoshibao` unresolved references.

- [ ] **Step 4: Rust — tauri command**

In `src-tauri/src/lib.rs`:
- line 5: `use exambot_core::export::export_xlsx as core_export_xlsx;`
- the `#[tauri::command] fn export_kaoshibao(` → `fn export_xlsx(`
- call site `core_export_kaoshibao(&questions, &save_path)` → `core_export_xlsx(&questions, &save_path)`
- `export_kaoshibao_to_writer` (in `export_xlsx_data`) → `export_xlsx_to_writer`
- in the `invoke_handler![ ... ]` list, `export_kaoshibao,` → `export_xlsx,`

- [ ] **Step 5: Rust — server**

In `packages/server/src/routes.rs`:
- `pub async fn export_kaoshibao_handler(` → `pub async fn export_xlsx_handler(`
- `exambot_core::export::export_kaoshibao_to_writer(` → `exambot_core::export::export_xlsx_to_writer(`

In `packages/server/src/main.rs` line 23:

```rust
        .route("/api/export/xlsx", post(routes::export_xlsx_handler))
```

- [ ] **Step 6: Rust — build server + tauri lib + tests**

```powershell
cargo build -p exambot-server
cargo test -p exambot-core
cargo check -p exambot_lib
```

Expected: all exit 0 (30 core tests pass; `exambot_lib` is the Tauri crate's lib — confirms the command rename compiles).

- [ ] **Step 7: Frontend — API layer**

In `frontend/src/api/bridge.ts`: rename the method `async exportKaoshibao(` → `async exportXlsx(` and the invoke command string `'export_kaoshibao'` → `'export_xlsx'`.

In `frontend/src/api/http.ts`: rename the method `async exportKaoshibao(` → `async exportXlsx(` and the fetch path `/api/export/kaoshibao` → `/api/export/xlsx`.

In `frontend/src/api/index.ts`: rename the facade `async exportKaoshibao(` → `async exportXlsx(`, and its body calls `tauriApi.exportKaoshibao(` → `tauriApi.exportXlsx(` and `httpApi.exportKaoshibao(` → `httpApi.exportXlsx(`.

- [ ] **Step 8: Frontend — views**

In `frontend/src/views/PreviewView.vue`: rename every `exportingKaoshibao` → `exportingXlsx`, `handleExportKaoshibao` → `handleExportXlsx`, and `api.exportKaoshibao(` → `api.exportXlsx(`.

In `frontend/src/views/GenerateView.vue`: rename every `exportingKaoshibao` → `exportingXlsx` and `api.exportKaoshibao(` → `api.exportXlsx(`. (The handler is already named `handleExportXlsx`.)

- [ ] **Step 9: Frontend — import detection & types**

In `frontend/src/utils/importParser.ts`:
- `function buildKaoshibaoMap(` → `function buildXlsxColumnMap(` and its call site `columnMap = buildKaoshibaoMap()` → `buildXlsxColumnMap()`
- `function detectIsKaoshibao(` → `function detectXlsxFormat(` and its call site `detectIsKaoshibao(headers)` → `detectXlsxFormat(headers)`
- `parseRawData(dataRows, columnMap, 'kaoshibao')` → `parseRawData(dataRows, columnMap, 'xlsx')`
- `return { questions, source: 'kaoshibao' }` → `return { questions, source: 'xlsx' }`

In `packages/shared/src/types.ts` line 29:

```ts
  source: 'ai-generated' | 'csv-import' | 'xlsx-import'
```

In `frontend/src/stores/practice.ts` line 348:

```ts
    const source = importPreview.value[0]?.id.startsWith('xlsx') ? 'xlsx-import' as const : 'csv-import' as const
```

- [ ] **Step 10: Frontend — BankListCard backward-compatible display**

In `frontend/src/components/practice/BankListCard.vue`, replace the `sourceLabel` body (lines 30-32):

```ts
  if (source === 'ai-generated') return i18n.t('practiceSourceAI')
  if (source === 'csv-import' || source === 'kaoshibao-import') return i18n.t('practiceSourceImport')
  return source
```

with (any non-AI source — including legacy persisted `'kaoshibao-import'` — shows as imported):

```ts
  if (source === 'ai-generated') return i18n.t('practiceSourceAI')
  return i18n.t('practiceSourceImport')
```

- [ ] **Step 11: Frontend — type-check**

Run: `pnpm --dir frontend type-check`
Expected: exit 0. (`@exambot/shared` is a workspace package — if the type change isn't picked up, run `pnpm --dir frontend build` once or ensure the shared package is rebuilt; report if so.)

- [ ] **Step 12: Verify zero remaining references**

Run: `rg -i "kaoshibao" packages src-tauri/src frontend/src`
Expected: no matches (exit 1 / no output). If `rg` is unavailable, use `Get-ChildItem -Recurse packages,src-tauri\src,frontend\src -Include *.rs,*.ts,*.vue | Select-String -Pattern 'kaoshibao'` — must be empty.

- [ ] **Step 13: Commit**

```bash
git add -A
git commit -m "refactor: rename kaoshibao export/import identifiers to generic xlsx"
```

---

### Task 5: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Run everything**

```powershell
cargo test -p exambot-core
cargo build -p exambot-server
cargo check -p exambot_lib
pnpm --dir frontend type-check
```

Expected: all exit 0.

- [ ] **Step 2: Desktop manual QA (user confirms)**

Launch `start.bat` → `1`. Checklist:

- [ ] Scrollbars in long lists (practice list, question table, file list) are thin and unobtrusive, appear on hover/scroll
- [ ] Theme button cycles system → light → dark → system; icon reflects state (monitor/sun/moon)
- [ ] In `system` mode, changing the OS light/dark setting flips the app live
- [ ] Chosen theme persists across app restart; no light-flash (FOUC) on launch
- [ ] XLSX export button shows a download icon and still exports a working .xlsx
- [ ] CSV export still works
- [ ] Import an XLSX question bank → still detected/imported; an existing imported bank still shows "外部导入" / "Imported"

- [ ] **Step 3: Fix anything that fails, commit fixes**

Any fix: reproduce → minimal change → re-run the covering check → commit `fix:`.

---

## Self-Review Notes

- Spec coverage: scrollbars ✔ (T1), 3-state theme + FOUC + migration + system listener ✔ (T2), XLSX icon ✔ (T3), full kaoshibao rename A+B + backward-compat display ✔ (T4), verification ✔ (T5).
- Cross-side consistency in T4: invoke name `'export_xlsx'` ↔ `fn export_xlsx`; route `/api/export/xlsx` ↔ `export_xlsx_handler`; ID prefix `'xlsx'` ↔ `startsWith('xlsx')` ↔ `'xlsx-import'`.
- No placeholders; all code complete. No new dependencies.
