import { ArrowRight, BookOpen, Keyboard, Play, RotateCcw } from 'lucide-react'
import { KeyboardMap } from '../components/KeyboardMap'
import { Button } from '../components/ui/Button'
import { ProgressBar } from '../components/ui/ProgressBar'
import { basicStrokes, courseStages, orderedRoots, splitExamples } from '../data/curriculum'
import { requiredSplits } from '../data/splits.generated'
import {
  countMastered,
  dueItemIds,
  newCharacterIds,
  newRootIds,
  rootId,
  splitId,
} from '../lib/items'
import { getRootMemoryHint } from '../lib/rootHints'
import { splitUsesOnlyRoots } from '../lib/splitEncoding'
import type { ProgressState, TrainingRequest } from '../types'

interface TodayViewProps {
  progress: ProgressState
  onStart: (request: TrainingRequest) => void
  onOpenCourse: () => void
  onSkipOnboarding: () => void
}

export function TodayView({ progress, onStart, onOpenCourse, onSkipOnboarding }: TodayViewProps) {
  const starterRequest: TrainingRequest = {
    kind: 'roots',
    title: '第 1 课 · 五个基本笔画',
    stageId: 'strokes',
    itemIds: basicStrokes.map((stroke) => rootId(stroke.entry)),
  }

  if (!progress.onboardingComplete) {
    return (
      <FirstLessonView
        onStart={() => onStart(starterRequest)}
        onSkip={onSkipOnboarding}
      />
    )
  }

  const dueIds = dueItemIds(progress)
  const newRoots = newRootIds(progress, progress.settings.newItemsPerRound)
  const rootMastered = countMastered(progress, 'root:')
  const firstMastered = countMastered(progress, 'char:')
  const splitMastered = countMastered(progress, 'split:')
  const bestSpeed = Math.max(0, ...progress.sessions.map((session) => session.charsPerMinute ?? 0))
  const formulaComplete = progress.sessions.some((session) => session.stageId === 'formula')
  const splitPlan = splitsForKnownRoots(progress, 5)
  const shortcutsStarted = progress.sessions.some((session) => session.stageId === 'shortcuts')
  const phrasesStarted = progress.sessions.some((session) => session.stageId === 'phrases')
  const currentStage = !formulaComplete
    ? courseStages[1]
    : rootMastered < orderedRoots.length
      ? courseStages[2]
      : splitMastered < 632
        ? courseStages[3]
      : firstMastered < 500
        ? courseStages[4]
        : !shortcutsStarted
          ? courseStages[5]
          : !phrasesStarted
            ? courseStages[6]
            : firstMastered < 1500
              ? courseStages[7]
              : courseStages[8]

  const warmupIds = dueIds.length > 0
    ? dueIds.slice(0, 12)
    : Object.keys(progress.mastery).filter((id) => !id.startsWith('formula:')).slice(0, 5)

  const startToday = () => {
    if (!formulaComplete) {
      onStart({ kind: 'formula', title: courseStages[1].title, stageId: 'formula' })
      return
    }
    if (dueIds.length > 0) {
      onStart({ kind: 'review', title: '到期复习', itemIds: dueIds.slice(0, 12) })
      return
    }
    if (newRoots.length > 0) {
      onStart({ kind: 'roots', title: '今日字根', stageId: 'roots', itemIds: newRoots })
      return
    }
    onStart({
      kind: 'characters',
      title: '今日常用字',
      stageId: 'first-500',
      itemIds: newCharacterIds(progress, 12, 1),
    })
  }

  const selectKey = (key: string) => {
    const itemIds = orderedRoots
      .filter((root) => root.code[0] === key)
      .map(rootId)
    onStart({ kind: 'roots', title: `${key.toUpperCase()} 键字根`, itemIds })
  }

  return (
    <div className="mx-auto grid max-w-7xl gap-10 px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
      <header className="flex flex-col gap-6 border-b border-zinc-950/8 pb-8 sm:flex-row sm:items-end sm:justify-between dark:border-white/8">
        <div className="min-w-0">
          <p className="font-mono text-sm font-medium text-brand-700 dark:text-brand-300">今日 · {progress.settings.dailyMinutes} 分钟</p>
          <h1 className="mt-2 max-w-[20ch] text-3xl font-semibold text-balance text-zinc-950 sm:text-4xl dark:text-white">
            {!formulaComplete ? '下一步只学一条取码公式' : dueIds.length > 0 ? `先复习 ${dueIds.length} 个到期内容` : '学一点，马上拿来打字'}
          </h1>
          <p className="mt-3 max-w-[56ch] text-base text-pretty text-zinc-600 sm:text-sm dark:text-zinc-400">
            当前：{currentStage.title}。本轮会混合旧内容、新内容和真实汉字。
          </p>
        </div>
        <Button
          variant="primary"
          size="default"
          leadingIcon={<Play className="size-4 fill-current" aria-hidden="true" />}
          onClick={startToday}
        >
          {!formulaComplete ? '学习取码公式' : '开始今日训练'}
        </Button>
      </header>

      <section aria-label="核心进度" className="@container">
        <dl className="grid grid-cols-2 gap-y-6 @3xl:grid-cols-4">
          <Metric label="稳定字根" value={`${rootMastered} / 241`} detail={`${Math.round((rootMastered / 241) * 100)}%`} />
          <Metric label="稳定常用字" value={`${firstMastered} / 1500`} detail={firstMastered < 500 ? '前 500 进行中' : '继续扩展'} divider />
          <Metric label="拆分掌握" value={`${splitMastered}`} detail="个必拆案例" dividerDesktop />
          <Metric label="实战最佳" value={bestSpeed ? `${bestSpeed}` : '—'} detail={bestSpeed ? '字 / 分' : '还没有记录'} divider />
        </dl>
      </section>

      <div className="grid min-w-0 gap-8 xl:grid-cols-[8fr_5fr]">
        <section aria-labelledby="plan-heading" className="min-w-0">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h2 id="plan-heading" className="text-xl font-semibold text-zinc-950 dark:text-white">今天的顺序</h2>
              <p className="mt-1 text-base text-zinc-600 sm:text-sm dark:text-zinc-400">完成一项后，下一项会自动补位。</p>
            </div>
            <Button variant="ghost" size="compact" trailingIcon={<ArrowRight className="size-4" aria-hidden="true" />} onClick={onOpenCourse}>
              完整课程
            </Button>
          </div>
          <ol role="list" className="mt-5 divide-y divide-zinc-950/8 border-y border-zinc-950/8 dark:divide-white/8 dark:border-white/8">
            <PlanItem
              index="01"
              title={dueIds.length ? '到期复习' : '快速热身'}
              detail={dueIds.length ? `${dueIds.length} 个到期项目` : '5 个已学内容'}
              minutes={3}
              icon={<RotateCcw className="size-4" aria-hidden="true" />}
              onClick={() => onStart({ kind: 'review', title: '快速复习', itemIds: warmupIds })}
            />
            <PlanItem
              index="02"
              title={!formulaComplete ? '一条取码公式' : newRoots.length ? '新字根微包' : '常用字全码'}
              detail={!formulaComplete ? '先看规则，再做 5 个例子' : newRoots.length ? `${newRoots.length} 个新字根` : '12 个高频字'}
              minutes={4}
              icon={<BookOpen className="size-4" aria-hidden="true" />}
              onClick={() => onStart(!formulaComplete
                ? { kind: 'formula', title: courseStages[1].title, stageId: 'formula' }
                : newRoots.length
                  ? { kind: 'roots', title: '新字根微包', stageId: 'roots', itemIds: newRoots }
                  : { kind: 'characters', title: '常用字全码', stageId: 'first-500', itemIds: newCharacterIds(progress, 12, 1) })}
            />
            <PlanItem
              index="03"
              title={firstMastered > 0 ? '真实中文短句' : splitPlan.review ? '已学拆字复习' : '第一个拆分示范'}
              detail={firstMastered > 0
                ? '使用 Fcitx5 虎码输入'
                : splitPlan.knownOnly
                  ? `${splitPlan.items.length} 个只用已学字根的例字`
                  : '先看完整过程，再选字根'}
              minutes={3}
              icon={<Keyboard className="size-4" aria-hidden="true" />}
              onClick={() => onStart(firstMastered > 0
                ? { kind: 'article', title: '真实中文短句', stageId: 'phrases', articleId: 'message' }
                : { kind: 'splits', title: splitPlan.review ? '已学拆字复习' : '第一个拆分示范', stageId: 'splits', itemIds: splitPlan.items.map(splitId) })}
            />
          </ol>
        </section>

        <section aria-labelledby="keyboard-heading" className="rounded-lg bg-white p-5 ring-1 ring-zinc-950/8 dark:bg-white/4 dark:ring-white/8">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 id="keyboard-heading" className="font-semibold text-zinc-950 dark:text-white">键位掌握</h2>
              <p className="mt-1 text-base text-zinc-600 sm:text-sm dark:text-zinc-400">点击任意键练习该键字根。</p>
            </div>
            <span className="font-mono text-sm text-zinc-500 tabular-nums dark:text-zinc-400">{rootMastered}/241</span>
          </div>
          <div className="mt-5">
            <KeyboardMap progress={progress} onSelectKey={selectKey} />
          </div>
          <div className="mt-5">
            <ProgressBar value={(rootMastered / 241) * 100} label="全部字根进度" tone="blue" />
          </div>
        </section>
      </div>

      <section aria-labelledby="next-heading" className="grid gap-4 border-t border-zinc-950/8 pt-8 md:grid-cols-[1fr_auto] md:items-center dark:border-white/8">
        <div>
          <p className="font-mono text-sm font-medium text-blue-700 dark:text-blue-300">推荐阶段 {currentStage.index} / 9</p>
          <h2 id="next-heading" className="mt-2 text-xl font-semibold text-zinc-950 dark:text-white">{currentStage.title}</h2>
          <p className="mt-2 max-w-[56ch] text-base text-pretty text-zinc-600 sm:text-sm dark:text-zinc-400">{currentStage.description}</p>
        </div>
        <Button onClick={onOpenCourse}>查看阶段</Button>
      </section>
    </div>
  )
}

