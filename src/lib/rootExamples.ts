import { requiredSplits } from '../data/splits.generated'
import type { RootEntry } from '../types'

export interface RootExamplePart {
  glyph: string
  code: string
  target: boolean
  fallback?: boolean
}

export interface RootApplicationExample {
  char: string
  code: string
  parts: RootExamplePart[]
}

const splitByCharacter = new Map(requiredSplits.map((entry) => [entry.char, entry]))

export function rootExampleCharacters(root: RootEntry): string[] {
  const rootGlyphs = rootGlyphSet(root)
  return Array.from(new Set(root.examples.flatMap((group) => Array.from(group))))
    .filter((glyph) => !rootGlyphs.has(glyph))
}

export function getRootApplicationExample(root: RootEntry): RootApplicationExample | undefined {
  const rootGlyphs = rootGlyphSet(root)
  for (const char of rootExampleCharacters(root).filter((glyph) => splitByCharacter.has(glyph))) {
    const entry = splitByCharacter.get(char)
    if (!entry?.rootCodes || entry.roots.length !== entry.rootCodes.length) continue
    const rootCodes = entry.rootCodes

    const exactIndex = entry.roots.findIndex((glyph, index) =>
      rootGlyphs.has(glyph) && rootCodes[index]?.toLowerCase() === root.code,
    )
    const codeIndex = rootCodes.findIndex((code) => code.toLowerCase() === root.code)
    const targetIndex = exactIndex >= 0 ? exactIndex : codeIndex
    if (targetIndex < 0) continue
    if (isPrivateUseGlyph(entry.roots[targetIndex])) continue

    return {
      char,
      code: entry.code,
      parts: entry.roots.map((glyph, index) => ({
        glyph,
        code: rootCodes[index].toLowerCase(),
        target: index === targetIndex,
        ...(isPrivateUseGlyph(glyph) ? { fallback: true } : {}),
      })),
    }
  }

  if (!isPrivateUseGlyph(root.root) && root.examples.some((group) => Array.from(group).includes(root.root))) {
    return {
      char: root.root,
      code: root.code,
      parts: [{ glyph: root.root, code: root.code, target: true }],
    }
  }
  return undefined
}

export function hasUnrenderableRootExample(root: RootEntry): boolean {
  for (const char of rootExampleCharacters(root).filter((glyph) => splitByCharacter.has(glyph))) {
    const entry = splitByCharacter.get(char)
    if (!entry?.rootCodes || entry.roots.length !== entry.rootCodes.length) continue
    const targetIndex = entry.rootCodes.findIndex((code) => code.toLowerCase() === root.code)
    if (targetIndex >= 0 && isPrivateUseGlyph(entry.roots[targetIndex])) return true
  }
  return false
}

function isPrivateUseGlyph(glyph: string): boolean {
  return Array.from(glyph).some((character) => {
    const point = character.codePointAt(0) ?? 0
    return point >= 0xe000 && point <= 0xf8ff
  })
}

function rootGlyphSet(root: RootEntry): Set<string> {
  return new Set([
    root.root,
    ...(root.root === '囗(框)' ? ['囗'] : []),
    ...Array.from(root.variants ?? ''),
  ])
}
