import { describe, expect, it } from 'vitest'
import { basicStrokes } from '../data/curriculum'
import { characters } from '../data/characters.generated'
import { createInitialProgress } from './storage'
import { characterId, dueItemIds, getItemLabel, rootId, shortcutId } from './items'
import { lessonIdsForRequest, practiceItemIdsForLesson, shortcutLessonId, shouldShowLesson, SPLIT_RULES_LESSON_ID } from './lessons'
import { updateMastery } from './mastery'

describe('learn before practice routing', () => {
  it('keeps teaching introduced roots until the learner has actually practised them', () => {
    const progress = createInitialProgress()
    const itemIds = basicStrokes.map((stroke) => rootId(stroke.entry))
    const request = { kind: 'roots' as const, title: '五个基本笔画', itemIds }

    expect(lessonIdsForRequest(request, progress)).toEqual(itemIds)
    expect(shouldShowLesson(request, progress)).toBe(true)
    progress.learned = Object.fromEntries(itemIds.map((id) => [id, 1000]))
    expect(shouldShowLesson(request, progress)).toBe(true)
    expect(progress.mastery).toEqual({})

    progress.mastery = Object.fromEntries(itemIds.map((id) => [id, updateMastery(undefined, true, 900, false, 2000)]))
    expect(shouldShowLesson(request, progress)).toBe(false)
  })

  it('repeats the formula explanation after an interrupted first attempt', () => {
    const progress = createInitialProgress()
    const request = { kind: 'formula' as const, title: '取码公式', stageId: 'formula' }

    progress.learned['lesson:formula'] = 1000
    expect(shouldShowLesson(request, progress)).toBe(true)

    progress.sessions.push({
      id: 'formula-session',
      kind: 'formula',
      stageId: 'formula',
      finishedAt: 2000,
      durationSeconds: 60,
      attempted: 5,
      correct: 5,
      firstTryCorrect: 5,
      medianMs: 900,
    })
    expect(shouldShowLesson(request, progress)).toBe(false)
  })

  it('repeats root teaching after a failed attempt', () => {
    const progress = createInitialProgress()
    const id = rootId(basicStrokes[0].entry)
    const request = { kind: 'roots' as const, title: '基本笔画', itemIds: [id] }
    progress.learned[id] = 1000
    progress.mastery[id] = updateMastery(undefined, false, 1200, false, 2000)

    expect(lessonIdsForRequest(request, progress)).toEqual([id])
  })

  it('never inserts lessons before due review', () => {
    const progress = createInitialProgress()
    const id = rootId(basicStrokes[0].entry)
    expect(shouldShowLesson({ kind: 'review', title: '复习', itemIds: [id] }, progress)).toBe(false)
  })

  it('teaches shortcut codes separately from full character codes', () => {
    const progress = createInitialProgress()
    const character = characters.find((item) => item.short)
    expect(character).toBeDefined()
    const itemId = characterId(character!)
    progress.learned[itemId] = 1000
    const request = { kind: 'characters' as const, title: '简码', stageId: 'shortcuts', itemIds: [itemId] }

    expect(lessonIdsForRequest(request, progress)).toEqual([shortcutLessonId(itemId)])
    progress.learned[shortcutLessonId(itemId)] = 2000
    expect(shouldShowLesson(request, progress)).toBe(true)
    progress.mastery[shortcutId(itemId)] = updateMastery(undefined, true, 800, false, 3000)
    expect(shouldShowLesson(request, progress)).toBe(false)
  })

  it('keeps shortcut items while removing lesson-only markers from practice records', () => {
    const character = characters.find((item) => item.short)!
    const itemId = characterId(character)

    expect(practiceItemIdsForLesson([
      shortcutLessonId(itemId),
      SPLIT_RULES_LESSON_ID,
      'lesson:formula',
      itemId,
    ])).toEqual([itemId, itemId])
  })

  it('queues an incorrect shortcut as a distinct review item', () => {
    const progress = createInitialProgress()
    const character = characters.find((item) => item.short)
    expect(character).toBeDefined()
    const id = shortcutId(character!)
    progress.mastery[id] = updateMastery(undefined, false, 900, false, 3000)

    expect(dueItemIds(progress, 3000)).toContain(id)
    expect(getItemLabel(id)).toEqual({ glyph: character!.char, detail: `简码 ${character!.short}` })
  })

  it('ignores legacy formula answers in the review queue', () => {
    const progress = createInitialProgress()
    const root = rootId(basicStrokes[0].entry)
    progress.mastery[root] = updateMastery(undefined, false, 1000, false, 1000)
    progress.mastery['formula:1'] = updateMastery(undefined, false, 1000, false, 1000)
    progress.mastery['root:zz:missing'] = updateMastery(undefined, false, 1000, false, 1000)

    expect(dueItemIds(progress, 1000)).toEqual([root])
  })
})
