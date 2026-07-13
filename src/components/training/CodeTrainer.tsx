import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, Check, Lightbulb, XCircle } from 'lucide-react'
import clsx from 'clsx'
import { orderedRoots, splitExamples } from '../../data/curriculum'
import { characters } from '../../data/characters.generated'
import { requiredSplits } from '../../data/splits.generated'
import {
  characterId,
  displayRootGlyph,
  resolveCharacter,
  resolveRoot,
  resolveSplit,
  rootId,
} from '../../lib/items'
import type { FeedbackState, ProgressState, TrainingRequest } from '../../types'
import { Button } from '../ui/Button'
import { ProgressBar } from '../ui/ProgressBar'
import type { TrainingAnswerHandler, TrainingFinishedHandler } from './types'

interface CodeQuestion {
  id: string
  glyph: string
  expected: string
  eyebrow: string
  explanation: string
  roots?: Array<{ glyph: string; code: string }>
  retry?: boolean
}

interface CodeTrainerProps {
  request: TrainingRequest
  progress: ProgressState
  onAnswer: TrainingAnswerHandler
  onFinished: TrainingFinishedHandler
  className?: string
}

export function CodeTrainer({
  request,
  progress,
  onAnswer,
  onFinished,
  className,
}: CodeTrainerProps) {
  const initialQuestions = useMemo(() => buildCodeQuestions(request, progress), [progress, request])
  const [queue, setQueue] = useState(initialQuestions)
  const [index, setIndex] = useState(0)
  const [value, setValue] = useState('')
  const [feedback, setFeedback] = useState<FeedbackState>('idle')
  const [usedHint, setUsedHint] = useState(false)
  const [attempted, setAttempted] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [firstTryCorrect, setFirstTryCorrect] = useState(0)
  const [responseTimes, setResponseTimes] = useState<number[]>([])
  const questionStartedAt = useRef(Date.now())
  const inputRef = useRef<HTMLInputElement>(null)
  const current = queue[index]

  useEffect(() => {
    inputRef.current?.focus()
  }, [index])

  useEffect(() => {
    if (feedback !== 'correct' || !progress.settings.autoAdvance) return
    const timeout = window.setTimeout(() => advance(), progress.settings.autoAdvanceDelay)
    return () => window.clearTimeout(timeout)
  })

  const submit = (answer = value, hinted = false) => {
    if (!current || feedback !== 'idle') return
    const responseMs = Date.now() - questionStartedAt.current
    const isCorrect = answer.toLowerCase() === current.expected
    const answerUsedHint = usedHint || hinted
    setValue(answer.toLowerCase())
    setFeedback(answerUsedHint ? 'hint' : isCorrect ? 'correct' : 'incorrect')
    setAttempted((count) => count + 1)
    if (isCorrect && !answerUsedHint) {
      setCorrect((count) => count + 1)
      if (!current.retry) setFirstTryCorrect((count) => count + 1)
    }
    setResponseTimes((times) => [...times, responseMs])
    onAnswer(current.id, isCorrect, responseMs, answerUsedHint)
    if (!isCorrect && !current.retry) {
      setQueue((questions) => [...questions, { ...current, retry: true }])
    }
  }

  const showHint = () => {
    if (!current || feedback !== 'idle') return
    setUsedHint(true)
    submit(current.expected, true)
  }

  const advance = () => {
    if (feedback === 'idle') return
    if (index + 1 >= queue.length) {
      onFinished({ attempted, correct, firstTryCorrect, responseTimes })
      return
    }
    setIndex((position) => position + 1)
    setValue('')
    setFeedback('idle')
    setUsedHint(false)
    questionStartedAt.current = Date.now()
  }

  if (!current) {
    return (
      <div className={clsx('grid min-h-[calc(100dvh-4rem)] place-items-center px-4 text-center', className)}>
        <div>
          <h1 className="text-2xl font-semibold text-zinc-950 dark:text-white">当前没有可练内容</h1>
          <p className="mt-2 text-base text-zinc-600 sm:text-sm dark:text-zinc-400">先从课程页选择一个阶段。</p>
        </div>
      </div>
    )
  }

  const progressValue = ((index + (feedback === 'correct' ? 1 : 0)) / queue.length) * 100

  return (
    <main className={clsx('mx-auto grid min-h-[calc(100dvh-4rem)] max-w-3xl content-center gap-8 px-4 py-10 sm:px-6 lg:px-8', className)}>
      <div className="grid gap-2">
        <div className="flex items-center justify-between gap-4 text-sm text-zinc-500 dark:text-zinc-400">
          <span>{current.retry ? '本轮错题再测' : current.eyebrow}</span>
          <span className="tabular-nums">{Math.min(index + 1, queue.length)} / {queue.length}</span>
        </div>
        <ProgressBar value={progressValue} label="本轮训练进度" tone="blue" />
      </div>

      <section className="grid min-h-80 content-center justify-items-center gap-7 text-center" aria-labelledby="question-glyph">
        <p id="question-glyph" className="font-root text-7xl font-medium text-zinc-950 sm:text-8xl dark:text-white">{current.glyph}</p>
        <div className="grid gap-3">
          <CodeSlots expected={current.expected} value={value} feedback={feedback} />
          <input
            ref={inputRef}
            type="text"
            name="tiger-code-answer"
            value={value}
            onChange={(event) => {
              const nextValue = event.target.value.toLowerCase().replace(/[^a-z]/g, '').slice(0, current.expected.length)
              setValue(nextValue)
              if (nextValue.length === current.expected.length) submit(nextValue)
            }}
            onKeyDown={(event) => {
              if (event.nativeEvent.isComposing) return
              if (event.key === 'Enter') {
                event.preventDefault()
                if (feedback === 'idle') submit()
                else advance()
              } else if (event.key === ' ' && feedback === 'idle') {
                event.preventDefault()
                showHint()
              }
            }}
            readOnly={feedback !== 'idle'}
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
            aria-label={`输入“${current.glyph}”的虎码编码`}
            className="sr-only"
          />
          <p className="min-h-6 text-base text-zinc-500 sm:text-sm dark:text-zinc-400">
            {feedback === 'idle' ? '直接输入字母；想不起来可查看提示。' : null}
          </p>
        </div>
      </section>

      <div className="min-h-28" aria-live="polite">
        {feedback !== 'idle' ? (
          <FeedbackPanel question={current} input={value} state={feedback} />
        ) : (
          <div className="flex justify-center">
            <Button variant="ghost" leadingIcon={<Lightbulb className="size-4" aria-hidden="true" />} onClick={showHint}>查看提示</Button>
          </div>
        )}
      </div>

      {feedback !== 'idle' && (feedback !== 'correct' || !progress.settings.autoAdvance) ? (
        <div className="flex justify-center">
          <Button variant="primary" trailingIcon={<ArrowRight className="size-4" aria-hidden="true" />} onClick={advance}>下一题</Button>
        </div>
      ) : null}
    </main>
  )
}

