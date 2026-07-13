import { useCallback, useEffect, useState } from 'react'
import type { AppSettings, ProgressState, SessionRecord } from '../types'
import { updateMastery } from '../lib/mastery'
import { settingsForIntensity } from '../lib/intensity'
import {
  createInitialProgress,
  importProgress,
  loadProgress,
  saveProgress,
} from '../lib/storage'

export function useProgress() {
  const [progress, setProgress] = useState<ProgressState>(loadProgress)

  useEffect(() => {
    saveProgress(progress)
  }, [progress])

  const recordAnswer = useCallback((
    itemId: string,
    isCorrect: boolean,
    responseMs: number,
    usedHint: boolean,
  ) => {
    setProgress((current) => ({
      ...current,
      mastery: {
        ...current.mastery,
        [itemId]: updateMastery(
          current.mastery[itemId],
          isCorrect,
          responseMs,
          usedHint,
        ),
      },
    }))
  }, [])

  const completeSession = useCallback((session: SessionRecord) => {
    setProgress((current) => ({
      ...current,
      onboardingComplete: current.onboardingComplete || session.stageId === 'strokes',
      completedStages: session.stageId
        ? { ...current.completedStages, [session.stageId]: session.finishedAt }
        : current.completedStages,
      sessions: [...current.sessions, session].slice(-500),
    }))
  }, [])

  const skipOnboarding = useCallback(() => {
    setProgress((current) => ({
      ...current,
      onboardingComplete: true,
      completedStages: { ...current.completedStages, strokes: Date.now() },
    }))
  }, [])

  const markLearned = useCallback((itemIds: string[]) => {
    if (!itemIds.length) return
    setProgress((current) => {
      const learnedAt = Date.now()
      const newIds = itemIds.filter((id) => !current.learned[id])
      if (!newIds.length) return current
      return {
        ...current,
        learned: {
          ...current.learned,
          ...Object.fromEntries(newIds.map((id) => [id, learnedAt])),
        },
      }
    })
  }, [])

  const updateSettings = useCallback((settings: Partial<AppSettings>) => {
    setProgress((current) => {
      const normalized = settings.dailyMinutes
        ? { ...settings, ...settingsForIntensity(settings.dailyMinutes) }
        : settings
      const next = {
        ...current,
        settings: { ...current.settings, ...normalized },
      }
      saveProgress(next)
      return next
    })
  }, [])

  const resetProgress = useCallback(() => {
    const next = createInitialProgress()
    saveProgress(next)
    setProgress(next)
  }, [])

  const restoreProgress = useCallback(async (file: File) => {
    const next = await importProgress(file)
    saveProgress(next)
    setProgress(next)
  }, [])

  return {
    progress,
    recordAnswer,
    markLearned,
    completeSession,
    skipOnboarding,
    updateSettings,
    resetProgress,
    restoreProgress,
  }
}
