export interface SessionResult {
  attempted: number
  correct: number
  firstTryCorrect: number
  responseTimes: number[]
  durationSeconds: number
  charsPerMinute?: number
}

export type SessionSummary = Omit<SessionResult, 'durationSeconds'>

export type TrainingAnswerHandler = (
  itemId: string,
  isCorrect: boolean,
  responseMs: number,
  usedHint: boolean,
) => void

export type TrainingFinishedHandler = (result: SessionSummary) => void
