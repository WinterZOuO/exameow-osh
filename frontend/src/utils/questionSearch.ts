import type { Question, QuestionBank, QuestionType } from '@exambot/shared'

export type MatchScope = 'stem' | 'stem_options'

export interface SearchSettings {
  bankIds: string[] | null
  scope: MatchScope
  types: QuestionType[] | null
}

export interface SearchHit {
  question: Question
  bankId: string
  bankName: string
  score: number
}

const MIN_SCORE = 0.05
const MAX_HITS = 50

export function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\uFF01-\uFF5E]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
    .replace(/\s+/g, '')
}

function bigrams(s: string): Map<string, number> {
  const map = new Map<string, number>()
  if (s.length === 1) {
    map.set(s, 1)
    return map
  }
  for (let i = 0; i < s.length - 1; i++) {
    const g = s.slice(i, i + 2)
    map.set(g, (map.get(g) || 0) + 1)
  }
  return map
}

export function similarity(query: string, target: string): number {
  if (!query || !target) return 0
  if (query === target) return 1

  const qGrams = bigrams(query)
  const tGrams = bigrams(target)

  let overlap = 0
  let qTotal = 0
  for (const [g, n] of qGrams) {
    qTotal += n
    const m = tGrams.get(g)
    if (m) overlap += Math.min(n, m)
  }
  let tTotal = 0
  for (const n of tGrams.values()) tTotal += n

  const dice = qTotal + tTotal > 0 ? (2 * overlap) / (qTotal + tTotal) : 0

  if (target.includes(query)) {
    return Math.min(1, Math.max(dice, 0.6 + (0.4 * query.length) / target.length))
  }
  return dice
}

export function searchQuestions(
  query: string,
  banks: QuestionBank[],
  settings: SearchSettings,
): SearchHit[] {
  const q = normalizeText(query)
  if (!q) return []

  const hits: SearchHit[] = []
  for (const bank of banks) {
    if (settings.bankIds && !settings.bankIds.includes(bank.id)) continue
    for (const question of bank.questions) {
      if (settings.types && !settings.types.includes(question.type)) continue

      let score = similarity(q, normalizeText(question.stem))
      if (settings.scope === 'stem_options') {
        for (const opt of question.options) {
          const s = similarity(q, normalizeText(opt))
          if (s > score) score = s
        }
      }

      if (score >= MIN_SCORE) {
        hits.push({ question, bankId: bank.id, bankName: bank.name, score })
      }
    }
  }

  hits.sort((a, b) => b.score - a.score)
  return hits.slice(0, MAX_HITS)
}
