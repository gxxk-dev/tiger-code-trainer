import type { MasteryRecord } from '../types'

const REVIEW_INTERVALS = [10 * 60_000, 24 * 60 * 60_000, 3 * 24 * 60 * 60_000, 7 * 24 * 60 * 60_000, 21 * 24 * 60 * 60_000, 60 * 24 * 60 * 60_000]

export function createMasteryRecord(now = Date.now()): MasteryRecord {
  return {
    level: 0,
    attempts: 0,
    correct: 0,
    streak: 0,
    lapses: 0,
    averageMs: 0,
    lastSeenAt: 0,
    dueAt: now,
  }
}

export function updateMastery(
  current: MasteryRecord | undefined,
  isCorrect: boolean,
  responseMs: number,
  usedHint: boolean,
  now = Date.now(),
): MasteryRecord {
  const base = current ?? createMasteryRecord(now)
  const attempts = base.attempts + 1
  const weightedAverage = base.attempts === 0
    ? responseMs
    : Math.round((base.averageMs * base.attempts + responseMs) / attempts)
  const recalled = isCorrect && !usedHint
  const canIncreaseLevel = recalled
    && base.streak >= 1
    && base.lastSeenAt > 0
    && !isSameLocalDay(base.lastSeenAt, now)
  const nextLevel = recalled
    ? Math.min(base.level + (canIncreaseLevel ? 1 : 0), REVIEW_INTERVALS.length - 1)
    : Math.max(0, base.level - 1)

  return {
    level: nextLevel,
    attempts,
    correct: base.correct + (recalled ? 1 : 0),
    streak: recalled ? base.streak + 1 : 0,
    lapses: base.lapses + (recalled ? 0 : 1),
    averageMs: weightedAverage,
    lastSeenAt: now,
    dueAt: recalled ? now + REVIEW_INTERVALS[nextLevel] : now,
  }
}

export function hasSuccessfulRecall(record: MasteryRecord | undefined): boolean {
  return Boolean(record?.correct)
}

export function masteryPercent(record: MasteryRecord | undefined): number {
  if (!record) return 0
  const levelScore = record.level / (REVIEW_INTERVALS.length - 1)
  const accuracyScore = record.attempts ? record.correct / record.attempts : 0
  return Math.round((levelScore * 0.65 + accuracyScore * 0.35) * 100)
}

export function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? Math.round((sorted[middle - 1] + sorted[middle]) / 2)
    : sorted[middle]
}

export function calculateAccuracy(expected: string, actual: string): number {
  const expectedChars = Array.from(expected)
  const actualChars = Array.from(actual)
  if (expectedChars.length === 0) return 100
  let matches = 0
  for (let index = 0; index < expectedChars.length; index += 1) {
    if (expectedChars[index] === actualChars[index]) matches += 1
  }
  return Math.round((matches / Math.max(expectedChars.length, actualChars.length, 1)) * 100)
}

function isSameLocalDay(left: number, right: number): boolean {
  const leftDate = new Date(left)
  const rightDate = new Date(right)
  return leftDate.getFullYear() === rightDate.getFullYear()
    && leftDate.getMonth() === rightDate.getMonth()
    && leftDate.getDate() === rightDate.getDate()
}
