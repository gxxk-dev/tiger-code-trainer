import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { ArrowRight, Check, Eye, Lightbulb, XCircle } from 'lucide-react'
import clsx from 'clsx'
import { orderedRoots } from '../../data/curriculum'
import { characters } from '../../data/characters.generated'
import {
  characterId,
  displayRootGlyph,
  resolveCharacter,
  resolveRoot,
  resolveShortcut,
  resolveSplit,
  rootId,
  shortcutId,
} from '../../lib/items'
import { getRootMemoryHint } from '../../lib/rootHints'
import { resolveSplitRootCodes } from '../../lib/splitEncoding'
import type { FeedbackState, ProgressState, SplitEntry, TrainingRequest } from '../../types'
import { AppIcon } from '../ui/AppIcon'
import { Button } from '../ui/Button'
import { ProgressBar } from '../ui/ProgressBar'
import { MemoryHint } from './MemoryHint'
import { SplitEncodingProcess } from './SplitEncodingProcess'
import type { TrainingAnswerHandler, TrainingFinishedHandler } from './types'

interface CodeQuestion {
  id: string
  glyph: string
  expected: string
  eyebrow: string
  explanation: string
  hint: string
  concealLength: boolean
  roots?: Array<{ glyph: string; code: string }>
  split?: SplitEntry
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
  const [hintVisible, setHintVisible] = useState(false)
  const [attempted, setAttempted] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [firstTryCorrect, setFirstTryCorrect] = useState(0)
  const [responseTimes, setResponseTimes] = useState<number[]>([])
  const questionStartedAt = useRef(Date.now())
  const inputRef = useRef<HTMLInputElement>(null)
  const feedbackRef = useRef<HTMLDivElement>(null)
  const nextButtonRef = useRef<HTMLButtonElement>(null)
  const current = queue[index]

  useEffect(() => {
    inputRef.current?.focus()
  }, [index])

  useEffect(() => {
    if (feedback === 'idle') return
    const frame = window.requestAnimationFrame(() => {
      const target = nextButtonRef.current
        ?? (feedback === 'correct' && progress.settings.autoAdvance ? inputRef.current : feedbackRef.current)
      target?.focus()
    })
    return () => window.cancelAnimationFrame(frame)
  }, [feedback, progress.settings.autoAdvance])

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
    setFeedback(isCorrect ? answerUsedHint ? 'hint' : 'correct' : 'incorrect')
    setAttempted((count) => count + 1)
    if (isCorrect && !answerUsedHint) {
      setCorrect((count) => count + 1)
      if (!current.retry) setFirstTryCorrect((count) => count + 1)
    }
    setResponseTimes((times) => [...times, responseMs])
    onAnswer(current.id, isCorrect, responseMs, answerUsedHint)
    if ((!isCorrect || answerUsedHint) && !current.retry) {
      setQueue((questions) => [...questions, { ...current, retry: true }])
    }
  }

  const showHint = () => {
    if (!current || feedback !== 'idle') return
    setUsedHint(true)
    setHintVisible(true)
    window.requestAnimationFrame(() => inputRef.current?.focus())
  }

  const hideHint = () => {
    if (feedback !== 'idle') return
    setHintVisible(false)
    window.requestAnimationFrame(() => inputRef.current?.focus())
  }

  const revealAnswer = () => {
    if (!current || feedback !== 'idle') return
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
    setHintVisible(false)
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

  const progressValue = ((index + (feedback !== 'idle' ? 1 : 0)) / queue.length) * 100

  return (
    <main className={clsx('mx-auto grid min-h-[calc(100dvh-4rem)] max-w-3xl content-center gap-6 px-4 py-6 sm:gap-8 sm:px-6 sm:py-10 lg:px-8', className)}>
      <div className="grid gap-2">
        <div className="flex items-center justify-between gap-4 text-sm text-zinc-500 dark:text-zinc-400">
          <span>{current.retry ? '本轮错题再测' : current.eyebrow}</span>
          <span className="tabular-nums">{Math.min(index + 1, queue.length)} / {queue.length}</span>
        </div>
        <ProgressBar value={progressValue} label="本轮训练进度" tone="blue" />
      </div>

      <section className="grid min-h-56 content-center justify-items-center gap-5 text-center sm:min-h-80 sm:gap-7" aria-labelledby="question-glyph">
        <p id="question-glyph" className="font-root text-7xl font-medium text-zinc-950 sm:text-8xl dark:text-white">{current.glyph}</p>
        <div className="grid gap-3">
          <CodeSlots expected={current.expected} value={value} feedback={feedback} concealLength={current.concealLength} />
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
                if (hintVisible) revealAnswer()
                else showHint()
              }
            }}
            readOnly={feedback !== 'idle'}
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
            aria-label={`输入“${current.glyph}”的虎码编码`}
            aria-describedby={feedback === 'idle' && hintVisible ? 'code-memory-hint' : undefined}
            className="sr-only"
          />
          <p className="min-h-6 text-base text-zinc-500 sm:text-sm dark:text-zinc-400">
            {feedback === 'idle'
              ? hintVisible || usedHint ? '继续自己输入；本题不计掌握。' : '直接输入字母；想不起来可查看提示。'
              : null}
          </p>
        </div>
      </section>

      <div className="min-h-28">
        {feedback !== 'idle' ? (
          <FeedbackPanel containerRef={feedbackRef} question={current} input={value} state={feedback} />
        ) : (
          <div className={clsx('grid', hintVisible && 'gap-3')}>
            <div id="code-memory-hint" aria-live="polite">
              {hintVisible ? (
                <div className="rounded-lg bg-blue-500/8 p-4 ring-1 ring-blue-500/20">
                  <MemoryHint text={current.hint} />
                </div>
              ) : null}
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <Button
                variant="ghost"
                leadingIcon={Lightbulb}
                aria-expanded={hintVisible}
                aria-controls="code-memory-hint"
                onClick={hintVisible ? hideHint : showHint}
              >
                {hintVisible ? '收起提示' : '给我一点提示'}
              </Button>
              {hintVisible ? (
                <Button variant="secondary" size="compact" leadingIcon={Eye} onClick={revealAnswer}>显示答案</Button>
              ) : null}
            </div>
          </div>
        )}
      </div>

      {feedback !== 'idle' && (feedback !== 'correct' || !progress.settings.autoAdvance) ? (
        <div className="flex justify-center">
          <Button ref={nextButtonRef} variant="primary" trailingIcon={ArrowRight} onClick={advance}>下一题</Button>
        </div>
      ) : null}
    </main>
  )
}

