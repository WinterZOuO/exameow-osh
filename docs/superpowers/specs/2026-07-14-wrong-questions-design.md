# Wrong Questions Feature Design

## Overview

Persistent wrong-question tracking across practice sessions. Users accumulate wrong questions per bank, can practice them via dual-entry (continue-practice card + mode selector), and manage them via an in-practice removal button + dedicated management UI.

## Data Model

### shared/types.ts additions

```typescript
type PracticeMode = 'sequential' | 'random' | 'mock' | 'wrong'

type WrongSort = 'count-desc' | 'count-asc' | 'time-desc' | 'time-asc'

interface WrongQuestionEntry {
  questionId: string
  wrongCount: number
  consecutiveCorrect: number    // reset to 0 on wrong answer
  lastWrongAt: number
  addedAt: number
}

// Stored as a flat map per bank:
// { [bankId]: { [questionId]: WrongQuestionEntry } }
```

## Store: stores/wrongQuestions.ts

- **Storage**: `localStorage` key `exambot-wrong-questions`
- **Data**: `Record<string, Record<string, WrongQuestionEntry>>` — bankId → questionId → entry

### Methods

| Method | Description |
|--------|-------------|
| `recordWrong(bankId, questionId)` | Increment `wrongCount`, reset `consecutiveCorrect=0`, update `lastWrongAt` |
| `recordCorrect(bankId, questionId)` | Increment `consecutiveCorrect`. If `>= 3`, auto-remove entry + return `true` (removed) |
| `removeWrong(bankId, questionId)` | Manual removal from wrong bank |
| `clearBank(bankId)` | Remove all wrong questions for a bank |
| `hasWrongQuestions(bankId)` | Boolean check for UI badges |
| `getWrongCount(bankId)` | Number of wrong questions for a bank |
| `getWrongEntry(bankId, questionId)` | Get single entry (for display) |
| `getWrongQuestions(bankId, sort)` | Return sorted question list for practice |

## UI Changes

### 1. PracticeView.vue — Continue Practice Card

Add a third button "错题练习" next to existing [Trash] [继续] buttons. Only visible when `wrongStore.hasWrongQuestions(session.bankId)`. Clicking opens a sort picker then starts wrong-question practice.

### 2. ModeSelector.vue — New "错题练习" Option

Add a 4th mode button with distinct icon (ExclamationTriangleIcon). Shown only when the selected bank has wrong questions.

### 3. WrongQuestionsSortDialog.vue (New)

Simple dialog shown before starting wrong-question practice. Options: 按做错次数（高→低 / 低→高）/ 按最近做错时间（新→旧 / 旧→新）. Default: count-desc.

### 4. QuestionCard.vue — Wrong Practice Mode

- New prop: `wrongCount?: number` — displays "本题已做错 X 次" below the stem
- New prop: `isWrongMode?: boolean` — controls visibility of the remove button
- New emit: `removeWrong` — emits when user clicks the remove button
- Remove button: XMarkIcon in top-right header area, only in wrong mode

### 5. WrongQuestionManager.vue (New)

Full management UI accessible from BankListCard. Per-bank view:
- Sort: by count / by time
- List of wrong questions with: stem preview, wrong count, last wrong date
- Each row has a remove button
- Batch clear button at top

### 6. BankListCard.vue

Add a "错题本" icon button on each bank card's right side. Only shown when bank has wrong questions. Clicking opens WrongQuestionManager dialog for that bank.

### 7. PracticeView.vue — Practice Flow Integration

- After `submitAnswer()` returns `isCorrect === false`: call `wrongStore.recordWrong(bankId, originalQuestionId)`
- After `submitAnswer()` returns `isCorrect === true`: call `wrongStore.recordCorrect(bankId, originalQuestionId)`. If returns `true`, show toast "已连续答对3次，已从错题本移除"
- After `selfCheck(false)`: same as wrong
- After `selfCheck(true)`: same as correct
- `startSession()` for `mode === 'wrong'`: load wrong questions from store, create session with only those questions in chosen sort order
- Question ID mapping: wrong-mode session questions use a `originalQuestionId` field (set to the bank question's `id`) for wrong-store tracking. Non-wrong sessions do NOT add this field — instead, the original question ID is derived by stripping the `-s\d+$` suffix from the session question ID before passing to wrongStore.

### 8. i18n/locales.ts

Add 15+ new keys for wrong question UI strings (zh/en).

## Flow

```
Browse → Select Bank → Mode Selector [sequential|random|mock|wrong]
                    → Continue Card [continue|wrong-questions]

Wrong mode: sort dialog → startSession('wrong') → practice → result
During practice:
  - Answer wrong → wrongCount++, consecutiveCorrect=0
  - Answer correct → consecutiveCorrect++, if>=3 auto-remove
  - Manual remove → remove from wrong bank, skip current question
```

## Files to Modify

| File | Change |
|------|--------|
| `packages/shared/src/types.ts` | Add types |
| `frontend/src/stores/wrongQuestions.ts` | New file |
| `frontend/src/i18n/locales.ts` | Add keys |
| `frontend/src/views/PracticeView.vue` | Wrong-question flow, continue card button, wrong practice start |
| `frontend/src/components/practice/ModeSelector.vue` | 4th mode |
| `frontend/src/components/practice/QuestionCard.vue` | wrongCount + remove button |
| `frontend/src/components/practice/BankListCard.vue` | Wrong bank badge button |
| `frontend/src/components/practice/WrongQuestionsSortDialog.vue` | New |
| `frontend/src/components/practice/WrongQuestionManager.vue` | New |
