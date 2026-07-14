interface ProgressBarProps {
  value: number
  label: string
  tone?: 'brand' | 'blue' | 'green'
}

const tones = {
  brand: 'bg-brand-500',
  blue: 'bg-blue-500',
  green: 'bg-emerald-500',
}

export function ProgressBar({ value, label, tone = 'brand' }: ProgressBarProps) {
  const bounded = Math.min(100, Math.max(0, value))
  return (
    <div>
      <div className="sr-only">{label}：{bounded}%</div>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-zinc-950/8 dark:bg-white/10"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={bounded}
      >
        <div
          className={`h-full w-(--progress) rounded-full ${tones[tone]}`}
          style={{ '--progress': `${bounded}%` } as React.CSSProperties}
        />
      </div>
    </div>
  )
}
