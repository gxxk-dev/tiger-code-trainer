import type { AppSettings, MasteryRecord, ProgressState, SessionRecord } from '../types'

export const STORAGE_KEY = 'tiger-flow-progress-v1'

export function createInitialProgress(): ProgressState {
  return {
    version: 2,
    createdAt: Date.now(),
    onboardingComplete: false,
    learned: {},
    mastery: {},
    sessions: [],
    settings: {
      theme: 'system',
      dailyMinutes: 10,
      newItemsPerRound: 5,
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
    return migrateProgress(JSON.parse(saved)) ?? createInitialProgress()
  } catch {
    return createInitialProgress()
  }
}

export function migrateProgress(value: unknown): ProgressState | null {
  if (!value || typeof value !== 'object') return null
  const candidate = value as {
    version?: number
    createdAt?: number
    onboardingComplete?: boolean
    learned?: Record<string, number>
    mastery?: Record<string, MasteryRecord>
    sessions?: SessionRecord[]
    settings?: Partial<AppSettings>
  }
  if ((candidate.version !== 1 && candidate.version !== 2) || !candidate.mastery || !candidate.settings) return null

  const mastery = candidate.mastery
  const learned = candidate.version === 2 && candidate.learned
    ? candidate.learned
    : Object.fromEntries(Object.entries(mastery).map(([id, record]) => [id, record.lastSeenAt || Date.now()]))

  return {
    version: 2,
    createdAt: typeof candidate.createdAt === 'number' ? candidate.createdAt : Date.now(),
    onboardingComplete: typeof candidate.onboardingComplete === 'boolean'
      ? candidate.onboardingComplete
      : Object.keys(mastery).length > 0 || (candidate.sessions?.length ?? 0) > 0,
    learned,
    mastery,
    sessions: Array.isArray(candidate.sessions) ? candidate.sessions : [],
    settings: {
      ...createInitialProgress().settings,
      ...candidate.settings,
    },
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
  const parsed = migrateProgress(JSON.parse(await file.text()))
  if (!parsed) {
    throw new Error('这不是有效的虎序进度文件。')
  }
  return parsed
}
