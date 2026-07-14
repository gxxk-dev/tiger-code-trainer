import { useEffect, useRef, useState } from 'react'
import { Pause, Play, X } from 'lucide-react'
import { median } from '../lib/mastery'
import { lessonIdsForRequest } from '../lib/lessons'
import type { ProgressState, SessionRecord, TrainingRequest } from '../types'
import { ArticleTrainer } from './training/ArticleTrainer'
import { CodeTrainer } from './training/CodeTrainer'
import { CompletionView } from './training/CompletionView'
import { FormulaTrainer } from './training/FormulaTrainer'
import { LessonPrimer } from './training/LessonPrimer'
import { SplitTrainer } from './training/SplitTrainer'
import type { SessionResult, TrainingAnswerHandler } from './training/types'
import { AppIcon } from './ui/AppIcon'
import { Button, IconButton } from './ui/Button'

interface TrainingSessionProps {
  request: TrainingRequest
  progress: ProgressState
  onAnswer: TrainingAnswerHandler
  onLearned: (itemIds: string[]) => void
  onComplete: (record: SessionRecord) => void
  onClose: () => void
  onContinue?: () => void
  continueLabel?: string
}

export function TrainingSession({
  request,
  progress,
  onAnswer,
  onLearned,
  onComplete,
  onClose,
  onContinue,
  continueLabel,
}: TrainingSessionProps) {
  const [result, setResult] = useState<SessionResult | null>(null)
  const [paused, setPaused] = useState(false)
  const initialLessonIds = useRef(lessonIdsForRequest(request, progress))
  const newLessonIds = useRef(new Set(initialLessonIds.current.filter((id) => !progress.learned[id])))
  const introducedCount = useRef(0)
  const learningItemCount = useRef(0)
  const practicedItemIds = useRef(request.itemIds ?? [])
  const [learning, setLearning] = useState(() => initialLessonIds.current.length > 0)
  const [practiceItemIds, setPracticeItemIds] = useState(request.itemIds)
  const sessionStartedAt = useRef(Date.now())

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.isComposing && !event.defaultPrevented) onClose()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

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
      origin: request.origin,
      planDate: request.planDate,
      segment: request.segment,
      introduced: introducedCount.current,
      learningItems: learningItemCount.current,
      itemIds: practicedItemIds.current,
    }
    onComplete(record)
    setResult(summary)
  }

  const elapsed = () => Math.max(1, Math.round((Date.now() - sessionStartedAt.current) / 1000))

  const beginPractice = (itemIds: string[]) => {
    introducedCount.current = request.kind === 'article' || request.kind === 'formula'
      ? 0
      : itemIds.filter((id) => newLessonIds.current.has(id)).length
    learningItemCount.current = request.kind === 'article' || request.kind === 'formula' ? 0 : itemIds.length
    practicedItemIds.current = itemIds
    onLearned(itemIds)
    if (request.kind === 'splits') setPracticeItemIds(itemIds)
    sessionStartedAt.current = Date.now()
    setLearning(false)
  }

  const practiceRequest = request.kind === 'splits'
    ? { ...request, itemIds: practiceItemIds }
    : request

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-canvas text-zinc-950 dark:bg-canvas-dark dark:text-zinc-100" role="dialog" aria-modal="true" aria-labelledby="training-title">
      <header className="sticky top-0 z-20 border-b border-zinc-950/8 bg-canvas/92 backdrop-blur dark:border-white/8 dark:bg-canvas-dark/92">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-4 sm:px-6 lg:px-8">
          <IconButton label="退出训练" icon={X} onClick={onClose} />
          <div className="min-w-0 flex-1">
            <p id="training-title" className="truncate text-base font-medium text-zinc-950 sm:text-sm dark:text-white">{request.title}</p>
            <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">{learning ? '先学，答案可见' : modeLabel(request.kind)}</p>
          </div>
          {!result && !learning ? (
            <IconButton label={paused ? '继续训练' : '暂停训练'} icon={paused ? Play : Pause} onClick={() => setPaused((value) => !value)} />
          ) : null}
        </div>
      </header>

      {learning ? (
        <LessonPrimer request={request} progress={progress} onComplete={beginPractice} />
      ) : paused ? (
        <div className="grid min-h-[calc(100dvh-4rem)] place-items-center px-4" role="status">
          <div className="grid justify-items-center gap-4 text-center">
            <AppIcon icon={Pause} inline={false} className="stroke-zinc-500" />
            <h1 className="text-2xl font-semibold text-zinc-950 dark:text-white">训练已暂停</h1>
            <Button variant="primary" leadingIcon={Play} onClick={() => setPaused(false)}>继续</Button>
          </div>
        </div>
      ) : result ? (
        <CompletionView
          request={request}
          result={result}
          onClose={onClose}
          onContinue={onContinue}
          continueLabel={continueLabel}
        />
      ) : request.kind === 'article' ? (
        <ArticleTrainer request={request} onFinished={(summary) => finish({ ...summary, durationSeconds: elapsed() })} />
      ) : request.kind === 'formula' ? (
        <FormulaTrainer onFinished={(summary) => finish({ ...summary, durationSeconds: elapsed() })} />
      ) : request.kind === 'splits' ? (
        <SplitTrainer request={practiceRequest} onAnswer={onAnswer} onFinished={(summary) => finish({ ...summary, durationSeconds: elapsed() })} />
      ) : (
        <CodeTrainer request={request} progress={progress} onAnswer={onAnswer} onFinished={(summary) => finish({ ...summary, durationSeconds: elapsed() })} />
      )}
    </div>
  )
}

function modeLabel(kind: TrainingRequest['kind']): string {
  return ({ formula: '公式理解', roots: '英文练码', splits: '拆分训练', characters: '英文练码', article: 'Fcitx5 中文实战', review: '间隔复习' })[kind]
}
