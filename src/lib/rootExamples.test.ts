import { describe, expect, it } from 'vitest'
import { orderedRoots } from '../data/curriculum'
import { getRootApplicationExample, hasUnrenderableRootExample, rootExampleCharacters } from './rootExamples'

describe('root examples', () => {
  it('turns grouped official table cells into individual example characters', () => {
    const horizontal = orderedRoots.find((root) => root.root === '一')!

    expect(horizontal.examples).toEqual(['百丞', '刁孑'])
    expect(rootExampleCharacters(horizontal)).toEqual(['百', '丞', '刁', '孑'])
  })

  it('locates the current root inside an example decomposition', () => {
    const horizontal = orderedRoots.find((root) => root.root === '一')!

    expect(getRootApplicationExample(horizontal)).toEqual({
      char: '百',
      code: 'fub',
      parts: [
        { glyph: '一', code: 'fi', target: true },
        { glyph: '白', code: 'ub', target: false },
      ],
    })
  })

  it('does not present a root or variant label as an example character', () => {
    const person = orderedRoots.find((root) => root.root === '人')!

    expect(rootExampleCharacters(person)).toEqual(['仄', '什'])
  })

  it('treats the visible frame glyph as the root label instead of an example', () => {
    const frame = orderedRoots.find((root) => root.root === '囗(框)')!

    expect(rootExampleCharacters(frame)).toEqual(['困'])
    expect(getRootApplicationExample(frame)?.char).toBe('困')
  })

  it('keeps visible variants and never highlights a private-use fallback as the target', () => {
    const bamboo = orderedRoots.find((root) => root.root === '竹')!
    expect(getRootApplicationExample(bamboo)?.parts.find((part) => part.target)?.glyph).toBe('⺮')

    const applications = orderedRoots.flatMap((root) => getRootApplicationExample(root) ?? [])
    expect(applications.length).toBeGreaterThan(230)
    expect(applications.every((example) => example.parts
      .filter((part) => part.target)
      .every((part) => Array.from(part.glyph).every((glyph) => {
        const point = glyph.codePointAt(0) ?? 0
        return point < 0xe000 || point > 0xf8ff
      })))).toBe(true)
  })

  it('shows a standalone character when the whole character is the root', () => {
    const flying = orderedRoots.find((root) => root.root === '飞')!

    expect(getRootApplicationExample(flying)).toEqual({
      char: '飞',
      code: 'cf',
      parts: [{ glyph: '飞', code: 'cf', target: true }],
    })
  })

  it('identifies examples whose target variant cannot be rendered reliably', () => {
    const privateUseRoot = orderedRoots.find((entry) => entry.root === '')!
    expect(getRootApplicationExample(privateUseRoot)).toBeUndefined()
    expect(hasUnrenderableRootExample(privateUseRoot)).toBe(true)

    for (const glyph of ['卅', '臣']) {
      const root = orderedRoots.find((entry) => entry.root === glyph)!
      expect(getRootApplicationExample(root)?.char).toBe(glyph)
      expect(hasUnrenderableRootExample(root)).toBe(true)
    }
  })
})
