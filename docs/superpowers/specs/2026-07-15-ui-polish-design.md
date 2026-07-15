# UI Polish & Naming Cleanup Design

**Date:** 2026-07-15
**Status:** Approved

Four independent small changes to the ExamBot desktop/web app.

## 1. iOS-style Overlay Scrollbars

**Problem:** No custom scrollbar CSS exists; the OS default (thick, width-reserving on Windows WebView2) looks heavy.

**Solution:** Add a global rule in `frontend/src/assets/main.css` under `@layer base`:

- WebKit/Chromium (`::-webkit-scrollbar`): 6px wide/tall, transparent track, thumb transparent by default, showing a semi-transparent `rgb(var(--md-outline-variant) / 0.5)` on `:hover`/active with 3px border-radius.
- Firefox fallback: `scrollbar-width: thin; scrollbar-color: transparent transparent`.

Applied globally (all scroll containers): affects the 5 existing scroll areas (PracticeView, QuestionTable, FileUploader, WrongQuestionManager, AnswerSheet) uniformly. Thin + fade look approximates iOS overlay behavior in WebView2.

## 2. Three-State Theme (system / light / dark)

**Current:** `isDark` boolean in `AppShell.vue`, localStorage `exambot-dark` = `'1'`/`'0'`, sun/moon toggle. `.dark` class on `<html>` drives CSS custom-property overrides in `main.css:74-113`.

**New:**
- State: `theme = ref<'system' | 'light' | 'dark'>`, default `'system'`.
- Persistence: new key `exambot-theme`. One-time migration reads legacy `exambot-dark` (`'1'`→`'dark'`, `'0'`→`'light'`) if `exambot-theme` absent.
- Resolution: `effectiveDark = theme === 'dark' || (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)`. Toggle `<html>.dark` accordingly.
- System listener: subscribe to `matchMedia('(prefers-color-scheme: dark)')` `change`; re-apply only while `theme === 'system'`.
- Control: single button cycling `system → light → dark → system`. Icons: `ComputerDesktopIcon` / `SunIcon` / `MoonIcon` (all `@heroicons/vue/24/outline`).
- FOUC prevention: blocking inline `<script>` in `index.html` `<head>` that reads `exambot-theme` (falling back to legacy `exambot-dark`, then `system`) and adds `dark` class before paint.

## 3. XLSX Button Download Icon

`frontend/src/views/PreviewView.vue` and `frontend/src/views/GenerateView.vue`: replace `TableCellsIcon` with `ArrowDownTrayIcon` on the XLSX export button (both files already import `ArrowDownTrayIcon` for the CSV button — both buttons will show the download icon, differentiated by their "CSV"/"XLSX" labels). Remove now-unused `TableCellsIcon` from both import statements.

## 4. Rename `kaoshibao` → generic `xlsx`

Remove the third-party product name from all code. Full inventory: 38 occurrences across 9 files.

**Category A — export chain (rename to `xlsx`):**
- `packages/core/src/export/kaoshibao.rs` → `xlsx.rs`; `mod kaoshibao` → `mod xlsx` (mod.rs)
- `export_kaoshibao` → `export_xlsx`, `export_kaoshibao_to_writer` → `export_xlsx_to_writer`, `generate_kaoshibao_xlsx` → `generate_xlsx`, `KAOSHIBAO_TYPE_MAP` → `XLSX_TYPE_MAP`
- `writer.rs` import `super::kaoshibao::to_chinese_type` → `super::xlsx::to_chinese_type` (`to_chinese_type` name unchanged — already generic)
- `src-tauri/src/lib.rs`: import alias, Tauri command `export_kaoshibao` → `export_xlsx`, call sites, invoke_handler entry
- `packages/server/src/routes.rs`: `export_kaoshibao_handler` → `export_xlsx_handler`, call site
- `packages/server/src/main.rs`: route `/api/export/kaoshibao` → `/api/export/xlsx`
- `frontend/src/api/bridge.ts`: `exportKaoshibao` → `exportXlsx`, invoke name `'export_kaoshibao'` → `'export_xlsx'`
- `frontend/src/api/http.ts`: `exportKaoshibao` → `exportXlsx`, path `/api/export/kaoshibao` → `/api/export/xlsx`
- `frontend/src/api/index.ts`: facade `exportKaoshibao` → `exportXlsx`
- `PreviewView.vue` / `GenerateView.vue`: `exportingKaoshibao` → `exportingXlsx`, `handleExportKaoshibao` → `handleExportXlsx` (GenerateView's handler already named `handleExportXlsx`), template bindings

**Category B — import detection (rename to describe format, not product):**
- `frontend/src/utils/importParser.ts`: `buildKaoshibaoMap` → `buildXlsxColumnMap`, `detectIsKaoshibao` → `detectXlsxFormat`, call sites, parse-source string `'kaoshibao'` → `'xlsx'`
- `packages/shared/src/types.ts`: union `'kaoshibao-import'` → `'xlsx-import'`
- `frontend/src/stores/practice.ts:348`: `id.startsWith('kaoshibao')` → `id.startsWith('xlsx')`, `'kaoshibao-import'` → `'xlsx-import'`

**Backward compatibility for persisted data:**
Existing question banks in localStorage may carry `source: 'kaoshibao-import'`. `BankListCard.vue:31` display logic changes from explicit `source === 'csv-import' || source === 'kaoshibao-import'` to: treat any source that is not `'ai-generated'` as imported (default case → `practiceSourceImport`). Legacy banks then display correctly as "外部导入"/"Imported" without the name appearing in code.

## Testing

- `cargo test -p exambot-core` (export tests reference the renamed functions — update assertions/calls), `cargo build -p exambot-server`, `pnpm --dir frontend type-check` — all green.
- Grep confirms zero `kaoshibao`/`Kaoshibao`/`KAOSHIBAO` remain in `packages/`, `src-tauri/`, `frontend/src/` (docs/specs history excluded).
- Desktop manual QA: scrollbar look; theme cycle system→light→dark + follows OS in system mode + persists across restart + no FOUC; XLSX button shows download icon and still exports; CSV/XLSX export both work; an existing imported bank still shows "外部导入".

## Out of Scope

- Renaming the Chinese product string in any user-facing i18n text (there is none — all `kaoshibao` hits are code identifiers).
- Migrating/rewriting persisted `'kaoshibao-import'` values in storage (handled by tolerant display logic instead).