function splitsForKnownRoots(progress: ProgressState, count: number) {
  const knownRoots = orderedRoots.filter((root) => progress.learned[rootId(root)] || progress.mastery[rootId(root)])
  const preferred = new Map(['休', '扣', '什', '百', '么', '仕', '刁', '壬', '与'].map((char, index) => [char, index]))
  const knownCandidates = [...requiredSplits, ...splitExamples]
    .filter((split, index, entries) => entries.findIndex((entry) => entry.char === split.char) === index)
    .filter((split) => split.roots.length >= 2 && split.roots.length <= 3)
    .filter((split) => splitUsesOnlyRoots(split, knownRoots))
    .sort((left, right) => {
      const leftPriority = preferred.get(left.char) ?? 999
      const rightPriority = preferred.get(right.char) ?? 999
      return leftPriority - rightPriority || left.roots.length - right.roots.length
    })
  const unseenKnown = knownCandidates.filter((split) => !progress.mastery[splitId(split)])

  if (unseenKnown.length) return { items: unseenKnown.slice(0, count), knownOnly: true, review: false }
  if (knownCandidates.length) return { items: knownCandidates.slice(0, count), knownOnly: true, review: true }

  const unseenExamples = splitExamples.filter((split) => !progress.mastery[splitId(split)])
  return { items: (unseenExamples.length ? unseenExamples : splitExamples).slice(0, count), knownOnly: false, review: false }
}

