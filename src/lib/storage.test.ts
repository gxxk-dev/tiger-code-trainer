import { describe, expect, it } from 'vitest'
import { createMasteryRecord } from './mastery'
import { createInitialProgress, migrateProgress } from './storage'

describe('progress storage', () => {
  it('creates a beginner progress record with separate lesson state', () => {
    const progress = createInitialProgress()

    expect(progress.version).toBe(2)
    expect(progress.onboardingComplete).toBe(false)
    expect(progress.learned).toEqual({})
    expect(progress.mastery).toEqual({})
    expect(progress.settings.newItemsPerRound).toBe(5)
  })

  it('migrates v1 progress without losing mastery, sessions, or settings', () => {
    const mastery = { 'root:fi:一': createMasteryRecord(1234) }
    const sessions = [{
      id: 'legacy-session',
      kind: 'roots' as const,
      stageId: 'strokes',
      finishedAt: 1234,
      durationSeconds: 60,
      attempted: 5,
      correct: 5,
      firstTryCorrect: 5,
      medianMs: 800,
    }]
    const migrated = migrateProgress({
      version: 1,
      createdAt: 1000,
      mastery,
      sessions: [{ ...sessions[0], stageId: 'roots' }],
      settings: { theme: 'dark', dailyMinutes: 20, newItemsPerRound: 8 },
    })

    expect(migrated).toMatchObject({ version: 2, createdAt: 1000, mastery, onboardingComplete: true })
    expect(migrated?.sessions[0]).toMatchObject({ id: 'legacy-session', stageId: 'roots' })
    expect(migrated?.learned['root:fi:一']).toBeDefined()
    expect(migrated?.settings).toMatchObject({ theme: 'dark', dailyMinutes: 20, newItemsPerRound: 8 })
    expect(migrated?.settings.autoAdvance).toBe(true)
  })

  it('rejects unsupported or malformed progress', () => {
    expect(migrateProgress(null)).toBeNull()
    expect(migrateProgress({ version: 9, mastery: {}, settings: {} })).toBeNull()
    expect(migrateProgress({ version: 2, settings: {} })).toBeNull()
  })

  it('keeps an empty v1 record in onboarding', () => {
    const migrated = migrateProgress({ version: 1, mastery: {}, sessions: [], settings: {} })
    expect(migrated?.onboardingComplete).toBe(false)
  })
})
