import clsx from 'clsx'
import { intensityProfiles } from '../lib/intensity'
import type { AppSettings } from '../types'

interface TrainingIntensityControlProps {
  value: AppSettings['dailyMinutes']
  onChange: (minutes: AppSettings['dailyMinutes']) => void
  labelledBy?: string
  className?: string
}

export function TrainingIntensityControl({ value, onChange, labelledBy, className }: TrainingIntensityControlProps) {
  return (
    <div
      className={clsx('grid grid-cols-3 gap-1 rounded-lg bg-zinc-950/5 p-1 dark:bg-white/6', className)}
      role="group"
      aria-label={labelledBy ? undefined : '训练强度'}
      aria-labelledby={labelledBy}
    >
      {intensityProfiles.map((profile) => (
        <button
          type="button"
          key={profile.minutes}
          onClick={() => onChange(profile.minutes)}
          aria-pressed={value === profile.minutes}
          className={clsx(
            'min-h-11 rounded-md px-2 text-base font-medium tabular-nums outline-none focus-visible:outline-2 focus-visible:outline-brand-500 sm:min-h-9 sm:text-sm',
            value === profile.minutes
              ? 'bg-white text-zinc-950 shadow-sm ring-1 ring-zinc-950/5 dark:bg-white/10 dark:text-white dark:shadow-none dark:ring-white/8'
              : 'text-zinc-600 dark:text-zinc-400',
          )}
        >
          {profile.label} · <span className="whitespace-nowrap">{profile.minutes} 分</span>
        </button>
      ))}
    </div>
  )
}