function FirstLessonView({ onStart, onSkip }: { onStart: () => void; onSkip: () => void }) {
  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 pt-8 pb-28 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
      <header className="grid gap-6 border-b border-zinc-950/8 pb-8 md:grid-cols-[minmax(0,1fr)_auto] md:items-end dark:border-white/8">
        <div className="min-w-0">
          <p className="font-mono text-sm font-medium text-brand-700 dark:text-brand-300">从零开始 · 第 1 课 · 约 3 分钟</p>
          <h1 className="mt-2 max-w-[18ch] text-3xl font-semibold text-balance text-zinc-950 sm:text-4xl dark:text-white">先看答案，不会也能开始</h1>
          <div className="mt-4 grid max-w-[58ch] gap-1 text-base text-pretty text-zinc-600 dark:text-zinc-300">
            <p>汉字会拆成字根。</p>
            <p>每个字根固定对应两个字母：第一个叫大码，第二个叫小码。</p>
            <p>实际输入全部使用小写，不需要按 Shift。</p>
          </div>
        </div>
        <Button variant="primary" size="default" leadingIcon={<Play className="size-4 fill-current" aria-hidden="true" />} onClick={onStart}>
          开始第 1 课
        </Button>
      </header>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <section aria-labelledby="memory-title">
          <p className="font-mono text-sm font-medium text-blue-700 dark:text-blue-300">唯一需要背的内容</p>
          <h2 id="memory-title" className="mt-2 text-xl font-semibold text-zinc-950 dark:text-white">这一课只记 5 个基本笔画</h2>
          <p className="mt-2 max-w-[58ch] text-base text-pretty text-zinc-600 sm:text-sm dark:text-zinc-400">下面是临时学习联想，不是额外编码规则；哪个有用就留哪个。</p>
          <ul role="list" className="mt-5 divide-y divide-zinc-950/8 border-y border-zinc-950/8 dark:divide-white/8 dark:border-white/8">
            {basicStrokes.map((stroke) => {
              const hint = getRootMemoryHint(stroke.entry)
              return (
                <li key={stroke.code} className="grid grid-cols-[3.5rem_3rem_minmax(0,1fr)] items-start gap-3 py-4 sm:grid-cols-[3.5rem_4rem_minmax(0,1fr)] sm:gap-4">
                  <span className="pt-1 text-base font-medium text-zinc-700 dark:text-zinc-200">{stroke.name}</span>
                  <span className="font-root text-3xl font-medium text-zinc-950 dark:text-white">{stroke.glyph}</span>
                  <span className="min-w-0">
                    <span className="block font-mono text-2xl font-semibold text-brand-700 dark:text-brand-300">{stroke.code}</span>
                    <span className="mt-1 block text-base text-pretty text-zinc-600 sm:text-sm dark:text-zinc-300">{hint.mnemonic}</span>
                  </span>
                </li>
              )
            })}
          </ul>
          <p className="mt-4 text-base font-medium text-zinc-700 dark:text-zinc-200">横 fi，竖 gs，撇 tp，点/捺 id，折 ae。</p>
        </section>

        <aside aria-labelledby="lesson-steps-title" className="border-t border-zinc-950/8 pt-6 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-7 dark:border-white/8">
          <h2 id="lesson-steps-title" className="font-semibold text-zinc-950 dark:text-white">接下来只做三步</h2>
          <ol className="mt-4 grid gap-5">
            <FirstLessonStep index="01" title="看答案" detail="先把上面五组看一遍" />
            <FirstLessonStep index="02" title="照着打" detail="答案保持显示，不计分" />
            <FirstLessonStep index="03" title="自己回忆" detail="最后才遮住答案练习" />
          </ol>
          <div className="mt-7 border-t border-zinc-950/8 pt-5 dark:border-white/8">
            <p className="text-base text-zinc-500 sm:text-sm dark:text-zinc-400">现在不用管：完整字根表、拆字规则、简码和速度。</p>
            <Button variant="ghost" size="compact" className="mt-3" trailingIcon={<ArrowRight className="size-4" aria-hidden="true" />} onClick={onSkip}>我已经学过</Button>
          </div>
        </aside>
      </div>
    </div>
  )
}

