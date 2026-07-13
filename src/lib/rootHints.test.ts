import { describe, expect, it } from 'vitest'
import { basicStrokes } from '../data/curriculum'
import { roots } from '../data/roots.generated'
import { displayRootGlyph, getItemLabel } from './items'
import { getRootMemoryHint, getRootPhoneticRule, ROOT_KEY_ANCHORS } from './rootHints'

describe('root memory hints', () => {
  it('keeps the official pronunciation and phonetic-rule distribution', () => {
    expect(roots.find((root) => root.root === '人')?.pronunciation).toBe('rén')
    expect(roots.find((root) => root.root === '一')?.pronunciation).toBe('yī')
    expect(roots.find((root) => root.root === '鱼')?.pronunciation).toBe('yú')

    const counts = roots.reduce<Record<string, number>>((result, root) => {
      const rule = getRootPhoneticRule(root)
      result[rule] = (result[rule] ?? 0) + 1
      return result
    }, {})

    expect(counts).toEqual({ initial: 201, final: 35, 'umlaut-v': 5 })
    expect(getRootMemoryHint(roots.find((root) => root.root === '儿')!).secondaryCue).toBe('小码 e · 取 ér 的韵母字母')
    expect(getRootMemoryHint(roots.find((root) => root.root === '丨')!).secondaryCue).toBe('小码 s · 取 shù 声母的首字母')
  })

  it('provides a renderable, code-specific hint for every root', () => {
    expect(roots).toHaveLength(241)
    expect(Object.keys(ROOT_KEY_ANCHORS)).toHaveLength(26)

    for (const [key, anchor] of Object.entries(ROOT_KEY_ANCHORS)) {
      expect(roots.some((root) => root.root === anchor && root.code[0] === key)).toBe(true)
    }

    for (const root of roots) {
      const hint = getRootMemoryHint(root)
      expect(hint.mnemonic.length).toBeGreaterThan(10)
      expect(hint.compactCue).toContain(`${root.code[0].toUpperCase()} 键`)
      expect(hint.compactCue).toContain(`${root.code[1]} ←`)
      expect(hint.primaryCue).toContain(`大码 ${root.code[0].toUpperCase()}`)
      expect(hint.secondaryCue).toContain(`小码 ${root.code[1]}`)
    }
  })

  it('uses fixed learning associations for the first five strokes', () => {
    expect(basicStrokes.map((stroke) => ({
      code: stroke.code,
      hint: getRootMemoryHint(stroke.entry).mnemonic,
    }))).toEqual([
      { code: 'fi', hint: 'F 键先绑定平横“一”；Flat 帮你找 f，i 来自 yī 的韵母。' },
      { code: 'gs', hint: 'G 键先绑定竖；想象一根“钢丝”竖直垂下，s 也来自 shù。' },
      { code: 'tp', hint: 'T 键先绑定撇；从大写 T 顶端斜撇下来，p 来自 piě。' },
      { code: 'id', hint: 'I 键先绑定点/捺；小写 i 顶上就是一点，d 来自 diǎn。' },
      { code: 'ae', hint: 'A 键先绑定折；Angle 提醒折角，e 来自 zhé 的韵母。' },
    ])
  })

  it('uses key anchors and exact-code partners for fallback hints', () => {
    const missing = roots.find((root) => root.root === '欠')!
    const plate = roots.find((root) => root.root === '皿')!

    expect(getRootMemoryHint(missing)).toMatchObject({
      primaryCue: expect.stringContaining('和“木”同键'),
      secondaryCue: '小码 q · 取 qiàn 声母的首字母',
    })
    expect(getRootMemoryHint(plate).mnemonic).toContain('“门”完全同码')
  })

  it('avoids self-referential examples and replaces unsupported root glyphs', () => {
    for (const root of roots) {
      expect(getRootMemoryHint(root).mnemonic).not.toContain(`例字“${root.root}”`)
    }

    expect(displayRootGlyph('')).toBe('𠂎')
    expect(getItemLabel('root:bk:').glyph).toBe('𠂎')
    expect(getRootMemoryHint(roots.find((root) => root.root === '')!).mnemonic).not.toContain('')
    expect(displayRootGlyph('囗(框)')).toBe('囗')
  })
})