function CodeSlots({
  expected,
  value,
  feedback,
  concealLength,
}: {
  expected: string
  value: string
  feedback: FeedbackState
  concealLength: boolean
}) {
  const slotCount = Math.max(2, expected.length)
  return (
    <div className="flex h-12 w-56 justify-center" aria-hidden="true">
      {concealLength && feedback === 'idle' ? (
        <div className="flex h-12 w-full items-center justify-center rounded-md bg-white px-4 font-mono text-xl font-semibold text-zinc-950 ring-1 ring-zinc-950/12 dark:bg-white/5 dark:text-white dark:ring-white/12">
          {value || <span className="h-px w-12 bg-zinc-300 dark:bg-zinc-600" />}
        </div>
      ) : (
        <div className="flex justify-center gap-2">
          {Array.from({ length: slotCount }, (_, index) => {
            const character = value[index] ?? ''
            return (
              <p
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
              </p>
            )
          })}
        </div>
      )}
    </div>
  )
}

function FeedbackPanel({
  containerRef,
  question,
  input,
  state,
}: {
  containerRef: RefObject<HTMLDivElement | null>
  question: CodeQuestion
  input: string
  state: FeedbackState
}) {
  const correct = state === 'correct'
  const hinted = state === 'hint'
  return (
    <div ref={containerRef} tabIndex={-1} role="status" aria-label="本题反馈" className={clsx(
      'rounded-lg p-4 ring-1 outline-none',
      correct ? 'bg-emerald-500/8 ring-emerald-500/20' : hinted ? 'bg-blue-500/8 ring-blue-500/20' : 'bg-red-500/8 ring-red-500/20',
    )}>
      <div className="flex items-start gap-3">
        {correct
          ? <AppIcon icon={Check} className="stroke-emerald-600 dark:stroke-emerald-300" />
          : hinted
            ? <AppIcon icon={Lightbulb} className="stroke-blue-600 dark:stroke-blue-300" />
            : <AppIcon icon={XCircle} className="stroke-red-600 dark:stroke-red-300" />}
        <div className="min-w-0 flex-1">
          <p className="font-medium text-zinc-950 dark:text-white">{correct ? '正确' : hinted ? '借提示答对，本题不计掌握' : `你的输入：${input || '未作答'}`}</p>
          <p className="mt-1 text-base text-pretty text-zinc-600 sm:text-sm dark:text-zinc-300">正确编码：<span className="font-mono font-semibold text-zinc-950 dark:text-white">{question.expected}</span>。{question.explanation}</p>
          {question.split ? (
            <SplitEncodingProcess split={question.split} className="mt-3 border-t border-zinc-950/8 pt-3 dark:border-white/8" />
          ) : null}
          {!correct && !question.split ? (
            <MemoryHint text={question.hint} className="mt-3 border-t border-zinc-950/8 pt-3 dark:border-white/8" />
          ) : null}
          {question.roots?.length && !question.split ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {question.roots.map((root, index) => (
                <div key={`${root.glyph}-${index}`} className="rounded-md bg-white/70 px-2 py-1 font-root text-base text-zinc-700 ring-1 ring-zinc-950/8 sm:text-sm dark:bg-white/6 dark:text-zinc-200 dark:ring-white/8">
                  {displayRootGlyph(root.glyph, root.code)} <span className="font-mono text-zinc-500 dark:text-zinc-400">{root.code}</span>
                </div>
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
    return roots.map((root) => {
      const hint = getRootMemoryHint(root)
      return {
        id: rootId(root),
        glyph: displayRootGlyph(root.root, root.code),
        expected: root.code,
        eyebrow: '完整字根，输入根码',
        explanation: `这是完整字根，不再拆。大码 ${root.code[0].toUpperCase()} + 小码 ${root.code[1]}，依次输入 ${root.code}。${root.examples.length ? `可在这些字里找到它：${root.examples.join('、')}。` : ''}`,
        hint: hint.mnemonic,
        concealLength: false,
        roots: [{ glyph: root.root, code: root.code }],
      }
    })
  }

  if (request.kind === 'review' && itemIds.length === 0) return []

  const resolved = itemIds.length
    ? itemIds.flatMap((id) => {
      const root = resolveRoot(id)
      if (root) {
        const hint = getRootMemoryHint(root)
        return [{
          id,
          glyph: displayRootGlyph(root.root, root.code),
          expected: root.code,
          eyebrow: '到期字根',
          explanation: `这是完整字根，不再拆。大码 ${root.code[0].toUpperCase()} + 小码 ${root.code[1]}，依次输入 ${root.code}。${root.examples.length ? `可在这些字里找到它：${root.examples.join('、')}。` : ''}`,
          hint: hint.mnemonic,
          concealLength: false,
          roots: [{ glyph: root.root, code: root.code }],
        } satisfies CodeQuestion]
      }
      const shortcut = resolveShortcut(id)
      if (shortcut) return [characterQuestion(shortcut, true)]
      const character = resolveCharacter(id)
      if (character) return [characterQuestion(character, request.stageId === 'shortcuts')]
      const split = resolveSplit(id)
      if (split) return [{
        id,
        glyph: split.char,
        expected: split.code,
        eyebrow: '到期拆分',
        explanation: split.note,
        hint: `先按书写顺序想出 ${split.roots.map((glyph) => displayRootGlyph(glyph)).join(' + ')}，再套取码公式。`,
        concealLength: true,
        roots: split.roots.map((glyph, index) => ({ glyph, code: resolveSplitRootCodes(split)[index] })),
        split,
      } satisfies CodeQuestion]
      return []
    })
    : characters.slice(0, progress.settings.newItemsPerRound).map((character) => characterQuestion(character, request.stageId === 'shortcuts'))
  return resolved
}

function characterQuestion(character: (typeof characters)[number], useShortcut: boolean): CodeQuestion {
  const split = resolveSplit(`split:${character.char}`)
  const expected = useShortcut && character.short ? character.short : character.code
  return {
    id: useShortcut ? shortcutId(character) : characterId(character),
    glyph: character.char,
    expected,
    eyebrow: useShortcut ? '高频简码' : `常用字 #${character.rank}`,
    explanation: useShortcut && character.short ? `它的全码是 ${character.code}。` : split?.note ?? '先按全码稳定回忆，简码稍后自然加入。',
    hint: useShortcut && character.short
      ? `先回忆全码 ${character.code}；这个高频字可缩短为简码。`
      : split ? `先拆成 ${split.roots.map((glyph) => displayRootGlyph(glyph)).join(' + ')}，再按取码公式组合。` : '先回忆它的完整拆分，再取前三根和末根。',
    concealLength: true,
    roots: split?.roots.map((glyph, index) => ({ glyph, code: resolveSplitRootCodes(split)[index] })),
    split,
  }
}
