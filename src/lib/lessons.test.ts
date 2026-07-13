import { describe, expect, it } from 'vitest'
import { basicStrokes } from '../data/curriculum'
import { characters } from '../data/characters.generated'
import { createInitialProgress } from './storage'
import { characterId, dueItemIds, rootId } from './items'
import { lessonIdsForRequest, shortcutLessonId, shouldShowLesson } from './lessons'
import { updateMastery } from './mastery'

describe('learn before practice routing', () => {
  it('shows a lesson for unseen roots and skips it after they are introduced', () => {
    const progress = createInitialProgress()
    const itemIds = basicStrokes.map((stroke) => rootId(stroke.entry))
    const request = { kind: 'roots' as const, title: '五个基本笔画', itemIds }

    expect(lessonIdsForRequest(request, progress)).toEqual(itemIds)
    expect(shouldShowLesson(request, progress)).toBe(true)
    progress.learned = Object.fromEntries(itemIds.map((id) => [id, 1000]))
    expect(shouldShowLesson(request, progress)).toBe(false)
    expect(progress.mastery).toEqual({})
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
    expect(shouldShowLesson(request, progress)).toBe(false)
  })

  it('ignores legacy formula answers in the review queue', () => {
    const progress = createInitialProgress()
    const root = rootId(basicStrokes[0].entry)
    progress.mastery[root] = updateMastery(undefined, false, 1000, false, 1000)
    progress.mastery['formula:1'] = updateMastery(undefined, false, 1000, false, 1000)

    expect(dueItemIds(progress, 1000)).toEqual([root])
  })
})
