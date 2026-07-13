import { useRef, useState } from 'react'
import { ArrowRight, Pause, X } from 'lucide-react'
import { median } from '../lib/mastery'
import type { ProgressState, SessionRecord, TrainingRequest } from '../types'
import { ArticleTrainer } from './training/ArticleTrainer'
import { CodeTrainer } from './training/CodeTrainer'
import { CompletionView } from './training/CompletionView'
import { FormulaTrainer } from './training/FormulaTrainer'
import { SplitTrainer } from './training/SplitTrainer'
import type { SessionResult, TrainingAnswerHandler } from './training/types'
import { Button, IconButton } from './ui/Button'

interface TrainingSessionProps {
  request: TrainingRequest
  progress: ProgressState
  onAnswer: TrainingAnswerHandler
  onComplete: (record: SessionRecord) => void
  onClose: () => void
}

export function TrainingSession({
  request,
  progress,
  onAnswer,
  onComplete,
  onClose,
}: TrainingSessionProps) {
  const [result, setResult] = useState<SessionResult | null>(null)
  const [paused, setPaused] = useState(false)
  const sessionStartedAt = useRef(Date.now())

  const finish = (summary: SessionResult) => {
    const record: SessionRecord = {
      id: crypto.randomUUID(),
      kind: request.kind,
      stageId: request.stageId,
      finishedAt: Date.now(),
      durationSeconds: summary.durationSeconds,
      attempted: summary.attempted,
      correct: summary.correct,
      firstTryCorrect: summary.firstTryCorrect,
      medianMs: median(summary.responseTimes),
      ...(summary.charsPerMinute ? { charsPerMinute: summary.charsPerMinute } : {}),
    }
    onComplete(record)
    setResult(summary)
  }

  const elapsed = () => Math.max(1, Math.round((Date.now() - sessionStartedAt.current) / 1000))

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-canvas text-zinc-950 dark:bg-canvas-dark dark:text-zinc-100">
      <header className="sticky top-0 z-20 border-b border-zinc-950/8 bg-canvas/92 backdrop-blur dark:border-white/8 dark:bg-canvas-dark/92">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-4 sm:px-6 lg:px-8">
          <IconButton label="退出训练" onClick={onClose}>
            <X className="size-4" aria-hidden="true" />
          </IconButton>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-medium text-zinc-950 sm:text-sm dark:text-white">{request.title}</p>
            <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">{modeLabel(request.kind)}</p>
          </div>
          {!result ? (
            <IconButton label={paused ? '继续训练' : '暂停训练'} onClick={() => setPaused((value) => !value)}>
              {paused ? <ArrowRight className="size-4" aria-hidden="true" /> : <Pause className="size-4" aria-hidden="true" />}
            </IconButton>
          ) : null}
        </div>
      </header>

      {paused ? (
        <div className="grid min-h-[calc(100dvh-4rem)] place-items-center px-4">
          <div className="text-center">
            <Pause className="mx-auto size-8 text-zinc-500" aria-hidden="true" />
            <h1 className="mt-4 text-2xl font-semibold text-zinc-950 dark:text-white">训练已暂停</h1>
            <Button variant="primary" className="mt-5" onClick={() => setPaused(false)}>继续</Button>
          </div>
        </div>
      ) : result ? (
        <CompletionView request={request} result={result} onClose={onClose} />
      ) : request.kind === 'article' ? (
        <ArticleTrainer request={request} onFinished={(summary) => finish({ ...summary, durationSeconds: elapsed() })} />
      ) : request.kind === 'formula' ? (
        <FormulaTrainer onAnswer={onAnswer} onFinished={(summary) => finish({ ...summary, durationSeconds: elapsed() })} />
      ) : request.kind === 'splits' ? (
        <SplitTrainer request={request} onAnswer={onAnswer} onFinished={(summary) => finish({ ...summary, durationSeconds: elapsed() })} />
      ) : (
        <CodeTrainer request={request} progress={progress} onAnswer={onAnswer} onFinished={(summary) => finish({ ...summary, durationSeconds: elapsed() })} />
      )}
    </div>
  )
}

function modeLabel(kind: TrainingRequest['kind']): string {
  return ({ formula: '公式理解', roots: '英文练码', splits: '拆分训练', characters: '英文练码', article: 'Fcitx5 中文实战', review: '间隔复习' })[kind]
}
