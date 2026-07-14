import type { LucideIcon } from 'lucide-react'
import clsx from 'clsx'

interface AppIconProps {
  icon: LucideIcon
  className?: string
  inline?: boolean
}

export function AppIcon({ icon: Icon, className, inline = true }: AppIconProps) {
  return (
    <Icon
      aria-hidden="true"
      focusable="false"
      className={clsx('size-4 shrink-0', inline && 'h-lh', className)}
    />
  )
}
