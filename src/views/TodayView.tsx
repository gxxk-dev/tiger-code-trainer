import { ArrowRight, BookOpen, Keyboard, Play, RotateCcw } from 'lucide-react'
import { KeyboardMap } from '../components/KeyboardMap'
import { Button } from '../components/ui/Button'
import { ProgressBar } from '../components/ui/ProgressBar'
import { courseStages, orderedRoots } from '../data/curriculum'
import {
  countMastered,
  dueItemIds,
  newCharacterIds,
  newRootIds,
  rootId,
} from '../lib/items'
import type { ProgressState, TrainingRequest } from '../types'

interface TodayViewProps {
  progress: ProgressState
  onStart: (request: TrainingRequest) => void
  onOpenCourse: () => void
}

export function TodayView({ progress, onStart, onOpenCourse }: TodayViewProps) {
  const dueIds = dueItemIds(progress)
  const newRoots = newRootIds(progress, progress.settings.newItemsPerRound)
  const rootMastered = countMastered(progress, 'root:')
  const firstMastered = countMastered(progress, 'char:')
  const splitMastered = countMastered(progress, 'split:')
  const bestSpeed = Math.max(0, ...progress.sessions.map((session) => session.charsPerMinute ?? 0))
  const currentStage = rootMastered < 5
    ? courseStages[0]
    : rootMastered < orderedRoots.length
      ? courseStages[2]
      : firstMastered < 500
        ? courseStages[4]
        : courseStages[6]

  const startToday = () => {
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
            {dueIds.length > 0 ? `先复习 ${dueIds.length} 个到期内容` : '学一点，马上拿来打字'}
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
          开始今日训练
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
              onClick={() => onStart({ kind: 'review', title: '快速复习', itemIds: dueIds.slice(0, 12) })}
            />
            <PlanItem
              index="02"
              title={newRoots.length ? '新字根微包' : '常用字全码'}
              detail={newRoots.length ? `${newRoots.length} 个新字根` : '12 个高频字'}
              minutes={4}
              icon={<BookOpen className="size-4" aria-hidden="true" />}
              onClick={() => onStart(newRoots.length
                ? { kind: 'roots', title: '新字根微包', itemIds: newRoots }
                : { kind: 'characters', title: '常用字全码', itemIds: newCharacterIds(progress, 12, 1) })}
            />
            <PlanItem
              index="03"
              title="真实中文短句"
              detail="使用 Fcitx5 虎码输入"
              minutes={3}
              icon={<Keyboard className="size-4" aria-hidden="true" />}
              onClick={() => onStart({ kind: 'article', title: '真实中文短句', articleId: 'message' })}
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
