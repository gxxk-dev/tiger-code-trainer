import { ScanSearch } from 'lucide-react'
import clsx from 'clsx'
import { displayRootGlyph } from '../../lib/items'
import { getRootApplicationExample, hasUnrenderableRootExample, rootExampleCharacters } from '../../lib/rootExamples'
import { displaySplitRootGlyph, formatRootCode } from '../../lib/splitEncoding'
import type { RootEntry } from '../../types'
import { AppIcon } from '../ui/AppIcon'

interface RootExampleProcessProps {
  root: RootEntry
  className?: string
}

export function RootExampleProcess({ root, className }: RootExampleProcessProps) {
  const example = getRootApplicationExample(root)
  const fallbackExamples = rootExampleCharacters(root).slice(0, 4)
  const hasFallbackPart = example?.parts.some((part) => part.fallback)
  const hasUnrenderableTarget = hasUnrenderableRootExample(root) && (!example || example.parts.length === 1)

  if (!example && !fallbackExamples.length) return null

  return (
    <section aria-label={`字根“${displayRootGlyph(root.root, root.code)}”的例字`} className={clsx('grid w-full max-w-xl gap-3 border-y border-zinc-950/8 py-4 text-left dark:border-white/8', className)}>
      <div className="flex items-start gap-2">
        <AppIcon icon={ScanSearch} className="stroke-zinc-500 dark:stroke-zinc-400" />
        <div className="min-w-0">
          <h2 className="font-semibold text-zinc-950 dark:text-white">例字是字根或变形出现过的整字</h2>
          <p className="mt-1 text-base text-pretty text-zinc-600 sm:text-sm dark:text-zinc-300">它只帮你在真实汉字里认出当前零件，不是另一组编码。</p>
        </div>
      </div>

      {example ? (
        <div
          role="group"
          className="flex min-w-0 flex-wrap items-center gap-2"
          aria-label={`${example.char}拆成${example.parts.map((part) => part.glyph).join('加')}，当前字根是${example.parts.find((part) => part.target)?.glyph}`}
        >
          <p className="font-root text-3xl font-medium text-zinc-950 dark:text-white">{example.char}</p>
          <span className="text-zinc-400 dark:text-zinc-500" aria-hidden="true">→</span>
          {example.parts.map((part, index) => (
            <div key={`${part.glyph}-${index}`} className="inline-flex items-baseline gap-1">
              {index ? <span className="text-zinc-500 dark:text-zinc-400">+</span> : null}
              {part.target ? <span className="rounded-sm bg-zinc-900 px-1.5 py-0.5 text-base font-medium text-white sm:text-sm dark:bg-white dark:text-zinc-950">当前根</span> : null}
              <p className={part.target
                ? 'rounded-sm bg-emerald-500/10 px-1.5 py-1 font-root text-xl font-medium text-emerald-800 ring-1 ring-emerald-500/20 dark:text-emerald-200'
                : 'px-1 py-1 font-root text-xl font-medium text-zinc-700 dark:text-zinc-200'}>
                {displaySplitRootGlyph(part.glyph, part.code)}
              </p>
              <p className={part.target
                ? 'font-mono text-sm font-medium text-emerald-700 dark:text-emerald-300'
                : 'font-mono text-sm text-zinc-500 dark:text-zinc-400'}>
                {formatRootCode(part.code)}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="font-root text-lg text-zinc-700 dark:text-zinc-200">例字：{fallbackExamples.join('、')}</p>
      )}

      {example ? (
        <p className="text-base text-pretty text-zinc-600 sm:text-sm dark:text-zinc-300">
          {example.parts.length === 1
            ? '这个例字不需要再拆，整字本身就是当前字根。'
            : '标有“当前根”的部分就是当前字根或它的常见变形。整字以后会按完整拆分取码，'}
          本轮仍只练根码 <span className="font-mono font-semibold text-zinc-950 dark:text-white">{root.code}</span>。
        </p>
      ) : null}
      {hasUnrenderableTarget ? (
        <p className="text-base text-pretty text-zinc-500 sm:text-sm dark:text-zinc-400">这些例字使用了当前字根的特殊变形，但系统字体无法可靠显示目标字形，所以这里不伪造拆分；请在查码页的官方字根图核对原形。</p>
      ) : null}
      {hasFallbackPart ? (
        <p className="text-base text-pretty text-zinc-500 sm:text-sm dark:text-zinc-400">这个例字含系统字体无法显示的特殊变形，当前以同码主根代示；可在查码页的官方字根图核对原形。</p>
      ) : null}
    </section>
  )
}
