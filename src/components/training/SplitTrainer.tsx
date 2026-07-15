import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Eye, RotateCcw } from 'lucide-react'
import clsx from 'clsx'
import { orderedRoots, splitExamples } from '../../data/curriculum'
import { requiredSplits } from '../../data/splits.generated'
import { resolveSplit, rootId, splitId } from '../../lib/items'
import { hasSuccessfulRecall } from '../../lib/mastery'
import { displaySplitRootGlyph, formatRootCode, resolveSplitRootCodes, splitUsesOnlyRoots } from '../../lib/splitEncoding'
import type { ProgressState, SplitEntry, TrainingRequest } from '../../types'
import { Button } from '../ui/Button'
import { ProgressBar } from '../ui/ProgressBar'
import { SplitEncodingProcess } from './SplitEncodingProcess'
import type { TrainingAnswerHandler, TrainingFinishedHandler } from './types'

interface RootChoice {
  id: string
  glyph: string
  code: string
}

interface AnswerResult {
  correct: boolean
  guided: boolean
}

const MAX_ASSEMBLED_ROOTS = 8

interface SplitTrainerProps {
  request: TrainingRequest
  progress?: ProgressState
  onAnswer: TrainingAnswerHandler
  onFinished: TrainingFinishedHandler
  paused?: boolean
  className?: string
}

