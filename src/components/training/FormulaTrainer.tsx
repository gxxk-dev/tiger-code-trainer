import { useEffect, useRef, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import clsx from 'clsx'
import { Button } from '../ui/Button'
import { ProgressBar } from '../ui/ProgressBar'
import { buildFormulaPracticeRound } from '../../lib/formulaPractice'
import type { TrainingFinishedHandler } from './types'

interface FormulaTrainerProps {
  onFinished: TrainingFinishedHandler
  paused?: boolean
  className?: string
}

export function FormulaTrainer({ onFinished, paused = false, className }: FormulaTrainerProps) {
  const [questions] = useState(() => buildFormulaPracticeRound())
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState('')
  const [attempted, setAttempted] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [responseTimes, setResponseTimes] = useState<number[]>([])
  const startedAt = useRef(Date.now())
  const pausedAt = useRef<number | null>(null)
  const questionHeadingRef = useRef<HTMLHeadingElement>(null)
  const nextButtonRef = useRef<HTMLButtonElement>(null)
  const question = questions[index]

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

  const select = (choice: string) => {
    if (selected) return
    const isCorrect = choice === question.answer
    const responseMs = Date.now() - startedAt.current
    setSelected(choice)
    setAttempted((value) => value + 1)
    if (isCorrect) setCorrect((value) => value + 1)
    setResponseTimes((values) => [...values, responseMs])
  }

  const next = () => {
    if (index + 1 >= questions.length) {
      onFinished({ attempted, correct, firstTryCorrect: correct, responseTimes })
      return
    }
    setIndex((value) => value + 1)
    setSelected('')
    startedAt.current = Date.now()
  }

  return (
    <main className={clsx('mx-auto grid min-h-[calc(100dvh-4rem)] max-w-3xl content-center gap-8 px-4 py-10 sm:px-6 lg:px-8', className)}>
      <div className="grid gap-2">
        <div className="flex justify-between text-sm text-zinc-500 dark:text-zinc-400"><span>取码公式</span><span className="tabular-nums">{index + 1} / {questions.length}</span></div>
        <ProgressBar value={(index / questions.length) * 100} label="公式训练进度" tone="blue" />
      </div>
      <section className="grid min-h-80 content-center justify-items-center gap-8 text-center">
        <div className="flex flex-wrap justify-center gap-2" aria-label={`${question.count} 个字根`}>
          {question.roots.map((root, rootIndex) => <p key={`${root}-${rootIndex}`} className="flex size-14 items-center justify-center rounded-md bg-white font-mono text-xl font-semibold ring-1 ring-zinc-950/10 dark:bg-white/5 dark:ring-white/10">{root}</p>)}
        </div>
        <div>
          <h1 ref={questionHeadingRef} tabIndex={-1} className="text-2xl font-semibold text-zinc-950 outline-none dark:text-white">{question.count >= 5 ? '五根及以上怎样取码？' : `${question.count} 个字根怎样取码？`}</h1>
          <p className="mt-2 text-base text-zinc-600 sm:text-sm dark:text-zinc-400">大写是大码，小写是末根小码。</p>
        </div>
        <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="取码选项">
          {question.choices.map((choice) => {
            const revealCorrect = selected && choice === question.answer
            const revealWrong = selected === choice && choice !== question.answer
            return (
              <button
                type="button"
                key={choice}
                onClick={() => select(choice)}
                disabled={Boolean(selected)}
                aria-pressed={selected === choice}
                className={clsx(
                  'min-h-12 rounded-md bg-white px-4 font-mono text-base font-semibold ring-1 ring-zinc-950/10 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:pointer-events-none disabled:opacity-60 dark:bg-white/5 dark:ring-white/10',
                  revealCorrect ? 'text-emerald-700 ring-emerald-500/40 dark:text-emerald-300' : '',
                  revealWrong ? 'text-red-700 ring-red-500/40 dark:text-red-300' : '',
                )}
              >
                {choice}
              </button>
            )
          })}
        </div>
      </section>
      <div className="min-h-24" aria-live="polite">
        {selected ? (
          <div className={clsx('rounded-lg p-4 ring-1', selected === question.answer ? 'bg-emerald-500/8 ring-emerald-500/20' : 'bg-red-500/8 ring-red-500/20')}>
            <p className="font-medium text-zinc-950 dark:text-white">{selected === question.answer ? '正确' : `正确答案是 ${question.answer}`}</p>
            <p className="mt-1 text-base text-zinc-600 sm:text-sm dark:text-zinc-300">{formulaExplanation(question.count)}</p>
          </div>
        ) : null}
      </div>
      {selected ? <div className="flex justify-center"><Button ref={nextButtonRef} variant="primary" trailingIcon={ArrowRight} onClick={next}>下一题</Button></div> : null}
    </main>
  )
}

function formulaExplanation(count: number): string {
  if (count === 1) return '单根字直接取这个根的大码和小码。'
  if (count === 2) return '取两个大码，再补第二根的小码。'
  if (count === 3) return '取三个大码，再补第三根的小码。'
  if (count === 4) return '直接取四个字根的大码。'
  return '取前三根的大码，再取末根的大码。'
}