function FirstLessonStep({ index, title, detail }: { index: string; title: string; detail: string }) {
  return (
    <li className="grid grid-cols-[2rem_1fr] gap-3">
      <span className="font-mono text-sm text-zinc-500 tabular-nums dark:text-zinc-400">{index}</span>
      <span>
        <span className="block text-base font-medium text-zinc-950 sm:text-sm dark:text-white">{title}</span>
        <span className="mt-1 block text-base text-zinc-500 sm:text-sm dark:text-zinc-400">{detail}</span>
      </span>
    </li>
  )
}

interface MetricProps {
  label: string
  value: string
  detail: string
  divider?: boolean
  dividerDesktop?: boolean
}

function Metric({ label, value, detail, divider, dividerDesktop }: MetricProps) {
  return (
    <div className={`min-w-0 ${divider ? 'border-l border-zinc-950/8 pl-5 dark:border-white/8' : ''} ${dividerDesktop ? '@3xl:border-l @3xl:border-zinc-950/8 @3xl:pl-5 dark:@3xl:border-white/8' : ''}`}>
      <dt className="truncate text-base text-zinc-600 sm:text-sm dark:text-zinc-400">{label}</dt>
      <dd className="mt-1 truncate text-2xl font-semibold text-zinc-950 tabular-nums dark:text-white">{value}</dd>
      <dd className="mt-1 truncate text-sm text-zinc-500 tabular-nums dark:text-zinc-400">{detail}</dd>
    </div>
  )
}

interface PlanItemProps {
  index: string
  title: string
  detail: string
  minutes: number
  icon: React.ReactNode
  onClick: () => void
}

function PlanItem({ index, title, detail, minutes, icon, onClick }: PlanItemProps) {
  return (
    <li>
      <button type="button" onClick={onClick} className="group flex w-full min-w-0 items-center gap-4 py-4 text-left outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-500">
        <span className="font-mono text-sm text-zinc-500 tabular-nums dark:text-zinc-400">{index}</span>
        <span className="text-zinc-500 group-hover:text-zinc-950 dark:text-zinc-400 dark:group-hover:text-white">{icon}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-base font-medium text-zinc-950 sm:text-sm dark:text-white">{title}</span>
          <span className="mt-1 block truncate text-sm text-zinc-500 dark:text-zinc-400">{detail}</span>
        </span>
        <span className="shrink-0 text-sm text-zinc-500 tabular-nums dark:text-zinc-400">{minutes} 分钟</span>
        <ArrowRight className="size-4 shrink-0 text-zinc-500 group-hover:text-zinc-950 dark:group-hover:text-white" aria-hidden="true" />
      </button>
    </li>
  )
}
