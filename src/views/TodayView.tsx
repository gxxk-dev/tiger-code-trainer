import { ArrowRight, Check, Circle, CircleDot, Minus, Play } from 'lucide-react'
import { TrainingIntensityControl } from '../components/TrainingIntensityControl'
import { AppIcon } from '../components/ui/AppIcon'
import { Button } from '../components/ui/Button'
import { ProgressBar } from '../components/ui/ProgressBar'
import { basicStrokes } from '../data/curriculum'
import { buildDailyPlan, buildDeepDiveRequest, type DailyStep } from '../lib/dailyPlan'
import { getRootMemoryHint } from '../lib/rootHints'
import type { AppSettings, ProgressState, TrainingRequest } from '../types'

interface TodayViewProps {
  progress: ProgressState
  onStart: (request: TrainingRequest) => void
  onIntensityChange: (minutes: AppSettings['dailyMinutes']) => void
  onSkipOnboarding: () => void
}

export function TodayView({ progress, onStart, onIntensityChange, onSkipOnboarding }: TodayViewProps) {
  const plan = buildDailyPlan(progress)

  if (!progress.onboardingComplete) {
    return (
      <FirstLessonView
        onStart={() => {
          const latestPlan = buildDailyPlan(progress)
          if (latestPlan.nextRequest) onStart(latestPlan.nextRequest)
        }}
        onSkip={onSkipOnboarding}
      />
    )
  }

  const startNext = () => {
    const latestPlan = buildDailyPlan(progress)
    onStart(latestPlan.complete ? buildDeepDiveRequest(progress) : latestPlan.nextRequest ?? buildDeepDiveRequest(progress))
  }
  const position = plan.position

  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
      <header className="grid gap-6 border-b border-zinc-950/8 pb-8 md:grid-cols-[minmax(0,1fr)_auto] md:items-end dark:border-white/8">
        <div className="min-w-0" aria-live="polite">
          <p className="font-mono text-sm font-medium text-brand-700 dark:text-brand-300">
            今天，{plan.profile.label}强度，约 {plan.profile.minutes} 分钟
          </p>
          <h1 className="mt-2 max-w-[20ch] text-3xl font-semibold text-balance text-zinc-950 sm:text-4xl dark:text-white">
            {plan.headline}
          </h1>
          <p className="mt-3 max-w-[60ch] text-base text-pretty text-zinc-600 sm:text-sm dark:text-zinc-400">
            {plan.description}
          </p>
        </div>
        <div className="grid gap-2 md:justify-items-end">
          <Button
            variant="primary"
            size="default"
            className="w-full md:w-auto"
            leadingIcon={plan.complete ? ArrowRight : Play}
            onClick={startNext}
          >
            {plan.ctaLabel}
          </Button>
          <p className="text-base text-zinc-500 tabular-nums sm:text-sm dark:text-zinc-400">
            今天已完成 {plan.attempted} 题
          </p>
        </div>
      </header>

      <section aria-labelledby="today-path-title" className="grid gap-5">
        <div className="min-w-0">
          <div className="min-w-0">
            <h2 id="today-path-title" className="text-xl font-semibold text-zinc-950 dark:text-white">今日轨迹</h2>
            <p className="mt-1 text-base text-pretty text-zinc-600 sm:text-sm dark:text-zinc-400">系统按顺序推进，当前步骤不需要手动选择。</p>
          </div>
        </div>
        <div className="@container">
          <ol role="list" className="grid divide-y divide-zinc-950/8 border-y border-zinc-950/8 @3xl:grid-cols-4 @3xl:divide-x @3xl:divide-y-0 dark:divide-white/8 dark:border-white/8">
            {plan.steps.map((step, index) => (
              <DailyStepItem key={step.id} step={step} index={index + 1} />
            ))}
          </ol>
        </div>
      </section>

      <section className="grid gap-8 border-t border-zinc-950/8 pt-8 lg:grid-cols-[5fr_4fr] dark:border-white/8">
        <div aria-labelledby="position-title" className="grid content-start gap-4">
          <div>
            <p className="font-mono text-sm font-medium text-blue-700 dark:text-blue-300">完整路线 {position.stage.index} / 9</p>
            <h2 id="position-title" className="mt-2 text-xl font-semibold text-zinc-950 dark:text-white">{position.stage.title}</h2>
            <p className="mt-2 max-w-[58ch] text-base text-pretty text-zinc-600 sm:text-sm dark:text-zinc-400">{position.stage.description}</p>
          </div>
          <div className="grid gap-2">
            <div className="flex items-center justify-between gap-4">
              <p className="text-base text-zinc-600 sm:text-sm dark:text-zinc-400">阶段位置</p>
              <p className="text-base text-zinc-500 tabular-nums sm:text-sm dark:text-zinc-400">
                {position.completed} / {position.total}
              </p>
            </div>
            <ProgressBar value={position.percent} label={`${position.stage.title}阶段位置`} tone="green" />
          </div>
        </div>

        <div className="grid content-start gap-7 border-t border-zinc-950/8 pt-7 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8 dark:border-white/8">
          <div aria-labelledby="forecast-title">
            <h2 id="forecast-title" className="font-semibold text-zinc-950 dark:text-white">未来 24 小时</h2>
            <p className="mt-2 text-base text-pretty text-zinc-600 sm:text-sm dark:text-zinc-400">{forecastText(plan)}</p>
          </div>
          <div aria-labelledby="intensity-title" className="grid gap-3">
            <div>
              <h2 id="intensity-title" className="font-semibold text-zinc-950 dark:text-white">训练强度</h2>
              <p className="mt-1 text-base text-pretty text-zinc-600 sm:text-sm dark:text-zinc-400">随时调节；已完成的内容不会丢失。</p>
            </div>
            <TrainingIntensityControl
              value={progress.settings.dailyMinutes}
              onChange={onIntensityChange}
              labelledBy="intensity-title"
            />
          </div>
        </div>
      </section>
    </div>
  )
}

