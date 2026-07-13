export type ViewId = 'today' | 'course' | 'review' | 'stats' | 'lookup'

export type SessionKind =
  | 'formula'
  | 'roots'
  | 'splits'
  | 'characters'
  | 'article'
  | 'review'

export type FeedbackState = 'idle' | 'correct' | 'incorrect' | 'hint'

export interface RootEntry {
  root: string
  code: string
  variants?: string
  label?: string
  pronunciation: string
  examples: string[]
}

export interface CharacterEntry {
  char: string
  code: string
  short?: string
  rank: number
  band: 1 | 2 | 3
}

export interface CharacterLookupEntry extends CharacterEntry {
  codes: string[]
  decomposition: string
  rootCodes: string[]
  pinyin: string
}

export interface SplitEntry {
  char: string
  roots: string[]
  code: string
  note: string
  rule?: 'order' | 'frame' | 'cut' | 'walk' | 'shape'
}

export interface ArticleEntry {
  id: string
  title: string
  text: string
  level: '短句' | '短文' | '进阶'
}

export interface MasteryRecord {
  level: number
  attempts: number
  correct: number
  streak: number
  lapses: number
  averageMs: number
  lastSeenAt: number
  dueAt: number
}

export interface SessionRecord {
  id: string
  kind: SessionKind
  stageId?: string
  finishedAt: number
  durationSeconds: number
  attempted: number
  correct: number
  firstTryCorrect: number
  medianMs: number
  charsPerMinute?: number
}

export interface AppSettings {
  theme: 'system' | 'light' | 'dark'
  dailyMinutes: 5 | 10 | 20
  newItemsPerRound: 5 | 8 | 12
  autoAdvance: boolean
  autoAdvanceDelay: 400 | 700 | 1000
  reducedMotion: boolean
}

export interface ProgressState {
  version: 2
  createdAt: number
  onboardingComplete: boolean
  learned: Record<string, number>
  mastery: Record<string, MasteryRecord>
  sessions: SessionRecord[]
  settings: AppSettings
}

export interface TrainingRequest {
  kind: SessionKind
  title: string
  stageId?: string
  itemIds?: string[]
  articleId?: string
}

export interface CourseStage {
  id: string
  index: number
  title: string
  description: string
  kind: SessionKind
  target: string
  minutes: number
}