export function SplitTrainer({ request, progress, onAnswer, onFinished, paused = false, className }: SplitTrainerProps) {
  const pool = useMemo(() => [...splitExamples, ...requiredSplits.filter((entry) => !splitExamples.some((example) => example.char === entry.char))], [])
  const initial = request.itemIds?.flatMap((id) => resolveSplit(id) ?? []) ?? pool.slice(0, 10)
  const optionPool = useMemo(() => {
    if (!progress) return []
    const recalledRoots = orderedRoots.filter((root) => hasSuccessfulRecall(progress.mastery[rootId(root)]))
    return pool.filter((split) => splitUsesOnlyRoots(split, recalledRoots))
  }, [pool, progress])
  const [queue, setQueue] = useState(initial)
  const [index, setIndex] = useState(0)
  const [selectedRoots, setSelectedRoots] = useState<RootChoice[]>([])
  const [answerResult, setAnswerResult] = useState<AnswerResult | null>(null)
  const [attempted, setAttempted] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [firstTryCorrect, setFirstTryCorrect] = useState(0)
  const [responseTimes, setResponseTimes] = useState<number[]>([])
  const startedAt = useRef(Date.now())
  const pausedAt = useRef<number | null>(null)
  const questionHeadingRef = useRef<HTMLHeadingElement>(null)
  const nextButtonRef = useRef<HTMLButtonElement>(null)
  const question = queue[index]
  const answerRoots = useMemo(() => {
    if (!question) return []
    return rootChoicesForSplit(question)
  }, [question])
  const rootChoices = useMemo(() => {
    if (!question) return []
    return buildRootChoices(question, optionPool.length ? optionPool : pool, index)
  }, [index, optionPool, pool, question])

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => questionHeadingRef.current?.focus())
    return () => window.cancelAnimationFrame(frame)
  }, [index])

  useEffect(() => {
    if (!answerResult) return
    const frame = window.requestAnimationFrame(() => nextButtonRef.current?.focus())
    return () => window.cancelAnimationFrame(frame)
  }, [answerResult])

  useEffect(() => {
    if (paused && pausedAt.current === null) pausedAt.current = Date.now()
    if (!paused && pausedAt.current !== null) {
      startedAt.current += Date.now() - pausedAt.current
      pausedAt.current = null
    }
  }, [paused])

  const chooseRoot = (choice: RootChoice) => {
    if (answerResult) return
    setSelectedRoots((roots) => roots.length >= MAX_ASSEMBLED_ROOTS ? roots : [...roots, choice])
  }

  const undoRoot = () => {
    if (answerResult) return
    setSelectedRoots((roots) => roots.slice(0, -1))
  }

  const submit = (usedHint = false) => {
    if (!question || answerResult) return
    const submittedRoots = usedHint ? answerRoots : selectedRoots
    if (!submittedRoots.length) return
    const isCorrect = sameRootSequence(submittedRoots, answerRoots)
    const responseMs = Date.now() - startedAt.current
    setSelectedRoots(submittedRoots)
    setAnswerResult({ correct: isCorrect, guided: usedHint })
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
    setSelectedRoots([])
    setAnswerResult(null)
    startedAt.current = Date.now()
  }

  if (!question) return null
  const questionRootCodes = resolveSplitRootCodes(question)
  const selectedText = selectedRoots.length
    ? selectedRoots.map(formatChoice).join(' + ')
    : '尚未选择'
  const answerText = question.roots.map((root, rootIndex) => displaySplitRootGlyph(root, questionRootCodes[rootIndex])).join(' + ')
  return (
    <main className={clsx('mx-auto grid min-h-[calc(100dvh-4rem)] max-w-4xl content-center gap-8 px-4 py-10 sm:px-6 lg:px-8', className)}>
      <div className="grid gap-2">
        <div className="flex justify-between text-sm text-zinc-500 dark:text-zinc-400"><span>{question.note.startsWith('重试') ? '本轮错题再测' : '按顺序拆出字根'}</span><span className="tabular-nums">{index + 1} / {queue.length}</span></div>
        <ProgressBar value={(index / queue.length) * 100} label="拆分训练进度" tone="blue" />
      </div>
      <section className="grid content-center justify-items-center gap-7">
        <h1 ref={questionHeadingRef} tabIndex={-1} className="font-root text-8xl font-medium text-zinc-950 outline-none dark:text-white">{question.char}</h1>
        <div className="grid w-full gap-4">
          <div className={clsx(
            'grid min-h-20 content-center gap-2 rounded-md bg-white p-4 ring-1 dark:bg-white/5',
            answerResult?.correct ? 'ring-emerald-500/35' : answerResult ? 'ring-red-500/35' : 'ring-zinc-950/10 dark:ring-white/10',
          )}>
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">当前拆分</p>
            <p className={clsx(
              'min-h-8 font-root text-2xl font-medium text-zinc-950 dark:text-white',
              selectedRoots.length ? '' : 'text-zinc-400 dark:text-zinc-500',
            )}>
              {selectedText}
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-[1fr_auto]" role="group" aria-label={`为“${question.char}”按顺序选择字根`}>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {rootChoices.map((choice) => {
                const displayGlyph = displaySplitRootGlyph(choice.glyph, choice.code)
                return (
                  <button
                    type="button"
                    key={choice.id}
                    onClick={() => chooseRoot(choice)}
                    disabled={Boolean(answerResult) || selectedRoots.length >= MAX_ASSEMBLED_ROOTS}
                    className="min-h-16 rounded-md bg-white p-2 text-left ring-1 ring-zinc-950/10 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:pointer-events-none disabled:opacity-60 dark:bg-white/5 dark:ring-white/10"
                  >
                    <span className="grid gap-1">
                      <span className="font-root text-2xl font-medium text-zinc-950 dark:text-white">{displayGlyph}</span>
                      <span className="font-mono text-sm text-zinc-500 dark:text-zinc-400">{formatRootCode(choice.code)}</span>
                    </span>
                  </button>
                )
              })}
            </div>
            <div className="flex gap-2 sm:w-28 sm:flex-col">
              <Button variant="secondary" size="compact" leadingIcon={ArrowLeft} onClick={undoRoot} disabled={!selectedRoots.length || Boolean(answerResult)} className="flex-1 sm:flex-none">撤回</Button>
              <Button variant="ghost" size="compact" leadingIcon={RotateCcw} onClick={() => setSelectedRoots([])} disabled={!selectedRoots.length || Boolean(answerResult)} className="flex-1 sm:flex-none">清空</Button>
            </div>
          </div>
        </div>
      </section>
      <div className="min-h-32" aria-live="polite">
        {answerResult ? (
          <div className={clsx('rounded-lg p-4 ring-1', answerResult.correct ? 'bg-emerald-500/8 ring-emerald-500/20' : 'bg-red-500/8 ring-red-500/20')}>
            <p className="font-medium text-zinc-950 dark:text-white">
              {answerResult.correct
                ? answerResult.guided
                  ? '已带你拆完，本题不计掌握'
                  : `${question.char} = ${answerText}，拆分正确`
                : `正确拆分：${question.char} = ${answerText}`}
            </p>
            <SplitEncodingProcess split={question} className="mt-4 border-t border-zinc-950/8 pt-4 dark:border-white/8" />
          </div>
        ) : null}
      </div>
      {answerResult ? (
        <div className="flex justify-center"><Button ref={nextButtonRef} variant="primary" trailingIcon={ArrowRight} onClick={next}>下一题</Button></div>
      ) : (
        <div className="flex flex-wrap justify-center gap-2">
          <Button variant="primary" onClick={() => submit()} disabled={!selectedRoots.length}>提交拆分</Button>
          <Button variant="ghost" leadingIcon={Eye} onClick={() => submit(true)}>我不会，带我拆这题</Button>
        </div>
      )}
    </main>
  )
}

