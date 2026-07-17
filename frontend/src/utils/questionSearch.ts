import type { Question, QuestionBank, QuestionType } from '@exameow/shared'

export type MatchScope = 'stem' | 'stem_options'
export type MatchTier = 'exact' | 'fuzzy'

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
  tier: MatchTier
}

const FUZZY_MIN_SCORE = 0.25
const EXACT_CONTAIN_MIN_LEN = 6
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

export function isExactMatch(query: string, target: string): boolean {
  if (!query || !target) return false
  if (query === target) return true
  if (query.length >= EXACT_CONTAIN_MIN_LEN && target.includes(query)) return true
  if (target.length >= EXACT_CONTAIN_MIN_LEN && query.includes(target)) return true
  return false
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

      const targets = [normalizeText(question.stem)]
      if (settings.scope === 'stem_options') {
        for (const opt of question.options) targets.push(normalizeText(opt))
      }

      let score = 0
      let tier: MatchTier = 'fuzzy'
      for (const t of targets) {
        const s = similarity(q, t)
        if (s > score) score = s
        if (isExactMatch(q, t)) tier = 'exact'
      }

      if (tier === 'exact' || score >= FUZZY_MIN_SCORE) {
        hits.push({ question, bankId: bank.id, bankName: bank.name, score, tier })
      }
    }
  }

  hits.sort((a, b) => {
    if (a.tier !== b.tier) return a.tier === 'exact' ? -1 : 1
    return b.score - a.score
  })
  return hits.slice(0, MAX_HITS)
}
