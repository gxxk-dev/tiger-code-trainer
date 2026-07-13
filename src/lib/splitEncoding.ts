import { orderedRoots } from '../data/curriculum'
import type { RootEntry, SplitEntry } from '../types'

const ROOT_GLYPH_ALIASES: Record<string, string> = {
  '𣥂': '止',
  '𠂭': '米',
  '匸': '匚',
  '': '辛',
  '㇂': '㇆',
  '': '卩',
}

export interface EncodingPick {
  rootIndex: number
  codeIndex: 0 | 1
  letter: string
}

export interface SplitEncoding {
  formula: 'Aa' | 'ABb' | 'ABCc' | 'ABCD' | 'ABCZ'
  formulaText: string
  rootCodes: string[]
  picks: EncodingPick[]
  derivedCode: string
}

export function formatRootCode(code: string): string {
  return code ? `${code[0].toUpperCase()}${code.slice(1).toLowerCase()}` : '??'
}

export function resolveSplitRootCodes(split: SplitEntry): string[] {
  const declaredCodes = split.rootCodes?.map((code) => code.toLowerCase())
  if (declaredCodes?.length === split.roots.length) return declaredCodes

  const note = split.note.replace(/^重试：/, '')
  const noteCodes = note.startsWith('字根码：')
    ? (note.match(/[A-Za-z]{2}/g) ?? []).map((code) => code.toLowerCase())
    : []

  return split.roots.map((glyph, index) => {
    const root = resolveRootEntry(glyph, noteCodes[index])
    return noteCodes[index] ?? root?.code ?? ''
  })
}

export function splitUsesOnlyRoots(split: SplitEntry, knownRoots: RootEntry[]): boolean {
  const rootCodes = resolveSplitRootCodes(split)
  return split.roots.every((glyph, index) => matchesKnownRoot(glyph, rootCodes[index], knownRoots))
}

export function splitUsesAnyRoot(split: SplitEntry, roots: RootEntry[]): boolean {
  const rootCodes = resolveSplitRootCodes(split)
  return split.roots.some((glyph, index) => matchesKnownRoot(glyph, rootCodes[index], roots))
}

export function displaySplitRootGlyph(glyph: string, code?: string): string {
  if (glyph === '囗(框)') return '囗'
  if (!isPrivateUseGlyph(glyph)) return glyph
  return resolveRootEntry(glyph, code)?.root.replace('(框)', '') ?? glyph
}

export function buildSplitEncoding(split: SplitEntry): SplitEncoding {
  const rootCodes = resolveSplitRootCodes(split)
  const rule = ruleForRootCount(rootCodes.length)
  const picks = rule.positions.map(([rootIndex, codeIndex]) => ({
    rootIndex,
    codeIndex,
    letter: rootCodes[rootIndex]?.[codeIndex] ?? '',
  }))

  return {
    formula: rule.formula,
    formulaText: rule.formulaText,
    rootCodes,
    picks,
    derivedCode: picks.map((pick) => pick.letter).join(''),
  }
}

function resolveRootEntry(glyph: string, code?: string): RootEntry | undefined {
  return orderedRoots.find((entry) => entry.root === glyph)
    ?? orderedRoots.find((entry) => Array.from(entry.variants ?? '').includes(glyph))
    ?? (glyph === '囗' ? orderedRoots.find((entry) => entry.root === '囗(框)') : undefined)
    ?? (ROOT_GLYPH_ALIASES[glyph] ? orderedRoots.find((entry) => entry.root === ROOT_GLYPH_ALIASES[glyph]) : undefined)
    ?? (isPrivateUseGlyph(glyph) && code ? orderedRoots.find((entry) => entry.code === code) : undefined)
}

function matchesKnownRoot(glyph: string, code: string, knownRoots: RootEntry[]): boolean {
  const required = resolveRootEntry(glyph, code)
  return required
    ? knownRoots.some((root) => root.root === required.root && root.code === required.code)
    : false
}

function isPrivateUseGlyph(glyph: string): boolean {
  return Array.from(glyph).some((character) => {
    const point = character.codePointAt(0) ?? 0
    return point >= 0xe000 && point <= 0xf8ff
  })
}

function ruleForRootCount(count: number): {
  formula: SplitEncoding['formula']
  formulaText: string
  positions: Array<[number, 0 | 1]>
} {
  if (count <= 1) {
    return {
      formula: 'Aa',
      formulaText: '一根：大码 + 小码',
      positions: [[0, 0], [0, 1]],
    }
  }
  if (count === 2) {
    return {
      formula: 'ABb',
      formulaText: '两根：两个大码 + 末根小码',
      positions: [[0, 0], [1, 0], [1, 1]],
    }
  }
  if (count === 3) {
    return {
      formula: 'ABCc',
      formulaText: '三根：三个大码 + 末根小码',
      positions: [[0, 0], [1, 0], [2, 0], [2, 1]],
    }
  }
  if (count === 4) {
    return {
      formula: 'ABCD',
      formulaText: '四根：依次取四个大码',
      positions: [[0, 0], [1, 0], [2, 0], [3, 0]],
    }
  }
  return {
    formula: 'ABCZ',
    formulaText: '五根以上：前三根 + 末根的大码',
    positions: [[0, 0], [1, 0], [2, 0], [count - 1, 0]],
  }
}
