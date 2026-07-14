import { describe, expect, it } from 'vitest'
import { orderedRoots } from '../data/curriculum'
import type { MasteryRecord, ProgressState, SessionRecord } from '../types'
import { buildDailyPlan, buildDeepDiveRequest, localDateKey } from './dailyPlan'
import { rootId } from './items'
import { createInitialProgress } from './storage'

const now = new Date(2026, 6, 14, 9, 0, 0).getTime()

describe('daily training planner', () => {
  it('starts a beginner with the only prerequisite lesson', () => {
    const plan = buildDailyPlan(createInitialProgress(), now)

    expect(plan.nextRequest).toMatchObject({
      kind: 'roots',
      stageId: 'strokes',
      origin: 'daily',
      planDate: localDateKey(now),
      segment: 'foundation',
    })
    expect(plan.ctaLabel).toBe('开始第 1 课')
  })

  it('finishes a foundation day before adding another concept', () => {
    const progress = readyProgress()
    progress.sessions = [dailySession({ stageId: 'formula', segment: 'foundation', attempted: 5 })]

    const plan = buildDailyPlan(progress, now)

    expect(plan.complete).toBe(true)
    expect(plan.nextRequest).toBeUndefined()
    expect(plan.headline).toBe('今天到这里刚好')
  })

  it('reviews due content before introducing anything new and chunks at twelve', () => {
    const progress = readyProgress()
    const dueIds = orderedRoots.slice(0, 13).map(rootId)
    progress.mastery = Object.fromEntries(dueIds.map((id, index) => [id, mastery(now - 1_000 - index)]))

    const plan = buildDailyPlan(progress, now)

    expect(plan.nextRequest).toMatchObject({ kind: 'review', segment: 'review' })
    expect(plan.nextRequest?.itemIds).toEqual(dueIds.toReversed().slice(0, 12))
    expect(plan.introduced).toBe(0)
  })

  it('uses the daily budget as a soft stop after a review-heavy day', () => {
    const progress = readyProgress()
    progress.sessions.push(dailySession({ segment: 'review', attempted: 24 }))

    const plan = buildDailyPlan(progress, now)

    expect(plan.complete).toBe(true)
    expect(plan.newLimit).toBe(0)
    expect(plan.nextRequest).toBeUndefined()
  })

  it('learns one bounded pack and then moves to an application round', () => {
    const progress = readyProgress()
    const learning = buildDailyPlan(progress, now)

    expect(learning.nextRequest).toMatchObject({ kind: 'roots', segment: 'learn' })
    expect(learning.nextRequest?.itemIds).toHaveLength(5)

    for (const id of learning.nextRequest?.itemIds ?? []) {
      progress.mastery[id] = mastery(now + 60 * 60_000)
      progress.learned[id] = now
    }
    progress.sessions.push(dailySession({ segment: 'learn', attempted: 5, introduced: 5, learningItems: 5 }))

    const application = buildDailyPlan(progress, now)
    expect(application.nextRequest).toMatchObject({ kind: 'splits', segment: 'apply' })
    expect(application.nextRequest?.itemIds?.length).toBeGreaterThan(0)
    expect(application.nextRequest?.itemIds?.length).toBeLessThanOrEqual(3)
  })

  it('does not skip a learned root that only has failed attempts', () => {
    const progress = readyProgress()
    const firstRoot = orderedRoots.find((root) => !['fi', 'gs', 'tp', 'id', 'ae'].includes(root.code))!
    const id = rootId(firstRoot)
    progress.learned[id] = now - 60_000
    progress.mastery[id] = {
      ...mastery(now),
      correct: 0,
      lapses: 1,
    }

    expect(buildDailyPlan(progress, now).nextRequest?.itemIds?.[0]).toBe(id)
  })

  it('reduces tomorrow new content after an extra learning load', () => {
    const progress = readyProgress()
    const dueIds = orderedRoots.slice(0, 19).map(rootId)
    progress.mastery = Object.fromEntries(dueIds.map((id) => [id, mastery(now)]))
    progress.sessions.push(dailySession({ segment: 'extra', attempted: 8, introduced: 8 }))

    const plan = buildDailyPlan(progress, now)

    expect(plan.dueCount).toBe(19)
    expect(plan.newLimit).toBe(2)
    expect(plan.extraIntroduced).toBe(8)
    expect(plan.forecastNewLimit).toBe(2)
  })

  it('resets the daily ledger at local midnight while keeping due reviews', () => {
    const progress = readyProgress()
    const yesterday = new Date(2026, 6, 13, 23, 50, 0).getTime()
    progress.sessions.push({
      ...dailySession({ segment: 'apply', attempted: 8 }),
      planDate: localDateKey(yesterday),
      finishedAt: yesterday,
    })
    const dueId = rootId(orderedRoots[6])
    progress.mastery[dueId] = mastery(now)

    const plan = buildDailyPlan(progress, now)

    expect(plan.attempted).toBe(0)
    expect(plan.complete).toBe(false)
    expect(plan.nextRequest).toMatchObject({ kind: 'review', itemIds: [dueId] })
  })

  it('reserves a full day for imminent reviews and orders them by due time', () => {
    const progress = readyProgress()
    const ids = orderedRoots.slice(5, 29).map(rootId)
    progress.mastery = Object.fromEntries(ids.map((id, index) => [
      id,
      mastery(now + (24 - index) * 60 * 60_000, now - 24 * 60 * 60_000),
    ]))

    const plan = buildDailyPlan(progress, now)

    expect(plan.dueCount).toBe(0)
    expect(plan.newLimit).toBe(0)
    expect(plan.complete).toBe(false)
    expect(plan.nextRequest).toMatchObject({ kind: 'review', title: '即将到期复习', segment: 'review' })
    expect(plan.nextRequest?.itemIds).toEqual(ids.toReversed().slice(0, 12))
  })

  it('advances from roots to splits instead of returning an empty request', () => {
    const progress = readyProgress()
    for (const root of orderedRoots) progress.mastery[rootId(root)] = mastery(now + 60 * 60_000)

    const plan = buildDailyPlan(progress, now)

    expect(plan.position.stage.id).toBe('splits')
    expect(plan.nextRequest).toMatchObject({ kind: 'splits', stageId: 'splits', segment: 'learn' })
    expect(plan.nextRequest?.itemIds?.length).toBeGreaterThan(0)
  })

  it('counts a resumed lesson from yesterday against today workload', () => {
    const progress = readyProgress()
    const first = buildDailyPlan(progress, now)
    const resumedIds = first.nextRequest?.itemIds ?? []
    progress.learned = Object.fromEntries(resumedIds.map((id) => [id, now - 24 * 60 * 60_000]))

    const resumed = buildDailyPlan(progress, now)
    expect(resumed.nextRequest?.itemIds).toEqual(resumedIds)

    for (const id of resumedIds) progress.mastery[id] = mastery(now + 60 * 60_000)
    progress.sessions.push(dailySession({
      segment: 'learn',
      attempted: resumedIds.length,
      introduced: 0,
      learningItems: resumedIds.length,
    }))

    const application = buildDailyPlan(progress, now)
    expect(application.introduced).toBe(resumedIds.length)
    expect(application.nextRequest?.segment).toBe('apply')
  })

  it('applies the split items resumed from yesterday before introducing more', () => {
    const progress = readyProgress()
    for (const root of orderedRoots) progress.mastery[rootId(root)] = mastery(now + 60 * 60_000)
    const splitRequest = buildDailyPlan(progress, now).nextRequest
    const resumedIds = splitRequest?.itemIds ?? []
    expect(resumedIds).toHaveLength(5)

    for (const id of resumedIds) {
      progress.learned[id] = now - 24 * 60 * 60_000
      progress.mastery[id] = mastery(now + 60 * 60_000)
      progress.sessions.push(dailySession({
        kind: 'splits',
        segment: 'learn',
        attempted: 1,
        introduced: 0,
        learningItems: 1,
        itemIds: [id],
      }))
    }

    const application = buildDailyPlan(progress, now)
    expect(application.nextRequest).toMatchObject({ kind: 'splits', segment: 'apply' })
    expect(application.nextRequest?.itemIds).toEqual(resumedIds.slice(0, 3))
  })

  it('keeps manual course sessions out of the daily budget', () => {
    const progress = readyProgress()
    progress.sessions.push({ ...dailySession({ segment: undefined, attempted: 99 }), origin: undefined, planDate: undefined })

    const plan = buildDailyPlan(progress, now)

    expect(plan.attempted).toBe(0)
    expect(plan.complete).toBe(false)
  })

  it('keeps permanent stage milestones after old session logs are trimmed', () => {
    const progress = readyProgress()
    progress.sessions = []
    progress.completedStages.formula = now - 30 * 24 * 60 * 60_000

    const plan = buildDailyPlan(progress, now)

    expect(plan.nextRequest).toMatchObject({ kind: 'roots', segment: 'learn' })
    expect(plan.position.stage.id).toBe('roots')
  })

  it('offers a deliberate extra round after the normal plan is complete', () => {
    const progress = readyProgress()
    progress.sessions.push(dailySession({ segment: 'apply', attempted: 12 }))

    expect(buildDailyPlan(progress, now).complete).toBe(true)
    expect(buildDeepDiveRequest(progress, now)).toMatchObject({ origin: 'daily', segment: 'extra' })
  })
})

function readyProgress(): ProgressState {
  const progress = createInitialProgress()
  progress.onboardingComplete = true
  progress.sessions.push({
    id: 'formula',
    kind: 'formula',
    stageId: 'formula',
    finishedAt: now - 24 * 60 * 60_000,
    durationSeconds: 60,
    attempted: 5,
    correct: 5,
    firstTryCorrect: 5,
    medianMs: 500,
  })
  return progress
}

function dailySession(overrides: Partial<SessionRecord>): SessionRecord {
  return {
    id: crypto.randomUUID(),
    kind: 'roots',
    finishedAt: now,
    durationSeconds: 60,
    attempted: 0,
    correct: 0,
    firstTryCorrect: 0,
    medianMs: 0,
    origin: 'daily',
    planDate: localDateKey(now),
    ...overrides,
  }
}

function mastery(dueAt: number, lastSeenAt = now): MasteryRecord {
  return {
    level: 1,
    attempts: 1,
    correct: 1,
    streak: 1,
    lapses: 0,
    averageMs: 500,
    lastSeenAt,
    dueAt,
  }
}