function rootChoicesForSplit(split: SplitEntry): RootChoice[] {
  const rootCodes = resolveSplitRootCodes(split)
  return split.roots.map((root, index) => makeRootChoice(root, rootCodes[index] ?? ''))
}

function buildRootChoices(question: SplitEntry, pool: SplitEntry[], seed: number): RootChoice[] {
  const answerChoices = uniqueRootChoices(rootChoicesForSplit(question))
  const answerIds = new Set(answerChoices.map((choice) => choice.id))
  const relatedSplits = [
    ...pool.filter((entry) => entry.char !== question.char && entry.roots.length === question.roots.length),
    ...pool.filter((entry) => entry.char !== question.char && entry.roots.length !== question.roots.length),
  ]
  const relatedChoices = relatedSplits.flatMap(rootChoicesForSplit)
  const rootChartChoices = orderedRoots.map((root) => makeRootChoice(root.root, root.code))
  const decoys = takeCyclic(uniqueRootChoices([...relatedChoices, ...rootChartChoices]), seed * 5, 12)
    .filter((choice) => !answerIds.has(choice.id))

  return seededShuffle([...answerChoices, ...decoys].slice(0, Math.max(8, Math.min(10, answerChoices.length + 6))), hashString(`${question.char}:${seed}`))
}

function makeRootChoice(glyph: string, code: string): RootChoice {
  return {
    id: `${displaySplitRootGlyph(glyph, code)}:${code.toLowerCase()}`,
    glyph,
    code: code.toLowerCase(),
  }
}

function uniqueRootChoices(choices: RootChoice[]): RootChoice[] {
  const seen = new Set<string>()
  return choices.filter((choice) => {
    if (seen.has(choice.id)) return false
    seen.add(choice.id)
    return true
  })
}

function sameRootSequence(left: RootChoice[], right: RootChoice[]): boolean {
  return left.length === right.length && left.every((choice, index) => choice.id === right[index].id)
}

function formatChoice(choice: RootChoice): string {
  return displaySplitRootGlyph(choice.glyph, choice.code)
}

function takeCyclic<T>(items: T[], start: number, count: number): T[] {
  if (!items.length) return []
  return Array.from({ length: Math.min(count, items.length) }, (_, offset) => items[(start + offset) % items.length])
}

function seededShuffle<T>(items: T[], seed: number): T[] {
  const shuffled = [...items]
  let state = seed || 1
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    state = (state * 1_664_525 + 1_013_904_223) >>> 0
    const target = state % (index + 1)
    ;[shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]]
  }
  return shuffled
}

function hashString(value: string): number {
  let hash = 2_166_136_261
  for (const character of value) {
    hash ^= character.codePointAt(0) ?? 0
    hash = Math.imul(hash, 16_777_619)
  }
  return hash >>> 0
}
