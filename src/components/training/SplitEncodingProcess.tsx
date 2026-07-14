import { ArrowRight } from 'lucide-react'
import clsx from 'clsx'
import { ruleLabels } from '../../data/curriculum'
import { buildSplitEncoding, displaySplitRootGlyph, formatRootCode } from '../../lib/splitEncoding'
import type { SplitEntry } from '../../types'
import { AppIcon } from '../ui/AppIcon'

interface SplitEncodingProcessProps {
  split: SplitEntry
  className?: string
  showReason?: boolean
}

export function SplitEncodingProcess({ split, className, showReason = true }: SplitEncodingProcessProps) {
  const encoding = buildSplitEncoding(split)

  return (
    <section aria-label={`“${split.char}”的拆字过程`} className={clsx('grid gap-4', className)}>
      <ol role="list" className="grid gap-4 sm:grid-cols-[minmax(0,30fr)_minmax(0,20fr)_minmax(6rem,11fr)] sm:gap-0">
        <li className="grid min-w-0 content-start gap-2 sm:pr-5">
          <p className="font-mono text-sm font-medium text-zinc-600 tabular-nums dark:text-zinc-400">01 拆成字根</p>
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <p className="font-root text-3xl font-medium text-zinc-950 dark:text-white">{split.char}</p>
            <AppIcon icon={ArrowRight} className="stroke-zinc-400 dark:stroke-zinc-500" />
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              {split.roots.map((glyph, index) => (
                <div key={`${glyph}-${index}`} className="inline-flex items-baseline gap-1">
                  {index ? <span className="text-zinc-600 dark:text-zinc-400">+</span> : null}
                  <p className="font-root text-xl font-medium text-zinc-950 dark:text-white">{displaySplitRootGlyph(glyph, encoding.rootCodes[index])}</p>
                  <p className="font-mono text-sm text-zinc-600 dark:text-zinc-400">{formatRootCode(encoding.rootCodes[index])}</p>
                </div>
              ))}
            </div>
          </div>
        </li>

        <li className="grid content-start gap-2 border-t border-zinc-950/8 pt-4 sm:border-t-0 sm:border-l sm:py-0 sm:px-5 dark:border-white/8">
          <p className="font-mono text-sm font-medium text-zinc-600 tabular-nums dark:text-zinc-400">02 套公式 {encoding.formula}</p>
          <p className="text-base text-pretty text-zinc-600 sm:text-sm dark:text-zinc-300">{encoding.formulaText}</p>
          <div className="flex flex-wrap items-center gap-1.5" aria-label={`依次取 ${encoding.picks.map((pick) => pick.letter).join('、')}`}>
            {encoding.picks.map((pick, index) => (
              <div key={`${pick.rootIndex}-${pick.codeIndex}-${index}`} className="inline-flex items-center gap-1.5">
                {index ? <span className="text-zinc-600 dark:text-zinc-400">+</span> : null}
                <p className="font-mono text-lg font-semibold text-brand-700 dark:text-brand-300">
                  {pick.codeIndex === 0 ? pick.letter.toUpperCase() : pick.letter}
                </p>
              </div>
            ))}
          </div>
        </li>

        <li className="grid content-start gap-2 border-t border-zinc-950/8 pt-4 sm:border-t-0 sm:border-l sm:py-0 sm:pl-5 dark:border-white/8">
          <p className="font-mono text-sm font-medium text-zinc-600 tabular-nums dark:text-zinc-400">03 输入全码</p>
          <p className="font-mono text-2xl font-semibold text-zinc-950 dark:text-white">{split.code}</p>
        </li>
      </ol>

      {showReason ? (
        <p className="border-t border-zinc-950/8 pt-3 text-base text-pretty text-zinc-600 sm:text-sm dark:border-white/8 dark:text-zinc-300">
          <span className="font-medium text-zinc-950 dark:text-white">{split.rule ? ruleLabels[split.rule] : '按书写顺序'}：</span>
          {split.rule === 'cut' ? '切字用于离析糅合度较高的字根，需要把一整笔想象剪开。' : ''}
          {split.note.replace(/^重试：/, '').replace(/^字根码：.*$/, '按上面的字根顺序取码。')}
        </p>
      ) : null}
    </section>
  )
}
