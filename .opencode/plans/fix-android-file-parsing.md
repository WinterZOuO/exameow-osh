# Fix Android File Parsing Issue

## Problem
On Android, `@tauri-apps/plugin-dialog` returns `content://` URIs, which `std::fs` cannot read. The `hasTauriPaths` branch in `exam.ts` calls `parse_file_text(path)` → `std::fs::read_to_string()` which fails silently.

## Changes

### 1. `frontend/package.json`
Add `@tauri-apps/plugin-fs` dependency:
```json
"@tauri-apps/plugin-fs": "^2",
```
(Insert after line 18, after `@tauri-apps/plugin-dialog`)

### 2. `src-tauri/capabilities/default.json`
Add `fs:allow-read-file` permission:
```json
"fs:allow-read-file",
```
(Insert after line 10, after `"fs:allow-read-text-file"`)

### 3. `frontend/src/stores/exam.ts` (main fix)
Replace the `hasTauriPaths` branch (lines 177-185) to use `@tauri-apps/plugin-fs` `readFile` instead of `parseFileText`:

```typescript
if (hasTauriPaths) {
    progress.value.message = 'Extracting document text...'
    const { readFile } = await import('@tauri-apps/plugin-fs')
    const { tauriApi } = await import('@/api/bridge')
    for (const input of inputs) {
        if (typeof input === 'string') {
            const ext = input.split('.').pop()?.toLowerCase() || 'txt'
            const buf = await readFile(input)
            const bytes = new Uint8Array(buf)
            const base64 = btoa(String.fromCharCode(...bytes))
            const text = await tauriApi.parseFileBytes(base64, ext)
            if (text) fullText += (fullText ? '\n\n---\n\n' : '') + text
        }
    }
}
```

### 4. `frontend/src/stores/exam.ts` — Add error state
Add a reactive error ref and catch block so failures are visible to users:

```typescript
// Add alongside other refs (around line 28):
const error = ref<string | null>(null)

// Modify `generate()` — change `try { ... } finally { ... }` to:
try {
    error.value = null
    // ... existing code ...
} catch (e: any) {
    error.value = e?.message || e?.toString() || 'Unknown error'
    throw e
} finally {
    generating.value = false
}
```

### 5. `frontend/src/views/GenerateView.vue`
Display the error message in the UI. Add an error banner after the progress block (around line 76):

```html
<!-- Error banner -->
<Transition name="scale">
    <div v-if="examStore.error && !examStore.generating" class="card-filled p-4 mb-6" :style="{ backgroundColor: 'rgba(var(--md-error) / 0.08)', border: '1px solid rgb(var(--md-error))' }">
        <p class="text-body-md" style="color: rgb(var(--md-error))">{{ examStore.error }}</p>
    </div>
</Transition>
```

Also update the `handleGenerate` function so it doesn't swallow the error silently (line 38):
```typescript
} catch (e) {
    // error is shown in UI via examStore.error
}
```

## Why this works
- `@tauri-apps/plugin-fs` `readFile()` internally uses Android's `ContentResolver` to handle `content://` URIs, solving the root cause.
- On desktop, `readFile()` works identically for regular file paths, so no regression.
- Error messages are now shown to the user instead of silently disappearing the progress bar.
