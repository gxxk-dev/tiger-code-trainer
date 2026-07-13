import type { ProgressState } from '../types'

export function hasCompletedStage(progress: ProgressState, stageId: string): boolean {
  return Boolean(progress.completedStages[stageId]
    || progress.sessions.some((session) => session.stageId === stageId))
}
