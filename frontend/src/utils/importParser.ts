import type { Question } from '@quizseek/shared'
import { QuestionType as QT } from '@quizseek/shared'
import * as XLSX from 'xlsx'

type QuestionType = typeof QT[keyof typeof QT]

const ST: QuestionType = 'single_choice' as QuestionType
const MT: QuestionType = 'multi_choice' as QuestionType
const TF: QuestionType = 'true_false' as QuestionType
const FB: QuestionType = 'fill_blank' as QuestionType
const SA: QuestionType = 'short_answer' as QuestionType

interface ColumnMap {
  stem: number | null
  type: number | null
  options: number[]
  answer: number | null
  analysis: number | null
}

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, '')
}

function looksLikeHeader(cell: string): boolean {
  if (!cell || cell.trim().length === 0) return false
  const t = cell.trim()
  if (/^\d+$/.test(t)) return false
  if (t.length > 30) return false
  const keywords = [
    '题干', '题目', '题', 'stem', 'question', 'title',
    '题型', '类型', 'type',
    '选项', 'option', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h',
    '答案', '正确答案', 'answer',
    '解析', '分析', 'analysis', '章节', '难度', 'difficulty',
    'questiontype', 'singlechoice', 'multichoice', 'truefalse',
    '单选题', '多选题', '判断题', '填空题', '简答题', '判断',
    '对错', '正确', '正确选项',
  ]
  return keywords.some(k => normalize(t).includes(normalize(k)))
}

function isHeaderRow(row: unknown[]): boolean {
  if (!row || row.length === 0) return false
  const totalCells = row.length
  const headerCells = row.filter(c => {
    const s = String(c ?? '').trim()
    return s.length > 0 && looksLikeHeader(String(c ?? ''))
  }).length
  return headerCells >= 2 && headerCells / totalCells >= 0.4
}

function detectColumnType(val: string): QuestionType | null {
  const v = normalize(val)
  if (v.includes('单选') || (v.includes('single') && !v.includes('multi'))) return ST
  if (v.includes('多选') || v.includes('multi') || v.includes('多项')) return MT
  if (v.includes('判断') || v.includes('true') || v.includes('false') || v.includes('对错') || v === '是非' || v.includes('是非')) return TF
  if (v.includes('填空') || v.includes('fill') || v.includes('blank') || v.includes('blanks')) return FB
  if (v.includes('简答') || v.includes('问答') || v.includes('short') || v.includes('essay') || v.includes('主观')) return SA
  return null
}

function detectColumnTypeFromQA(stem: string, answer: string, hasOptions: boolean): QuestionType | null {
  if (hasOptions && answer.length <= 3) {
    if (answer.includes(',') || answer.includes(';') || answer.includes('、') || answer.length > 1) {
      return MT
    }
    return ST
  }
  const judgeKeys = ['对', '错', '√', '×', '正确', '错误', 'true', 'false', '是', '否']
  if (judgeKeys.some(k => answer.trim().replace(/[.。]/g, '') === k || answer.trim().toLowerCase() === k)) {
    return TF
  }
  if (hasOptions) return ST
  if (!stem.includes('_____') && !answer.includes('填空')) return SA
  return FB
}

function buildColumnMap(headers: string[]): ColumnMap {
  const map: ColumnMap = { stem: null, type: null, options: [], answer: null, analysis: null }

  for (let i = 0; i < headers.length; i++) {
    const h = headers[i]
    if (!h) continue
    const n = normalize(h)

    if (map.stem === null && (
      n.includes('题干') || n.includes('题目') || n === '题' || n.includes('stem') || n.includes('question') || n === 'title' || n.includes('内容') || n === 'q'
    )) {
      map.stem = i
      continue
    }

    if (map.type === null && (
      n.includes('题型') || n.includes('类型') || n.includes('type') || n === 'qt' || n.includes('种类')
    )) {
      map.type = i
      continue
    }

    if (map.answer === null && (
      n.includes('答案') || n.includes('正确') || n.includes('answer') || n === 'ans' || n.includes('标准') || n.includes('key')
    )) {
      map.answer = i
      continue
    }

    if (map.analysis === null && (
      n.includes('解析') || n.includes('分析') || n.includes('analysis') || n.includes('explanation') || n.includes('详解') || n.includes('解释')
    )) {
      map.analysis = i
      continue
    }

    if (/^[a-h]$/i.test(n) || n.includes('选项') || n.includes('option')) {
      map.options.push(i)
    }

    if (/^选项\s*[a-h]$/i.test(n) || /^option\s*[a-h]$/i.test(n)) {
      map.options.push(i)
    }
  }

  if (map.stem === null && map.type === null && map.answer === null) {
    if (headers.length >= 3) {
      map.stem = 0
      map.answer = headers.length - 2
      if (headers.length >= 4) map.analysis = headers.length - 1
      for (let i = 1; i < Math.min(headers.length - 2, 9); i++) {
        map.options.push(i)
      }
    }
  }

  return map
}

