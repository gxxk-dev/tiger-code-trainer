import type { ProgressState } from '../types'

export const STORAGE_KEY = 'tiger-flow-progress-v1'

export function createInitialProgress(): ProgressState {
  return {
    version: 1,
    createdAt: Date.now(),
    mastery: {},
    sessions: [],
    settings: {
      theme: 'system',
      dailyMinutes: 10,
      newItemsPerRound: 8,
      autoAdvance: true,
      autoAdvanceDelay: 700,
      reducedMotion: false,
    },
  }
}

export function loadProgress(): ProgressState {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (!saved) return createInitialProgress()
    const parsed = JSON.parse(saved) as ProgressState
    if (parsed.version !== 1) return createInitialProgress()
    return {
      ...parsed,
      settings: {
        ...createInitialProgress().settings,
        ...parsed.settings,
      },
    }
  } catch {
    return createInitialProgress()
  }
}

export function saveProgress(progress: ProgressState): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
}

export function exportProgress(progress: ProgressState): void {
  const blob = new Blob([JSON.stringify(progress, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `tiger-flow-${new Date().toISOString().slice(0, 10)}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}

export async function importProgress(file: File): Promise<ProgressState> {
  const parsed = JSON.parse(await file.text()) as ProgressState
  if (parsed.version !== 1 || !parsed.mastery || !parsed.settings) {
    throw new Error('这不是有效的虎序进度文件。')
  }
  return parsed
}
