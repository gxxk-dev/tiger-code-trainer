import { ArrowRight, RotateCcw } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { dueItemIds, getItemLabel, weakItemIds } from '../lib/items'
import { masteryPercent } from '../lib/mastery'
import type { ProgressState, TrainingRequest } from '../types'

interface ReviewViewProps {
  progress: ProgressState
  onStart: (request: TrainingRequest) => void
}

export function ReviewView({ progress, onStart }: ReviewViewProps) {
  const dueIds = dueItemIds(progress)
  const weakIds = weakItemIds(progress)

  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
      <header className="flex flex-col gap-6 border-b border-zinc-950/8 pb-8 sm:flex-row sm:items-end sm:justify-between dark:border-white/8">
        <div>
          <p className="font-mono text-sm font-medium text-blue-700 dark:text-blue-300">间隔复习</p>
          <h1 className="mt-2 max-w-[20ch] text-3xl font-semibold text-balance text-zinc-950 sm:text-4xl dark:text-white">
            {dueIds.length ? `${dueIds.length} 个内容现在该复习` : '今天没有到期内容'}
          </h1>
          <p className="mt-3 max-w-[56ch] text-base text-pretty text-zinc-600 sm:text-sm dark:text-zinc-400">
            到期内容优先；反复出错的项目会单独进入薄弱项。
          </p>
        </div>
        <Button
          variant="primary"
          leadingIcon={<RotateCcw className="size-4" aria-hidden="true" />}
          disabled={!dueIds.length && !weakIds.length}
          onClick={() => onStart({ kind: 'review', title: '到期复习', itemIds: (dueIds.length ? dueIds : weakIds).slice(0, 16) })}
        >
          开始复习
        </Button>
      </header>

      <section aria-labelledby="due-title">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 id="due-title" className="text-xl font-semibold text-zinc-950 dark:text-white">到期队列</h2>
            <p className="mt-1 text-base text-zinc-600 sm:text-sm dark:text-zinc-400">按最早到期的顺序排列。</p>
          </div>
          <span className="text-sm text-zinc-500 tabular-nums dark:text-zinc-400">{dueIds.length} 项</span>
        </div>
        {dueIds.length ? (
          <ItemList ids={dueIds.slice(0, 20)} progress={progress} onStart={(id) => onStart({ kind: 'review', title: '单项复习', itemIds: [id] })} />
        ) : (
          <EmptyState title="队列已经清空" detail="可以继续课程，新的复习会按记忆间隔自动出现。" />
        )}
      </section>

      <section aria-labelledby="weak-title" className="border-t border-zinc-950/8 pt-8 dark:border-white/8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 id="weak-title" className="text-xl font-semibold text-zinc-950 dark:text-white">薄弱项</h2>
            <p className="mt-1 text-base text-zinc-600 sm:text-sm dark:text-zinc-400">至少练过两次，并且出现过遗忘。</p>
          </div>
          {weakIds.length ? (
            <Button size="compact" trailingIcon={<ArrowRight className="size-4" aria-hidden="true" />} onClick={() => onStart({ kind: 'review', title: '薄弱项专项', itemIds: weakIds.slice(0, 16) })}>
              专项复习
            </Button>
          ) : null}
        </div>
        {weakIds.length ? (
          <ItemList ids={weakIds.slice(0, 20)} progress={progress} onStart={(id) => onStart({ kind: 'review', title: '单项复习', itemIds: [id] })} />
        ) : (
          <EmptyState title="还没有薄弱项" detail="开始训练后，这里会归拢真正需要加强的内容。" />
        )}
      </section>
    </div>
  )
}

function ItemList({ ids, progress, onStart }: { ids: string[]; progress: ProgressState; onStart: (id: string) => void }) {
  return (
    <ul role="list" className="mt-5 grid divide-y divide-zinc-950/8 border-y border-zinc-950/8 sm:grid-cols-2 sm:gap-x-8 sm:divide-y-0 dark:divide-white/8 dark:border-white/8 sm:[&>li]:border-b sm:[&>li]:border-zinc-950/8 sm:dark:[&>li]:border-white/8">
      {ids.map((id) => {
        const item = getItemLabel(id)
        const record = progress.mastery[id]
        return (
          <li key={id}>
            <button type="button" onClick={() => onStart(id)} className="group flex w-full min-w-0 items-center gap-4 py-4 text-left outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-500">
              <span className="flex size-11 shrink-0 items-center justify-center font-root text-2xl font-medium text-zinc-950 sm:size-9 sm:text-xl dark:text-white">{item.glyph}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-base font-medium text-zinc-950 sm:text-sm dark:text-white">{item.detail}</span>
                <span className="mt-1 block truncate text-sm text-zinc-500 tabular-nums dark:text-zinc-400">{record.attempts} 次 · 遗忘 {record.lapses} 次</span>
              </span>
              <span className="text-sm text-zinc-500 tabular-nums dark:text-zinc-400">{masteryPercent(record)}%</span>
              <ArrowRight className="size-4 shrink-0 text-zinc-500 group-hover:text-zinc-950 dark:group-hover:text-white" aria-hidden="true" />
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="mt-5 rounded-md bg-zinc-950/4 p-5 dark:bg-white/5">
      <p className="font-medium text-zinc-950 dark:text-white">{title}</p>
      <p className="mt-1 text-base text-pretty text-zinc-600 sm:text-sm dark:text-zinc-400">{detail}</p>
    </div>
  )
}