function buildXlsxColumnMap(): ColumnMap {
  return {
    stem: 0,
    type: 1,
    options: [2, 3, 4, 5, 6, 7, 8, 9],
    answer: 10,
    analysis: 11,
  }
}

function typeLabelToEnum(label: string): QuestionType {
  const n = normalize(label)
  if (n.includes('单选') || n.includes('single')) return ST
  if (n.includes('多选') || n.includes('multi')) return MT
  if (n.includes('判断') || n.includes('true') || n.includes('false') || n.includes('对错')) return TF
  if (n.includes('填空') || n.includes('fill') || n.includes('blank')) return FB
  if (n.includes('简答') || n.includes('问答') || n.includes('short') || n.includes('essay')) return SA
  return SA
}

function parseRawData(rows: string[][], columnMap: ColumnMap, source: string): Question[] {
  const questions: Question[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    if (!row || row.length === 0) continue
    const allBlank = row.every(c => !c || c.trim() === '')
    if (allBlank) continue

    const stem = columnMap.stem !== null ? (row[columnMap.stem] ?? '').trim() : ''
    if (!stem) continue

    let qtype: QuestionType = SA
    if (columnMap.type !== null) {
      const t = (row[columnMap.type] ?? '').trim()
      qtype = typeLabelToEnum(t)
    }

    const options: string[] = []
    for (const oi of columnMap.options) {
      const o = (row[oi] ?? '').trim()
      if (o) options.push(o)
    }

    const answer = columnMap.answer !== null ? (row[columnMap.answer] ?? '').trim() : ''
    const analysis = columnMap.analysis !== null ? (row[columnMap.analysis] ?? '').trim() : ''

    if (!qtype || qtype === SA) {
      const inferred = detectColumnTypeFromQA(stem, answer, options.length > 0)
      if (inferred) qtype = inferred
    }

    questions.push({
      id: `${source}-${i + 1}`,
      type: qtype,
      stem,
      options,
      answer,
      analysis,
    })
  }

  return questions
}

function detectXlsxFormat(headers: string[]): boolean {
  if (headers.length < 11) return false
  const checks = [
    normalize(headers[0] ?? '').includes('题干'),
    normalize(headers[1] ?? '').includes('题型'),
    normalize(headers[10] ?? '').includes('答案') || normalize(headers[10] ?? '').includes('正确'),
  ]
  return checks.filter(Boolean).length >= 2
}

export function parseCSV(text: string): { questions: Question[]; source: string } {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (lines.length === 0) return { questions: [], source: 'csv' }

  const rows: string[][] = []
  for (const line of lines) {
    const cells = parseCSVLine(line)
    if (cells.length > 0) rows.push(cells)
  }

  if (rows.length < 2) return { questions: [], source: 'csv' }

  let headerIndex = 0
  if (isHeaderRow(rows[0]!)) {
    headerIndex = 0
  } else {
    headerIndex = -1
  }

  let columnMap: ColumnMap
  if (headerIndex >= 0) {
    columnMap = buildColumnMap(rows[headerIndex]!)
  } else {
    if (rows.length > 0) {
      columnMap = buildColumnMap([])
    } else {
      return { questions: [], source: 'csv' }
    }
  }

  const dataRows = rows.slice(headerIndex >= 0 ? headerIndex + 1 : 0)
  const questions = parseRawData(dataRows, columnMap, 'csv')
  return { questions, source: 'csv' }
}

export function parseExcel(buffer: ArrayBuffer, fileName: string): { questions: Question[]; source: string } {
  const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) return { questions: [], source: 'excel' }

  const sheet = workbook.Sheets[sheetName]
  if (!sheet) return { questions: [], source: 'excel' }

  const rows: (string[] | undefined)[] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', blankrows: false })

  if (rows.length === 0) return { questions: [], source: 'excel' }

  let columnMap: ColumnMap
  const headers = (rows[0] ?? []).map(c => String(c ?? ''))

  if (detectXlsxFormat(headers)) {
    columnMap = buildXlsxColumnMap()
    const dataRows = rows.slice(1).filter((r): r is string[] => r !== undefined)
    const questions = parseRawData(dataRows, columnMap, 'xlsx')
    return { questions, source: 'xlsx' }
  }

  let headerIndex = 0
  if (isHeaderRow((rows[0] ?? []).map(c => String(c ?? '')))) {
    columnMap = buildColumnMap(headers)
  } else {
    if (rows.length > 0) {
      columnMap = buildColumnMap([])
    } else {
      return { questions: [], source: 'excel' }
    }
    headerIndex = -1
  }

  const dataRows = rows.slice(headerIndex >= 0 ? headerIndex + 1 : 0).filter((r): r is string[] => r !== undefined)
  const questions = parseRawData(dataRows, columnMap, 'excel')
  return { questions, source: 'excel' }
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        current += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === ',') {
        result.push(current.trim())
        current = ''
      } else {
        current += ch
      }
    }
  }
  result.push(current.trim())
  return result
}
