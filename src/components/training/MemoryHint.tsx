import { Lightbulb } from 'lucide-react'
import clsx from 'clsx'

interface MemoryHintProps {
  text: string
  className?: string
}

export function MemoryHint({ text, className }: MemoryHintProps) {
  return (
    <div className={clsx('flex min-w-0 items-start gap-2', className)}>
      <Lightbulb className="size-4 h-lh shrink-0 stroke-blue-600 dark:stroke-blue-300" aria-hidden="true" />
      <div className="min-w-0">
        <p className="font-medium text-blue-800 dark:text-blue-200">记忆 Hint</p>
        <p className="mt-1 text-base text-pretty text-zinc-700 sm:text-sm dark:text-zinc-300">{text}</p>
      </div>
    </div>
  )
}
