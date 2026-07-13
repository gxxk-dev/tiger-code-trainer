import { characters } from '../data/characters.generated'
import { orderedRoots, splitExamples } from '../data/curriculum'
import type { ProgressState, TrainingRequest } from '../types'
import { characterId, rootId, shortcutId, splitId } from './items'

const FORMULA_LESSON_ID = 'lesson:formula'
const SHORTCUT_LESSON_PREFIX = 'lesson:shortcut:'

export function shortcutLessonId(itemId: string): string {
  return `${SHORTCUT_LESSON_PREFIX}${itemId}`
}

export function lessonIdsForRequest(request: TrainingRequest, progress: ProgressState): string[] {
  if (request.kind === 'review') return []
  if (request.kind === 'formula') {
    const completed = progress.sessions.some((session) => session.kind === 'formula' && (!request.stageId || session.stageId === request.stageId))
    return completed ? [] : [FORMULA_LESSON_ID]
  }
  if (request.kind === 'article') {
    const id = `lesson:article:${request.articleId ?? 'default'}`
    return progress.learned[id] ? [] : [id]
  }

  const requestedIds = request.itemIds?.length
    ? request.itemIds
    : defaultItemIds(request, progress)
  const lessonIds = request.stageId === 'shortcuts'
    ? requestedIds.map(shortcutLessonId)
    : requestedIds
  return lessonIds.filter((id) => {
    if (!progress.learned[id]) return true
    if (request.stageId === 'shortcuts') return !progress.mastery[shortcutId(sourceItemId(id))]
    return !progress.mastery[sourceItemId(id)]
  })
}

export function sourceItemId(lessonId: string): string {
  return lessonId.startsWith(SHORTCUT_LESSON_PREFIX)
    ? lessonId.slice(SHORTCUT_LESSON_PREFIX.length)
    : lessonId
}

export function shouldShowLesson(request: TrainingRequest, progress: ProgressState): boolean {
  return lessonIdsForRequest(request, progress).length > 0
}

function defaultItemIds(request: TrainingRequest, progress: ProgressState): string[] {
  if (request.kind === 'roots') return orderedRoots.slice(0, progress.settings.newItemsPerRound).map(rootId)
  if (request.kind === 'characters') return characters.slice(0, progress.settings.newItemsPerRound).map(characterId)
  if (request.kind === 'splits') return splitExamples.slice(0, progress.settings.newItemsPerRound).map(splitId)
  return []
}
