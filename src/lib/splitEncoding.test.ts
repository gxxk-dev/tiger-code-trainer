import { describe, expect, it } from 'vitest'
import { basicStrokes, orderedRoots, splitExamples } from '../data/curriculum'
import { requiredSplits } from '../data/splits.generated'
import type { SplitEntry } from '../types'
import { buildSplitEncoding, displaySplitRootGlyph, formatRootCode, resolveSplitRootCodes, splitUsesOnlyRoots } from './splitEncoding'

describe('split encoding process', () => {
  it('expands a two-root character from roots through ABb to the final code', () => {
    const rest = requiredSplits.find((split) => split.char === '休')
    expect(rest).toBeDefined()

    expect(buildSplitEncoding(rest!)).toMatchObject({
      formula: 'ABb',
      rootCodes: ['jr', 'em'],
      picks: [
        { rootIndex: 0, codeIndex: 0, letter: 'j' },
        { rootIndex: 1, codeIndex: 0, letter: 'e' },
        { rootIndex: 1, codeIndex: 1, letter: 'm' },
      ],
      derivedCode: 'jem',
    })
  })

  it.each([
    ['禾', 'Aa', 'xh'],
    ['秃', 'ABb', 'xoj'],
    ['华', 'ABCc', 'jvns'],
    ['叕', 'ABCD', 'rrrr'],
    ['颦', 'ABCZ', 'sswn'],
  ])('uses the correct formula for %s', (char, formula, code) => {
    const split = findSplit(char)
    expect(buildSplitEncoding(split)).toMatchObject({ formula, derivedCode: code })
  })

  it('derives every bundled split from concrete two-letter root codes', () => {
    const allSplits = [...splitExamples, ...requiredSplits]
    expect(allSplits).toHaveLength(662)

    for (const split of allSplits) {
      const encoding = buildSplitEncoding(split)
      expect(encoding.rootCodes, split.char).toHaveLength(split.roots.length)
      expect(encoding.rootCodes.every((code) => /^[a-z]{2}$/.test(code)), split.char).toBe(true)
      expect(encoding.derivedCode, split.char).toBe(split.code)
    }
  })

  it('keeps generated root codes available on retry questions', () => {
    const split = findSplit('休')
    const retry = { ...split, note: `重试：${split.note}` }
    expect(resolveSplitRootCodes(retry)).toEqual(['jr', 'em'])
  })

  it('keeps explicit official codes for display-only roots in hand-picked examples', () => {
    expect(resolveSplitRootCodes(findSplit('颦'))).toEqual(['si', 'si', 'wy', 'ub', 'tp', 'ns'])
    expect(findSplit('廷').roots).toEqual(['丿', '士', '廴'])
    expect(resolveSplitRootCodes(findSplit('廷'))).toEqual(['tp', 'gs', 'uy'])
  })

  it('formats root codes as uppercase big code plus lowercase small code', () => {
    expect(formatRootCode('jr')).toBe('Jr')
  })

  it('does not mistake a different same-code root for a learned root', () => {
    const learnedStrokes = basicStrokes.map((stroke) => stroke.entry)
    const soldier = orderedRoots.find((root) => root.root === '士')
    expect(soldier).toBeDefined()

    expect(splitUsesOnlyRoots(findSplit('刁'), learnedStrokes)).toBe(true)
    expect(splitUsesOnlyRoots(findSplit('壬'), learnedStrokes)).toBe(false)
    expect(splitUsesOnlyRoots(findSplit('壬'), [...learnedStrokes, soldier!])).toBe(true)
  })

  it('resolves ambiguous private-use variants to the correct same-code root', () => {
    const guard = findSplit('卫')
    const horizontal = orderedRoots.find((root) => root.root === '一')
    const metal = orderedRoots.find((root) => root.root === '金')
    const seal = orderedRoots.find((root) => root.root === '卩')
    expect(horizontal && metal && seal).toBeDefined()

    expect(displaySplitRootGlyph(guard.roots[0], 'zj')).toBe('卩')
    expect(splitUsesOnlyRoots(guard, [metal!, horizontal!])).toBe(false)
    expect(splitUsesOnlyRoots(guard, [seal!, horizontal!])).toBe(true)
  })
})

function findSplit(char: string): SplitEntry {
  const split = splitExamples.find((entry) => entry.char === char)
    ?? requiredSplits.find((entry) => entry.char === char)
  if (!split) throw new Error(`Missing split fixture: ${char}`)
  return split
}
