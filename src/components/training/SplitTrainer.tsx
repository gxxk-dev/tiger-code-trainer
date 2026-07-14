import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, Eye } from 'lucide-react'
import clsx from 'clsx'
import { splitExamples } from '../../data/curriculum'
import { requiredSplits } from '../../data/splits.generated'
import { resolveSplit, splitId } from '../../lib/items'
import { displaySplitRootGlyph, resolveSplitRootCodes } from '../../lib/splitEncoding'
import type { TrainingRequest } from '../../types'
import { Button } from '../ui/Button'
import { ProgressBar } from '../ui/ProgressBar'
import { SplitEncodingProcess } from './SplitEncodingProcess'
import type { TrainingAnswerHandler, TrainingFinishedHandler } from './types'

interface SplitTrainerProps {
  request: TrainingRequest
  onAnswer: TrainingAnswerHandler
  onFinished: TrainingFinishedHandler
  paused?: boolean
  className?: string
}

export function SplitTrainer({ request, onAnswer, onFinished, paused = false, className }: SplitTrainerProps) {
  const pool = useMemo(() => [...splitExamples, ...requiredSplits.filter((entry) => !splitExamples.some((example) => example.char === entry.char))], [])
  const initial = request.itemIds?.flatMap((id) => resolveSplit(id) ?? []) ?? pool.slice(0, 10)
  const [queue, setQueue] = useState(initial)
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState('')
  const [guided, setGuided] = useState(false)
  const [attempted, setAttempted] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [firstTryCorrect, setFirstTryCorrect] = useState(0)
  const [responseTimes, setResponseTimes] = useState<number[]>([])
  const startedAt = useRef(Date.now())
  const pausedAt = useRef<number | null>(null)
  const questionHeadingRef = useRef<HTMLHeadingElement>(null)
  const nextButtonRef = useRef<HTMLButtonElement>(null)
  const question = queue[index]
  const options = useMemo(() => {
    if (!question) return []
    const distractors = pool.filter((item) => item.char !== question.char && item.roots.length === question.roots.length).slice((index * 3) % Math.max(1, pool.length - 3), (index * 3) % Math.max(1, pool.length - 3) + 3)
    return [question, ...distractors].sort((left, right) => `${left.char}${index}`.localeCompare(`${right.char}${index}`))
  }, [index, pool, question])

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => questionHeadingRef.current?.focus())
    return () => window.cancelAnimationFrame(frame)
  }, [index])

  useEffect(() => {
    if (!selected) return
    const frame = window.requestAnimationFrame(() => nextButtonRef.current?.focus())
    return () => window.cancelAnimationFrame(frame)
  }, [selected])

  useEffect(() => {
    if (paused && pausedAt.current === null) pausedAt.current = Date.now()
    if (!paused && pausedAt.current !== null) {
      startedAt.current += Date.now() - pausedAt.current
      pausedAt.current = null
    }
  }, [paused])

  const choose = (char: string, usedHint = false) => {
    if (!question || selected) return
    const isCorrect = char === question.char
    const responseMs = Date.now() - startedAt.current
    setSelected(char)
    setGuided(usedHint)
    setAttempted((value) => value + 1)
    if (isCorrect && !usedHint) {
      setCorrect((value) => value + 1)
      if (!question.note.startsWith('重试')) setFirstTryCorrect((value) => value + 1)
    }
    if ((!isCorrect || usedHint) && !question.note.startsWith('重试')) {
      setQueue((items) => [...items, { ...question, note: `重试：${question.note}` }])
    }
    setResponseTimes((values) => [...values, responseMs])
    onAnswer(splitId(question), isCorrect, responseMs, usedHint)
  }

  const next = () => {
    if (index + 1 >= queue.length) {
      onFinished({ attempted, correct, firstTryCorrect, responseTimes })
      return
    }
    setIndex((value) => value + 1)
    setSelected('')
    setGuided(false)
    startedAt.current = Date.now()
  }

  if (!question) return null
  return (
    <main className={clsx('mx-auto grid min-h-[calc(100dvh-4rem)] max-w-3xl content-center gap-8 px-4 py-10 sm:px-6 lg:px-8', className)}>
      <div className="grid gap-2">
        <div className="flex justify-between text-sm text-zinc-500 dark:text-zinc-400"><span>{question.note.startsWith('重试') ? '本轮错题再测' : '选择正确拆分'}</span><span className="tabular-nums">{index + 1} / {queue.length}</span></div>
        <ProgressBar value={(index / queue.length) * 100} label="拆分训练进度" tone="blue" />
      </div>
      <section className="grid min-h-80 content-center justify-items-center gap-8">
        <h1 ref={questionHeadingRef} tabIndex={-1} className="font-root text-8xl font-medium text-zinc-950 outline-none dark:text-white">{question.char}</h1>
        <div className="grid w-full gap-2 sm:grid-cols-2" role="group" aria-label={`为“${question.char}”选择拆分`}>
          {options.map((option) => {
            const optionValue = option.roots.join(' + ')
            const optionRootCodes = resolveSplitRootCodes(option)
            const revealCorrect = selected && option.char === question.char
            const revealWrong = selected === option.char && option.char !== question.char
            return (
              <button
                type="button"
                key={`${option.char}-${optionValue}`}
                onClick={() => choose(option.char)}
                aria-pressed={selected === option.char}
                disabled={Boolean(selected)}
                className={clsx(
                  'min-h-14 rounded-md bg-white p-3 text-left font-root text-base font-medium text-zinc-800 ring-1 ring-zinc-950/10 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:pointer-events-none disabled:opacity-60 dark:bg-white/5 dark:text-zinc-200 dark:ring-white/10',
                  revealCorrect ? 'ring-emerald-500/50' : '',
                  revealWrong ? 'ring-red-500/50' : '',
                )}
              >
                {option.roots.map((root, rootIndex) => (
                  <span key={`${root}-${rootIndex}`}>
                    {rootIndex ? ' + ' : ''}{displaySplitRootGlyph(root, optionRootCodes[rootIndex])}
                  </span>
                ))}
              </button>
            )
          })}
        </div>
      </section>
      <div className="min-h-28" aria-live="polite">
        {selected ? (
          <div className={clsx('rounded-lg p-4 ring-1', selected === question.char ? 'bg-emerald-500/8 ring-emerald-500/20' : 'bg-red-500/8 ring-red-500/20')}>
            <p className="font-medium text-zinc-950 dark:text-white">
              {selected === question.char
                ? guided
                  ? '已带你拆完，本题不计掌握'
                  : `${question.char} = ${question.roots.map((root, rootIndex) => displaySplitRootGlyph(root, resolveSplitRootCodes(question)[rootIndex])).join(' + ')}，拆分正确`
                : `正确拆分：${question.char} = ${question.roots.map((root, rootIndex) => displaySplitRootGlyph(root, resolveSplitRootCodes(question)[rootIndex])).join(' + ')}`}
            </p>
            <SplitEncodingProcess split={question} className="mt-4 border-t border-zinc-950/8 pt-4 dark:border-white/8" />
          </div>
        ) : null}
      </div>
      {selected ? (
        <div className="flex justify-center"><Button ref={nextButtonRef} variant="primary" trailingIcon={ArrowRight} onClick={next}>下一题</Button></div>
      ) : (
        <div className="flex justify-center"><Button variant="ghost" leadingIcon={Eye} onClick={() => choose(question.char, true)}>我不会，带我拆这题</Button></div>
      )}
    </main>
  )
}
