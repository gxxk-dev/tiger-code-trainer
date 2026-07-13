import { describe, expect, it } from 'vitest'
import {
  calculateAccuracy,
  createMasteryRecord,
  masteryPercent,
  median,
  updateMastery,
} from './mastery'

describe('mastery model', () => {
  it('requires repeated recall before increasing the review level', () => {
    const start = 1_000_000
    const first = updateMastery(createMasteryRecord(start), true, 1200, false, start)
    const second = updateMastery(first, true, 900, false, start + 1000)

    expect(first.level).toBe(0)
    expect(first.dueAt).toBeGreaterThan(start)
    expect(second.level).toBe(1)
    expect(second.streak).toBe(2)
    expect(second.dueAt).toBeGreaterThan(start + 1000)
  })

  it('does not count a revealed answer as mastered', () => {
    const record = updateMastery(undefined, true, 2500, true, 1000)

    expect(record.correct).toBe(0)
    expect(record.lapses).toBe(1)
    expect(record.streak).toBe(0)
    expect(masteryPercent(record)).toBe(0)
  })

  it('calculates stable medians and unicode accuracy', () => {
    expect(median([500, 100, 300, 200])).toBe(250)
    expect(calculateAccuracy('虎码输入', '虎马输入')).toBe(75)
    expect(calculateAccuracy('𠮷野家', '𠮷野家')).toBe(100)
  })
})
