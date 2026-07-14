import { useMemo, useState } from 'react'
import { Play } from 'lucide-react'
import clsx from 'clsx'
import { Button } from '../components/ui/Button'
import { basicStrokes } from '../data/curriculum'
import { rootId } from '../lib/items'
import type { ProgressState, SessionRecord, TrainingRequest } from '../types'

type Range = 7 | 30 | 'all'

interface StatsViewProps {
  progress: ProgressState
  onStart: (request: TrainingRequest) => void
}

export function StatsView({ progress, onStart }: StatsViewProps) {
  const [range, setRange] = useState<Range>(7)
  const sessions = useMemo(() => {
    if (range === 'all') return progress.sessions
    const cutoff = Date.now() - range * 24 * 60 * 60_000
    return progress.sessions.filter((session) => session.finishedAt >= cutoff)
  }, [progress.sessions, range])

  const attempted = sessions.reduce((sum, session) => sum + session.attempted, 0)
  const correct = sessions.reduce((sum, session) => sum + session.correct, 0)
  const firstTry = sessions.reduce((sum, session) => sum + session.firstTryCorrect, 0)
  const responseTimes = sessions.map((session) => session.medianMs).filter(Boolean).sort((a, b) => a - b)
  const medianMs = responseTimes.length ? responseTimes[Math.floor(responseTimes.length / 2)] : 0
  const bestSpeed = Math.max(0, ...sessions.map((session) => session.charsPerMinute ?? 0))

  return (
    <div className="mx-auto grid min-w-0 max-w-6xl gap-10 px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
      <header className="flex flex-col gap-5 border-b border-zinc-950/8 pb-8 sm:flex-row sm:items-end sm:justify-between dark:border-white/8">
        <div>
          <p className="font-mono text-sm font-medium text-emerald-700 dark:text-emerald-300">学习轨迹</p>
          <h1 className="mt-2 max-w-[20ch] text-3xl font-semibold text-balance text-zinc-950 sm:text-4xl dark:text-white">速度和准确率分开看</h1>
          <p className="mt-3 max-w-[56ch] text-base text-pretty text-zinc-600 sm:text-sm dark:text-zinc-400">编码训练与真实中文输入分别记录，不用一个总分掩盖问题。</p>
        </div>
        <div className="flex gap-1 overflow-x-auto rounded-lg bg-zinc-950/5 p-1 dark:bg-white/6" role="group" aria-label="统计时间范围">
          {([7, 30, 'all'] as const).map((item) => (
            <button
              type="button"
              key={item}
              onClick={() => setRange(item)}
              aria-pressed={range === item}
              className={clsx(
                'min-h-10 shrink-0 rounded-md px-3 text-base font-medium outline-none focus-visible:outline-2 focus-visible:outline-brand-500 sm:min-h-8 sm:text-sm',
                range === item ? 'bg-white text-zinc-950 shadow-sm ring-1 ring-zinc-950/5 dark:bg-white/10 dark:text-white dark:shadow-none dark:ring-white/8' : 'text-zinc-600 dark:text-zinc-400',
              )}
            >
              {item === 'all' ? '全部' : `${item} 天`}
            </button>
          ))}
        </div>
      </header>

      {sessions.length ? (
        <>
          <section aria-label="核心指标" className="@container">
            <dl className="grid grid-cols-2 gap-y-6 @3xl:grid-cols-4">
              <Stat label="准确率" value={`${Math.round(correct / Math.max(1, attempted) * 100)}%`} detail={`${correct} / ${attempted} 题`} />
              <Stat label="首答正确" value={`${Math.round(firstTry / Math.max(1, attempted) * 100)}%`} detail="不含提示" divider />
              <Stat label="中位反应" value={medianMs ? `${(medianMs / 1000).toFixed(1)} s` : '—'} detail="编码训练" dividerDesktop />
              <Stat label="实战最佳" value={bestSpeed ? `${bestSpeed}` : '—'} detail={bestSpeed ? '字 / 分' : '暂无实战'} divider />
            </dl>
          </section>

          <section aria-labelledby="activity-title" className="grid gap-5 border-t border-zinc-950/8 pt-8 dark:border-white/8">
            <div>
              <h2 id="activity-title" className="text-xl font-semibold text-zinc-950 dark:text-white">最近 7 天</h2>
              <p className="mt-1 text-base text-zinc-600 sm:text-sm dark:text-zinc-400">柱高和数字表示当天完成题数。</p>
            </div>
            <ActivityBars sessions={progress.sessions} />
          </section>

          <section aria-labelledby="history-title" className="min-w-0 border-t border-zinc-950/8 pt-8 dark:border-white/8">
            <h2 id="history-title" className="text-xl font-semibold text-zinc-950 dark:text-white">最近训练</h2>
            <div className="-mx-4 mt-4 min-w-0 overflow-x-auto whitespace-nowrap sm:-mx-6 lg:-mx-8">
              <div className="inline-block min-w-full px-4 py-2 align-middle sm:px-6 lg:px-8">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-sm text-zinc-500 dark:text-zinc-400">
                      <th className="py-3 pr-4 font-medium whitespace-nowrap">训练</th>
                      <th className="px-4 py-3 font-medium whitespace-nowrap">准确率</th>
                      <th className="px-4 py-3 font-medium whitespace-nowrap">用时</th>
                      <th className="py-3 pl-4 text-right font-medium whitespace-nowrap">日期</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-950/8 dark:divide-white/8">
                    {[...sessions].reverse().slice(0, 12).map((session) => (
                      <tr key={session.id} className="text-base sm:text-sm">
                        <td className="py-3 pr-4 font-medium text-zinc-950 dark:text-white">{kindLabel(session.kind)}</td>
                        <td className="px-4 py-3 text-zinc-600 tabular-nums dark:text-zinc-300">{Math.round(session.correct / Math.max(1, session.attempted) * 100)}%</td>
                        <td className="px-4 py-3 text-zinc-600 tabular-nums dark:text-zinc-300">{Math.max(1, Math.round(session.durationSeconds / 60))} 分钟</td>
                        <td className="py-3 pl-4 text-right text-zinc-500 tabular-nums dark:text-zinc-400">{new Date(session.finishedAt).toLocaleDateString('zh-CN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </>
      ) : (
        <section className="grid min-h-72 place-items-center rounded-lg bg-white p-8 text-center ring-1 ring-zinc-950/8 dark:bg-white/4 dark:ring-white/8">
          <div>
            <h2 className="text-xl font-semibold text-zinc-950 dark:text-white">还没有训练记录</h2>
            <p className="mx-auto mt-2 max-w-[48ch] text-base text-pretty text-zinc-600 sm:text-sm dark:text-zinc-400">完成第一轮练习后，这里才会显示真实数据。</p>
            <Button
              variant="primary"
              className="mt-5"
              leadingIcon={Play}
              onClick={() => onStart({
                kind: 'roots',
                title: '第 1 课：五个基本笔画',
                stageId: 'strokes',
                itemIds: basicStrokes.map((stroke) => rootId(stroke.entry)),
              })}
            >
              开始第一课
            </Button>
          </div>
        </section>
      )}
    </div>
  )
}

function Stat({ label, value, detail, divider, dividerDesktop }: { label: string; value: string; detail: string; divider?: boolean; dividerDesktop?: boolean }) {
  return (
    <div className={`min-w-0 ${divider ? 'border-l border-zinc-950/8 pl-5 dark:border-white/8' : ''} ${dividerDesktop ? '@3xl:border-l @3xl:border-zinc-950/8 @3xl:pl-5 dark:@3xl:border-white/8' : ''}`}>
      <dt className="truncate text-base text-zinc-600 sm:text-sm dark:text-zinc-400">{label}</dt>
      <dd className="mt-1 truncate text-2xl font-semibold text-zinc-950 tabular-nums dark:text-white">{value}</dd>
      <dd className="mt-1 truncate text-base text-zinc-500 tabular-nums sm:text-sm dark:text-zinc-400">{detail}</dd>
    </div>
  )
}

function ActivityBars({ sessions }: { sessions: SessionRecord[] }) {
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date()
    date.setHours(0, 0, 0, 0)
    date.setDate(date.getDate() - (6 - index))
    const next = new Date(date)
    next.setDate(date.getDate() + 1)
    const count = sessions.filter((session) => session.finishedAt >= date.getTime() && session.finishedAt < next.getTime()).reduce((sum, session) => sum + session.attempted, 0)
    return { date, count }
  })
  const max = Math.max(1, ...days.map((day) => day.count))
  return (
    <ul role="list" aria-label="最近七天训练题数" className="grid h-44 grid-cols-7 items-end gap-1 border-b border-zinc-950/10 sm:gap-2 dark:border-white/10">
      {days.map((day) => (
        <li key={day.date.toISOString()} className="flex h-full min-w-0 flex-col justify-end gap-1 sm:gap-2">
          <div className="relative flex min-h-0 flex-1 items-end">
            <p className="absolute inset-x-0 top-0 truncate text-center font-mono text-sm text-zinc-600 tabular-nums dark:text-zinc-300">
              {day.count}
            </p>
            <div
              className="h-(--bar-height) w-full rounded-t-sm bg-blue-500/80"
              style={{ '--bar-height': `${Math.max(day.count ? 8 : 2, day.count / max * 100)}%` } as React.CSSProperties}
              aria-hidden="true"
            />
          </div>
          <p className="truncate text-center text-sm text-zinc-500 tabular-nums dark:text-zinc-400">{day.date.toLocaleDateString('zh-CN', { weekday: 'short' })}</p>
        </li>
      ))}
    </ul>
  )
}

function kindLabel(kind: SessionRecord['kind']): string {
  return ({ formula: '取码公式', roots: '字根', splits: '拆分', characters: '常用字', article: '真实跟打', review: '复习' })[kind]
}