function CodeSlots({ expected, value, feedback }: { expected: string; value: string; feedback: FeedbackState }) {
  const slotCount = Math.max(2, expected.length)
  return (
    <div className="flex justify-center gap-2" aria-hidden="true">
      {Array.from({ length: slotCount }, (_, index) => {
        const character = value[index] ?? ''
        return (
          <span
            key={index}
            className={clsx(
              'flex size-12 items-center justify-center rounded-md bg-white font-mono text-xl font-semibold ring-1 dark:bg-white/5',
              feedback === 'correct' ? 'text-emerald-700 ring-emerald-500/35 dark:text-emerald-300' : '',
              feedback === 'incorrect' ? 'text-red-700 ring-red-500/35 dark:text-red-300' : '',
              feedback === 'hint' ? 'text-blue-700 ring-blue-500/35 dark:text-blue-300' : '',
              feedback === 'idle' ? 'text-zinc-950 ring-zinc-950/12 dark:text-white dark:ring-white/12' : '',
            )}
          >
            {character || <span className="h-px w-3 bg-zinc-300 dark:bg-zinc-600" />}
          </span>
        )
      })}
    </div>
  )
}

function FeedbackPanel({ question, input, state }: { question: CodeQuestion; input: string; state: FeedbackState }) {
  const correct = state === 'correct'
  const hinted = state === 'hint'
  return (
    <div className={clsx(
      'rounded-lg p-4 ring-1',
      correct ? 'bg-emerald-500/8 ring-emerald-500/20' : hinted ? 'bg-blue-500/8 ring-blue-500/20' : 'bg-red-500/8 ring-red-500/20',
    )}>
      <div className="flex items-start gap-3">
        {correct ? <Check className="size-4 shrink-0 stroke-emerald-600 dark:stroke-emerald-300" aria-hidden="true" /> : hinted ? <Lightbulb className="size-4 shrink-0 stroke-blue-600 dark:stroke-blue-300" aria-hidden="true" /> : <XCircle className="size-4 shrink-0 stroke-red-600 dark:stroke-red-300" aria-hidden="true" />}
        <div className="min-w-0 flex-1">
          <p className="font-medium text-zinc-950 dark:text-white">{correct ? '正确' : hinted ? '已显示答案，本题不计掌握' : `你的输入：${input || '未作答'}`}</p>
          <p className="mt-1 text-base text-pretty text-zinc-600 sm:text-sm dark:text-zinc-300">正确编码：<span className="font-mono font-semibold text-zinc-950 dark:text-white">{question.expected}</span>。{question.explanation}</p>
          {question.roots?.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {question.roots.map((root, index) => (
                <span key={`${root.glyph}-${index}`} className="rounded-md bg-white/70 px-2 py-1 font-root text-sm text-zinc-700 ring-1 ring-zinc-950/8 dark:bg-white/6 dark:text-zinc-200 dark:ring-white/8">
                  {displayRootGlyph(root.glyph, root.code)} <span className="font-mono text-zinc-500 dark:text-zinc-400">{root.code}</span>
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function buildCodeQuestions(request: TrainingRequest, progress: ProgressState): CodeQuestion[] {
  const itemIds = request.itemIds ?? []
  if (request.kind === 'roots') {
    const roots = itemIds.length ? itemIds.flatMap((id) => resolveRoot(id) ?? []) : orderedRoots.slice(0, progress.settings.newItemsPerRound)
    return roots.map((root) => ({
      id: rootId(root),
      glyph: root.root,
      expected: root.code,
      eyebrow: '字根认码',
      explanation: root.examples.length ? `例字：${root.examples.join('、')}。` : '把两个字母作为一个整体记忆。',
      roots: [{ glyph: root.root, code: root.code }],
    }))
  }

  if (request.kind === 'review' && itemIds.length === 0) return []

  const resolved = itemIds.length
    ? itemIds.flatMap((id) => {
      const root = resolveRoot(id)
      if (root) return [{
        id,
        glyph: root.root,
        expected: root.code,
        eyebrow: '到期字根',
        explanation: root.examples.length ? `例字：${root.examples.join('、')}。` : '完整回忆大码和小码。',
        roots: [{ glyph: root.root, code: root.code }],
      } satisfies CodeQuestion]
      const character = resolveCharacter(id)
      if (character) return [characterQuestion(character, request.stageId === 'shortcuts')]
      const split = resolveSplit(id)
      if (split) return [{
        id,
        glyph: split.char,
        expected: split.code,
        eyebrow: '到期拆分',
        explanation: split.note,
        roots: split.roots.map((glyph) => ({ glyph, code: '' })),
      } satisfies CodeQuestion]
      return []
    })
    : characters.slice(0, progress.settings.newItemsPerRound).map((character) => characterQuestion(character, request.stageId === 'shortcuts'))
  return resolved
}

function characterQuestion(character: (typeof characters)[number], useShortcut: boolean): CodeQuestion {
  const split = requiredSplits.find((entry) => entry.char === character.char) ?? splitExamples.find((entry) => entry.char === character.char)
  const expected = useShortcut && character.short ? character.short : character.code
  return {
    id: characterId(character),
    glyph: character.char,
    expected,
    eyebrow: useShortcut ? '高频简码' : `常用字 #${character.rank}`,
    explanation: useShortcut && character.short ? `它的全码是 ${character.code}。` : split?.note ?? '先按全码稳定回忆，简码稍后自然加入。',
    roots: split?.roots.map((glyph, index) => ({ glyph, code: split.note.match(/[A-Za-z]{2}/g)?.[index]?.toLowerCase() ?? '' })),
  }
}
