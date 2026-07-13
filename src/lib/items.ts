import { characters } from '../data/characters.generated'
import { orderedRoots, splitExamples } from '../data/curriculum'
import { requiredSplits } from '../data/splits.generated'
import type { CharacterEntry, ProgressState, RootEntry, SplitEntry } from '../types'

export function rootId(root: RootEntry): string {
  return `root:${root.code}:${root.root}`
}

export function characterId(character: CharacterEntry): string {
  return `char:${character.char}`
}

export function shortcutId(character: CharacterEntry | string): string {
  const id = typeof character === 'string' ? character : characterId(character)
  return `shortcut:${id}`
}

export function splitId(split: SplitEntry): string {
  return `split:${split.char}`
}

export function dueItemIds(progress: ProgressState, now = Date.now()): string[] {
  return Object.entries(progress.mastery)
    .filter(([id, record]) => isReviewableId(id) && isResolvableItemId(id) && record.attempts > 0 && record.dueAt <= now)
    .sort(([, left], [, right]) => left.dueAt - right.dueAt)
    .map(([id]) => id)
}

export function weakItemIds(progress: ProgressState): string[] {
  return Object.entries(progress.mastery)
    .filter(([id, record]) => isReviewableId(id) && isResolvableItemId(id) && record.attempts >= 2 && record.lapses > 0)
    .sort(([, left], [, right]) => {
      const leftAccuracy = left.correct / left.attempts
      const rightAccuracy = right.correct / right.attempts
      return leftAccuracy - rightAccuracy || right.lapses - left.lapses
    })
    .map(([id]) => id)
}

function isReviewableId(id: string): boolean {
  return id.startsWith('root:') || id.startsWith('char:') || id.startsWith('split:') || id.startsWith('shortcut:')
}

export function isResolvableItemId(id: string): boolean {
  if (id.startsWith('root:')) return Boolean(resolveRoot(id))
  if (id.startsWith('char:')) return Boolean(resolveCharacter(id))
  if (id.startsWith('split:')) return Boolean(resolveSplit(id))
  if (id.startsWith('shortcut:')) return Boolean(resolveShortcut(id))
  return false
}

export function newRootIds(progress: ProgressState, count: number): string[] {
  return orderedRoots
    .map(rootId)
    .filter((id) => !progress.mastery[id])
    .slice(0, count)
}

export function newCharacterIds(
  progress: ProgressState,
  count: number,
  band: 1 | 2 | 3 = 1,
): string[] {
  return characters
    .filter((character) => character.band === band)
    .map(characterId)
    .filter((id) => !progress.mastery[id])
    .slice(0, count)
}

export function resolveRoot(id: string): RootEntry | undefined {
  return orderedRoots.find((root) => rootId(root) === id)
}

export function resolveCharacter(id: string): CharacterEntry | undefined {
  return characters.find((character) => characterId(character) === id)
}

export function resolveShortcut(id: string): CharacterEntry | undefined {
  return id.startsWith('shortcut:') ? resolveCharacter(id.slice('shortcut:'.length)) : undefined
}

export function resolveSplit(id: string): SplitEntry | undefined {
  return splitExamples.find((split) => splitId(split) === id)
    ?? requiredSplits.find((split) => splitId(split) === id)
}

export function getItemLabel(id: string): { glyph: string; detail: string } {
  const root = resolveRoot(id)
  if (root) return { glyph: displayRootGlyph(root.root, root.code), detail: `字根 ${root.code}` }
  const character = resolveCharacter(id)
  if (character) return { glyph: character.char, detail: `全码 ${character.code}` }
  const shortcut = resolveShortcut(id)
  if (shortcut) return { glyph: shortcut.char, detail: `简码 ${shortcut.short ?? shortcut.code}` }
  const split = resolveSplit(id)
  if (split) return { glyph: split.char, detail: split.roots.join(' + ') }
  return { glyph: '？', detail: id }
}

export function displayRootGlyph(glyph: string, code?: string): string {
  if (glyph === '') return '𠂎'
  if (glyph === '囗(框)') return '囗'
  const exact = orderedRoots.find((root) => root.root === glyph)
  if (exact) return exact.root
  const variant = orderedRoots.find((root) => Array.from(root.variants ?? '').includes(glyph))
  if (variant) return variant.root
  const normalizedCode = code?.toLowerCase()
  return orderedRoots.find((root) => root.code === normalizedCode)?.root ?? glyph
}

export function countMastered(progress: ProgressState, prefix: string, minimumLevel = 2): number {
  return Object.entries(progress.mastery).filter(
    ([id, record]) => id.startsWith(prefix) && record.level >= minimumLevel,
  ).length
}
