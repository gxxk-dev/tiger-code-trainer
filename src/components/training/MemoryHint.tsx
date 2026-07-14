import { Lightbulb } from 'lucide-react'
import clsx from 'clsx'
import { AppIcon } from '../ui/AppIcon'

interface MemoryHintProps {
  text: string
  className?: string
}

export function MemoryHint({ text, className }: MemoryHintProps) {
  return (
    <div className={clsx('flex min-w-0 items-start gap-2', className)}>
      <AppIcon icon={Lightbulb} className="stroke-blue-600 dark:stroke-blue-300" />
      <div className="min-w-0">
        <p className="font-medium text-blue-800 dark:text-blue-200">记忆 Hint</p>
        <p className="mt-1 text-base text-pretty text-zinc-700 sm:text-sm dark:text-zinc-300">{text}</p>
      </div>
    </div>
  )
}
