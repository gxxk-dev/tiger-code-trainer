import { useEffect, useRef } from 'react'
import { Check } from 'lucide-react'
import clsx from 'clsx'
import { median } from '../../lib/mastery'
import type { TrainingRequest } from '../../types'
import { Button } from '../ui/Button'
import type { SessionResult } from './types'

interface CompletionViewProps {
  request: TrainingRequest
  result: SessionResult
  onClose: () => void
  onContinue?: () => void
  continueLabel?: string
  className?: string
}

export function CompletionView({ request, result, onClose, onContinue, continueLabel, className }: CompletionViewProps) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  const accuracy = Math.round(result.correct / Math.max(1, result.attempted) * 100)
  const nextStep = request.origin === 'daily'
    ? ''
    : request.stageId === 'strokes'
    ? '下一步：学习一条取码公式。'
    : request.stageId === 'formula'
      ? '下一步：每次认识 5 个常用字根。'
      : ''

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  return (
    <main className={clsx('mx-auto grid min-h-[calc(100dvh-4rem)] max-w-3xl content-center gap-8 px-4 py-10 text-center sm:px-6 lg:px-8', className)}>
      <div>
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" aria-hidden="true">
          <Check className="size-5" />
        </span>
        <h1 ref={headingRef} tabIndex={-1} className="mt-5 text-3xl font-semibold text-zinc-950 outline-none dark:text-white">本轮完成</h1>
        <p className="mt-2 text-base text-zinc-600 sm:text-sm dark:text-zinc-400">{request.title}</p>
        {nextStep ? <p className="mt-2 text-base font-medium text-brand-700 sm:text-sm dark:text-brand-300">{nextStep}</p> : null}
      </div>
      <dl className="grid grid-cols-2 divide-x divide-zinc-950/8 border-y border-zinc-950/8 py-5 sm:grid-cols-4 dark:divide-white/8 dark:border-white/8">
        <ResultStat label="准确率" value={`${accuracy}%`} />
        <ResultStat label="首答正确" value={`${result.firstTryCorrect}`} />
        <ResultStat label="用时" value={`${Math.max(1, Math.round(result.durationSeconds / 60))}m`} />
        <ResultStat label={result.charsPerMinute ? '字 / 分' : '中位反应'} value={result.charsPerMinute ? `${result.charsPerMinute}` : result.responseTimes.length ? `${(median(result.responseTimes) / 1000).toFixed(1)}s` : '—'} />
      </dl>
      <div className="flex justify-center">
        <Button variant="primary" onClick={onContinue ?? onClose}>
          {continueLabel ?? (nextStep ? '继续下一步' : '返回学习页')}
        </Button>
      </div>
    </main>
  )
}

function ResultStat({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0 px-3"><dt className="truncate text-sm text-zinc-500 dark:text-zinc-400">{label}</dt><dd className="mt-1 truncate text-2xl font-semibold text-zinc-950 tabular-nums dark:text-white">{value}</dd></div>
}