function DailyStepItem({ step, index }: { step: DailyStep; index: number }) {
  const icon = step.status === 'done'
    ? Check
    : step.status === 'current'
      ? CircleDot
      : step.status === 'skipped'
        ? Minus
        : Circle
  const statusLabel = ({ done: '已完成', current: '进行中', upcoming: '待进行', skipped: '今日跳过' })[step.status]

  return (
    <li
      aria-current={step.status === 'current' ? 'step' : undefined}
      className={step.status === 'current' ? 'min-w-0 bg-blue-500/6 p-4 dark:bg-blue-400/8' : 'min-w-0 p-4'}
    >
      <div className="flex min-w-0 items-start gap-3">
        <AppIcon
          icon={icon}
          className={step.status === 'done'
            ? 'stroke-emerald-600 dark:stroke-emerald-400'
            : step.status === 'current'
              ? 'stroke-blue-600 dark:stroke-blue-400'
              : 'stroke-zinc-400 dark:stroke-zinc-500'}
        />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-baseline justify-between gap-3">
            <h3 className="truncate font-medium text-zinc-950 dark:text-white">{step.label}</h3>
            <p className={step.status === 'current'
              ? 'shrink-0 font-mono text-sm text-zinc-700 tabular-nums dark:text-zinc-300'
              : 'shrink-0 font-mono text-sm text-zinc-500 tabular-nums dark:text-zinc-400'}>
              {String(index).padStart(2, '0')}
            </p>
          </div>
          <p className="mt-1 text-base text-pretty text-zinc-600 sm:text-sm dark:text-zinc-400">{step.detail}</p>
          <p className={step.status === 'current'
            ? 'mt-2 text-base font-medium text-blue-700 sm:text-sm dark:text-blue-300'
            : 'mt-2 text-base font-medium text-zinc-500 sm:text-sm dark:text-zinc-400'}>
            {statusLabel}
          </p>
        </div>
      </div>
    </li>
  )
}

