import type { ProgressState } from '../types'
import { orderedRoots } from '../data/curriculum'
import { masteryPercent } from '../lib/mastery'
import { rootId } from '../lib/items'

const rows = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm']

interface KeyboardMapProps {
  progress: ProgressState
  onSelectKey?: (key: string) => void
}

export function KeyboardMap({ progress, onSelectKey }: KeyboardMapProps) {
  const scores = new Map<string, number>()
  for (const key of 'abcdefghijklmnopqrstuvwxyz') {
    const keyRoots = orderedRoots.filter((root) => root.code[0] === key)
    const score = keyRoots.length
      ? Math.round(keyRoots.reduce((sum, root) => sum + masteryPercent(progress.mastery[rootId(root)]), 0) / keyRoots.length)
      : 0
    scores.set(key, score)
  }

  return (
    <div className="grid gap-1.5" aria-label="字根键盘掌握图">
      {rows.map((row, rowIndex) => (
        <div
          key={row}
          className="grid auto-cols-fr grid-flow-col gap-1.5 [margin-inline:var(--row-offset)]"
          style={{ '--row-offset': `${rowIndex * 3}%` } as React.CSSProperties}
        >
          {Array.from(row).map((key) => {
            const score = scores.get(key) ?? 0
            const rootCount = orderedRoots.filter((root) => root.code[0] === key).length
            return (
              <button
                type="button"
                key={key}
                onClick={() => onSelectKey?.(key)}
                className="group relative aspect-square min-w-0 rounded-md bg-white text-left text-sm ring-1 ring-zinc-950/10 outline-none hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 dark:bg-white/5 dark:ring-white/10 dark:hover:bg-white/10"
                aria-label={`${key.toUpperCase()} 键，${rootCount} 个字根，掌握 ${score}%`}
              >
                <span className="absolute inset-x-1.5 top-1.5 truncate font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                  {key.toUpperCase()}
                </span>
                <span className="absolute inset-x-1.5 bottom-1.5 h-1 overflow-hidden rounded-full bg-zinc-950/8 dark:bg-white/10">
                  <span
                    className="block h-full w-(--key-progress) rounded-full bg-blue-500"
                    style={{ '--key-progress': `${score}%` } as React.CSSProperties}
                  />
                </span>
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}
