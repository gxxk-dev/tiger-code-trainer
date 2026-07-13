import { useCallback, useEffect, useState } from 'react'
import type { AppSettings, ProgressState, SessionRecord } from '../types'
import { updateMastery } from '../lib/mastery'
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
      sessions: [...current.sessions, session].slice(-500),
    }))
  }, [])

  const skipOnboarding = useCallback(() => {
    setProgress((current) => ({ ...current, onboardingComplete: true }))
  }, [])

  const markLearned = useCallback((itemIds: string[]) => {
    if (!itemIds.length) return
    setProgress((current) => {
      const learnedAt = Date.now()
      return {
        ...current,
        learned: {
          ...current.learned,
          ...Object.fromEntries(itemIds.map((id) => [id, learnedAt])),
        },
      }
    })
  }, [])

  const updateSettings = useCallback((settings: Partial<AppSettings>) => {
    setProgress((current) => {
      const next = {
        ...current,
        settings: { ...current.settings, ...settings },
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