function forecastText(plan: ReturnType<typeof buildDailyPlan>): string {
  const extra = plan.extraIntroduced ? `今天额外引入了 ${plan.extraIntroduced} 个内容。` : ''
  if (!plan.forecastDue) return `${extra}暂时没有内容即将到期，下一次会继续当前阶段。`
  if (plan.forecastNewLimit < plan.profile.newItems) {
    return `${extra}预计先复习 ${plan.forecastDue} 项，新内容上限会自动降到 ${plan.forecastNewLimit} 个。`
  }
  return `${extra}预计先复习 ${plan.forecastDue} 项，完成后再继续新内容。`
}

function FirstLessonView({ onStart, onSkip }: { onStart: () => void; onSkip: () => void }) {
  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
      <header className="grid gap-6 border-b border-zinc-950/8 pb-8 md:grid-cols-[minmax(0,1fr)_auto] md:items-end dark:border-white/8">
        <div className="min-w-0">
          <p className="font-mono text-sm font-medium text-brand-700 dark:text-brand-300">从零开始，第 1 课，约 3 分钟</p>
          <h1 className="mt-2 max-w-[18ch] text-3xl font-semibold text-balance text-zinc-950 sm:text-4xl dark:text-white">先看答案，不会也能开始</h1>
          <div className="mt-4 grid max-w-[58ch] gap-1 text-base text-pretty text-zinc-600 dark:text-zinc-300">
            <p>汉字会拆成字根。</p>
            <p>每个字根固定对应两个字母：第一个叫大码，第二个叫小码。</p>
            <p>实际输入全部使用小写，不需要按 Shift。</p>
          </div>
        </div>
        <Button variant="primary" size="default" leadingIcon={Play} onClick={onStart}>
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
                  <p className="pt-1 text-base font-medium text-zinc-700 dark:text-zinc-200">{stroke.name}</p>
                  <p className="font-root text-3xl font-medium text-zinc-950 dark:text-white">{stroke.glyph}</p>
                  <div className="min-w-0">
                    <p className="font-mono text-2xl font-semibold text-brand-700 dark:text-brand-300">{stroke.code}</p>
                    <p className="mt-1 text-base text-pretty text-zinc-600 sm:text-sm dark:text-zinc-300">{hint.mnemonic}</p>
                  </div>
                </li>
              )
            })}
          </ul>
          <p className="mt-4 text-base font-medium text-zinc-700 dark:text-zinc-200">横 fi，竖 gs，撇 tp，点/捺 id，折 ae。</p>
        </section>

        <aside aria-labelledby="lesson-steps-title" className="border-t border-zinc-950/8 pt-6 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-7 dark:border-white/8">
          <h2 id="lesson-steps-title" className="font-semibold text-zinc-950 dark:text-white">接下来只做三步</h2>
          <ol role="list" className="mt-4 grid gap-5">
            <FirstLessonStep index="01" title="看答案" detail="先把上面五组看一遍" />
            <FirstLessonStep index="02" title="照着打" detail="答案保持显示，不计分" />
            <FirstLessonStep index="03" title="自己回忆" detail="最后才遮住答案练习" />
          </ol>
          <div className="mt-7 border-t border-zinc-950/8 pt-5 dark:border-white/8">
            <p className="text-base text-zinc-500 sm:text-sm dark:text-zinc-400">现在不用管：完整字根表、拆字规则、简码和速度。</p>
            <Button variant="ghost" size="compact" className="mt-3" trailingIcon={ArrowRight} onClick={onSkip}>我已经学过</Button>
          </div>
        </aside>
      </div>
    </div>
  )
}

function FirstLessonStep({ index, title, detail }: { index: string; title: string; detail: string }) {
  return (
    <li className="grid grid-cols-[2rem_1fr] gap-3">
      <p className="font-mono text-sm text-zinc-500 tabular-nums dark:text-zinc-400">{index}</p>
      <div>
        <p className="text-base font-medium text-zinc-950 sm:text-sm dark:text-white">{title}</p>
        <p className="mt-1 text-base text-zinc-500 sm:text-sm dark:text-zinc-400">{detail}</p>
      </div>
    </li>
  )
}
