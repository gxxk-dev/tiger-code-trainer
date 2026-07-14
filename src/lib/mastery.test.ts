import { describe, expect, it } from 'vitest'
import {
  calculateAccuracy,
  createMasteryRecord,
  hasSuccessfulRecall,
  masteryPercent,
  median,
  updateMastery,
} from './mastery'

describe('mastery model', () => {
  it('requires recall on another day before increasing the review level', () => {
    const start = new Date(2026, 6, 14, 9, 0, 0).getTime()
    const first = updateMastery(createMasteryRecord(start), true, 1200, false, start)
    const sameDay = updateMastery(first, true, 900, false, start + 1000)
    const nextDay = updateMastery(sameDay, true, 800, false, start + 24 * 60 * 60_000)

    expect(first.level).toBe(0)
    expect(masteryPercent(first)).toBe(35)
    expect(first.dueAt).toBeGreaterThan(start)
    expect(sameDay.level).toBe(0)
    expect(sameDay.streak).toBe(2)
    expect(nextDay.level).toBe(1)
    expect(nextDay.streak).toBe(3)
    expect(nextDay.dueAt).toBeGreaterThan(start + 24 * 60 * 60_000)
  })

  it('does not count a revealed answer as mastered', () => {
    const record = updateMastery(undefined, true, 2500, true, 1000)

    expect(record.correct).toBe(0)
    expect(record.lapses).toBe(1)
    expect(record.streak).toBe(0)
    expect(masteryPercent(record)).toBe(0)
    expect(hasSuccessfulRecall(record)).toBe(false)
  })

  it('only treats an unassisted correct answer as acquired', () => {
    const failed = updateMastery(undefined, false, 1200, false, 1000)
    const recalled = updateMastery(failed, true, 900, false, 2000)

    expect(hasSuccessfulRecall(undefined)).toBe(false)
    expect(hasSuccessfulRecall(failed)).toBe(false)
    expect(hasSuccessfulRecall(recalled)).toBe(true)
  })

  it('calculates stable medians and unicode accuracy', () => {
    expect(median([500, 100, 300, 200])).toBe(250)
    expect(calculateAccuracy('虎码输入', '虎马输入')).toBe(75)
    expect(calculateAccuracy('𠮷野家', '𠮷野家')).toBe(100)
  })
})
