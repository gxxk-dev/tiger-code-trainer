import { describe, expect, it } from 'vitest'
import { characters } from './characters.generated'
import { lookupCharacters } from './lookup.generated'
import { roots } from './roots.generated'
import { requiredSplits } from './splits.generated'
import { basicStrokes } from './curriculum'

describe('generated Tiger Code data', () => {
  it('contains the official learning sets without duplicate identities', () => {
    expect(roots).toHaveLength(241)
    expect(characters).toHaveLength(1500)
    expect(lookupCharacters).toHaveLength(5000)
    expect(requiredSplits).toHaveLength(632)
    expect(new Set(characters.map((entry) => entry.char)).size).toBe(1500)
    expect(new Set(requiredSplits.map((entry) => entry.char)).size).toBe(632)
  })

  it('keeps canonical codes and root codes internally consistent', () => {
    expect(roots.every((root) => /^[a-z]{2}$/.test(root.code))).toBe(true)
    expect(characters.every((entry) => /^[a-z]{1,4}$/.test(entry.code))).toBe(true)
    expect(requiredSplits.every((entry) => entry.roots.length > 0 && /^[a-z]{2,4}$/.test(entry.code))).toBe(true)

    const hua = lookupCharacters.find((entry) => entry.char === '华')
    expect(hua).toMatchObject({ code: 'jvns', rootCodes: ['Jr', 'Vb', 'Ns'] })
  })

  it('uses the exact five basic strokes in the first lesson', () => {
    expect(basicStrokes.map(({ name, glyph, code }) => [name, glyph, code])).toEqual([
      ['横', '一', 'fi'],
      ['竖', '丨', 'gs'],
      ['撇', '丿', 'tp'],
      ['点/捺', '丶', 'id'],
      ['折', '㇆', 'ae'],
    ])
  })
})
