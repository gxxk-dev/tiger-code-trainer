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
import { buildRootRecallQueue, requiredRootRetryCount } from '../../lib/rootDrill'
import { rootExampleCharacters } from '../../lib/rootExamples'
import { hasSuccessfulRecall } from '../../lib/mastery'
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
  isRoot?: boolean
  requiresTwoRecalls?: boolean
  recallPass?: 1 | 2
}

interface CodeTrainerProps {
  request: TrainingRequest
  progress: ProgressState
  onAnswer: TrainingAnswerHandler
  onFinished: TrainingFinishedHandler
  paused?: boolean
  className?: string
}

export function CodeTrainer({
  request,
  progress,
  onAnswer,
  onFinished,
  paused = false,
  className,
}: CodeTrainerProps) {
  const initialQuestions = useMemo(() => {
    const questions = buildCodeQuestions(request, progress)
    return request.kind === 'roots' ? buildRootRecallQueue(questions) : questions
  }, [progress, request])
  const [queue, setQueue] = useState(initialQuestions)
  const [index, setIndex] = useState(0)
  const [value, setValue] = useState('')
  const [feedback, setFeedback] = useState<FeedbackState>('idle')
  const [usedHint, setUsedHint] = useState(false)
  const [hintVisible, setHintVisible] = useState(false)
  const [repairValue, setRepairValue] = useState('')
  const [repairComplete, setRepairComplete] = useState(false)
  const [attempted, setAttempted] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [firstTryCorrect, setFirstTryCorrect] = useState(0)
  const [responseTimes, setResponseTimes] = useState<number[]>([])
  const questionStartedAt = useRef(Date.now())
  const pausedAt = useRef<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const feedbackRef = useRef<HTMLDivElement>(null)
  const repairInputRef = useRef<HTMLInputElement>(null)
  const nextButtonRef = useRef<HTMLButtonElement>(null)
  const rootSuccesses = useRef<Record<string, number>>({})
  const current = queue[index]
  const needsRepair = Boolean(current?.isRoot && feedback !== 'idle' && feedback !== 'correct')

  useEffect(() => {
    inputRef.current?.focus()
  }, [index])

  useEffect(() => {
    if (feedback === 'idle') return
    const frame = window.requestAnimationFrame(() => {
      const target = needsRepair
        ? repairInputRef.current
        : nextButtonRef.current
        ?? (feedback === 'correct' && progress.settings.autoAdvance ? inputRef.current : feedbackRef.current)
      target?.focus()
    })
    return () => window.cancelAnimationFrame(frame)
  }, [feedback, needsRepair, progress.settings.autoAdvance])

  useEffect(() => {
    if (!repairComplete) return
    const frame = window.requestAnimationFrame(() => nextButtonRef.current?.focus())
    return () => window.cancelAnimationFrame(frame)
  }, [repairComplete])

  useEffect(() => {
    if (paused && pausedAt.current === null) pausedAt.current = Date.now()
    if (!paused && pausedAt.current !== null) {
      questionStartedAt.current += Date.now() - pausedAt.current
      pausedAt.current = null
    }
  }, [paused])

  useEffect(() => {
    if (feedback !== 'correct' || !progress.settings.autoAdvance) return
    if (paused) return
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
    let rootSuccessCount = 0
    if (current.requiresTwoRecalls) {
      if (isCorrect && !answerUsedHint) {
        rootSuccessCount = (rootSuccesses.current[current.id] ?? 0) + 1
        rootSuccesses.current[current.id] = rootSuccessCount
        if (rootSuccessCount === 2) onAnswer(current.id, true, responseMs, false)
      } else {
        rootSuccesses.current[current.id] = 0
        onAnswer(current.id, false, responseMs, answerUsedHint)
      }
    } else {
      onAnswer(current.id, isCorrect, responseMs, answerUsedHint)
    }
    if (!isCorrect || answerUsedHint) {
      setQueue((questions) => {
        const retryCount = current.requiresTwoRecalls
          ? requiredRootRetryCount(questions, index, current.id)
          : 1
        return [
          ...questions,
          ...Array.from({ length: retryCount }, () => ({ ...current, retry: true })),
        ]
      })
    } else if (current.requiresTwoRecalls && rootSuccessCount < 2) {
      setQueue((questions) => questions.slice(index + 1).some((question) => question.id === current.id)
        ? questions
        : [...questions, { ...current, recallPass: 2 }])
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
    if (needsRepair && !repairComplete) return
    if (index + 1 >= queue.length) {
      onFinished({ attempted, correct, firstTryCorrect, responseTimes })
      return
    }
    setIndex((position) => position + 1)
    setValue('')
    setFeedback('idle')
    setUsedHint(false)
    setHintVisible(false)
    setRepairValue('')
    setRepairComplete(false)
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
          <span>{current.retry ? '错题重新盲打' : current.recallPass ? `交错盲打，第 ${current.recallPass} / 2 轮` : current.eyebrow}</span>
          <span className="tabular-nums">{Math.min(index + 1, queue.length)} / {queue.length}</span>
        </div>
        <ProgressBar value={progressValue} label="本轮训练进度" tone="blue" />
      </div>

      <section className="grid min-h-56 content-center justify-items-center gap-5 text-center sm:min-h-80 sm:gap-7" aria-labelledby="question-glyph">
        <p id="question-glyph" className="font-root text-7xl font-medium text-zinc-950 sm:text-8xl dark:text-white">{current.glyph}</p>
        <div className="group grid gap-3">
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
              ? hintVisible || usedHint
                ? current.isRoot ? '看过编码后继续输入，本题稍后会重新出现。' : '继续自己输入；本题不计掌握。'
                : current.isRoot ? '看字形直接敲两键；想不起时再看编码。' : '直接输入字母；想不起来可查看提示。'
              : null}
          </p>
        </div>
      </section>

      <div className="min-h-28">
        {feedback !== 'idle' ? (
          <div className="grid gap-3">
            <FeedbackPanel containerRef={feedbackRef} question={current} input={value} state={feedback} />
            {needsRepair ? (
              <label className="grid gap-2 rounded-lg bg-white p-4 text-base font-medium text-zinc-700 ring-1 ring-zinc-950/10 sm:text-sm dark:bg-white/4 dark:text-zinc-200 dark:ring-white/10">
                看着正确编码，立即重敲一次 {current.expected}
                <input
                  ref={repairInputRef}
                  type="text"
                  name="root-repair-answer"
                  value={repairValue}
                  onChange={(event) => {
                    const nextValue = event.target.value.toLowerCase().replace(/[^a-z]/g, '').slice(0, current.expected.length)
                    setRepairValue(nextValue)
                    setRepairComplete(nextValue === current.expected)
                  }}
                  readOnly={repairComplete}
                  autoCapitalize="none"
                  autoCorrect="off"
                  autoComplete="off"
                  spellCheck={false}
                  aria-label={`重新输入“${current.glyph}”的正确编码`}
                  className={clsx(
                    'min-h-12 rounded-md bg-white px-3 text-center font-mono text-xl font-semibold text-zinc-950 ring-1 outline-none focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-brand-500 dark:bg-white/5 dark:text-white',
                    repairComplete ? 'ring-emerald-500/40' : 'ring-zinc-950/12 dark:ring-white/12',
                  )}
                />
                <span className="min-h-5 font-normal text-zinc-600 dark:text-zinc-300" aria-live="polite">
                  {repairComplete ? '动作已修正，这次不计掌握，稍后重新盲打。' : '这一步只修正手指动作，不计分。'}
                </span>
              </label>
            ) : null}
          </div>
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
                {hintVisible ? (current.isRoot ? '收起编码' : '收起提示') : (current.isRoot ? '给我编码' : '给我一点提示')}
              </Button>
              {hintVisible ? (
                <Button variant="secondary" size="compact" leadingIcon={Eye} onClick={revealAnswer}>显示答案</Button>
              ) : null}
            </div>
          </div>
        )}
      </div>

      {feedback !== 'idle' && (!needsRepair || repairComplete) && (feedback !== 'correct' || !progress.settings.autoAdvance) ? (
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
    <div className="group-focus-within:outline-brand-500 flex h-12 w-56 justify-center rounded-md group-focus-within:outline-2 group-focus-within:outline-offset-2" aria-hidden="true">
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
          <p className="font-medium text-zinc-950 dark:text-white">{correct ? '正确' : hinted ? (question.isRoot ? '看过编码，先修正手指动作' : '借提示答对，本题不计掌握') : `你的输入：${input || '未作答'}`}</p>
          <p className="mt-1 text-base text-pretty text-zinc-600 sm:text-sm dark:text-zinc-300">正确编码：<span className="font-mono font-semibold text-zinc-950 dark:text-white">{question.expected}</span>。{question.explanation}</p>
          {question.split ? (
            <SplitEncodingProcess split={question.split} className="mt-3 border-t border-zinc-950/8 pt-3 dark:border-white/8" />
          ) : null}
          {!correct && !question.split && !question.isRoot ? (
            <MemoryHint text={question.hint} className="mt-3 border-t border-zinc-950/8 pt-3 dark:border-white/8" />
          ) : null}
          {question.roots?.length && !question.split && !question.isRoot ? (
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
      const examples = rootExampleCharacters(root).slice(0, 4)
      return {
        id: rootId(root),
        glyph: displayRootGlyph(root.root, root.code),
        expected: root.code,
        eyebrow: '完整字根，输入根码',
        explanation: `这是完整字根，不再拆。大码 ${root.code[0].toUpperCase()} + 小码 ${root.code[1]}，依次输入 ${root.code}。${examples.length ? `例字有 ${examples.join('、')}。` : ''}`,
        hint: `编码是 ${root.code}。看着答案正确敲一次，这个字根稍后会重新出现。`,
        concealLength: false,
        roots: [{ glyph: root.root, code: root.code }],
        isRoot: true,
        requiresTwoRecalls: true,
      }
    })
  }

  if (request.kind === 'review' && itemIds.length === 0) return []

  const resolved = itemIds.length
    ? itemIds.flatMap((id) => {
      const root = resolveRoot(id)
      if (root) {
        const examples = rootExampleCharacters(root).slice(0, 4)
        return [{
          id,
          glyph: displayRootGlyph(root.root, root.code),
          expected: root.code,
          eyebrow: '到期字根',
          explanation: `这是完整字根，不再拆。大码 ${root.code[0].toUpperCase()} + 小码 ${root.code[1]}，依次输入 ${root.code}。${examples.length ? `例字有 ${examples.join('、')}。` : ''}`,
          hint: `编码是 ${root.code}。看着答案正确敲一次，这个字根稍后会重新出现。`,
          concealLength: false,
          roots: [{ glyph: root.root, code: root.code }],
          isRoot: true,
          requiresTwoRecalls: !hasSuccessfulRecall(progress.mastery[id]),
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
