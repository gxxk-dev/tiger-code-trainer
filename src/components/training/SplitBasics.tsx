import { BookOpen, ChevronDown, Scissors } from 'lucide-react'
import clsx from 'clsx'
import { AppIcon } from '../ui/AppIcon'

interface SplitBasicsProps {
  className?: string
  framed?: boolean
}

export function SplitBasics({ className, framed = true }: SplitBasicsProps) {
  return (
    <section aria-labelledby="split-basics-title" className={clsx('grid gap-5 py-5', framed && 'border-y border-zinc-950/8 dark:border-white/8', className)}>
      <div>
        <p className="font-mono text-sm font-medium text-brand-700 dark:text-brand-300">拆字前先分清两个概念</p>
        <h2 id="split-basics-title" className="mt-1 text-xl font-semibold text-balance text-zinc-950 dark:text-white">虎码拆分不是按部首分类</h2>
        <p className="mt-2 max-w-[62ch] text-base text-pretty text-zinc-600 sm:text-sm dark:text-zinc-300">部首用于字典检索，一个字通常归到一个部首。虎码要用一个或多个官方字根覆盖整个字形，字根可以是整字、部件、变形或单笔。</p>
      </div>

      <dl className="grid divide-y divide-zinc-950/8 border-y border-zinc-950/8 sm:grid-cols-2 sm:divide-x sm:divide-y-0 dark:divide-white/8 dark:border-white/8">
        <div className="grid content-start gap-2 py-4 sm:pr-5">
          <dt className="font-medium text-zinc-950 dark:text-white">普通拆分，不断笔</dt>
          <dd className="font-root text-2xl font-medium text-zinc-950 dark:text-white">柯 → 木 + 可</dd>
          <dd className="text-base text-pretty text-zinc-600 sm:text-sm dark:text-zinc-300">沿左右已有的自然边界分开，没有剪断任何一笔。</dd>
        </div>
        <div className="grid content-start gap-2 py-4 sm:pl-5">
          <dt className="flex items-start gap-2 font-medium text-zinc-950 dark:text-white"><AppIcon icon={Scissors} />切字，必要时剪断一笔</dt>
          <dd className="font-root text-2xl font-medium text-zinc-950 dark:text-white">果 → 田 + 木</dd>
          <dd className="text-base text-pretty text-zinc-600 sm:text-sm dark:text-zinc-300">中间竖画跨过两个目标字根，需要横向想象剪开一次。</dd>
        </div>
      </dl>

      <div className="grid gap-2 text-base text-pretty text-zinc-600 sm:text-sm dark:text-zinc-300">
        <p><span className="font-medium text-zinc-950 dark:text-white">初学时这样看：</span>先认能直接看出的完整字根，再按上下、左右和书写顺序排列；辶与廴最后取。只有官方拆分必须截断连续笔画时，才标为切字。</p>
        <p>切字通常只切一次。惠拆成十 + 田 + 厶 + 心，是官方点名的两次切字例外，先直接记住结果。</p>
      </div>
    </section>
  )
}

export function SplitBasicsDisclosure({ className }: { className?: string }) {
  return (
    <details className={clsx('group border-y border-zinc-950/8 dark:border-white/8', className)}>
      <summary className="focus-visible:outline-brand-500 flex min-h-12 cursor-pointer list-none items-center gap-2 py-3 font-medium text-zinc-800 outline-none marker:content-none focus-visible:outline-2 focus-visible:-outline-offset-1 dark:text-zinc-200">
        <AppIcon icon={BookOpen} />
        <span className="min-w-0 flex-1">重看普通拆分与切字</span>
        <AppIcon icon={ChevronDown} className="transition-transform group-open:rotate-180 motion-reduce:transition-none" />
      </summary>
      <div className="border-t border-zinc-950/8 dark:border-white/8">
        <SplitBasics framed={false} />
      </div>
    </details>
  )
}
