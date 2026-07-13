import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import clsx from 'clsx'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: 'compact' | 'default'
  leadingIcon?: ReactNode
  trailingIcon?: ReactNode
}

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-brand-600 text-white ring-1 ring-brand-600 hover:bg-brand-700 focus-visible:outline-brand-500',
  secondary: 'bg-white text-zinc-800 ring-1 ring-zinc-950/10 hover:bg-zinc-50 focus-visible:outline-brand-500 dark:bg-white/5 dark:text-zinc-100 dark:ring-white/10 dark:hover:bg-white/10',
  ghost: 'text-zinc-600 hover:bg-zinc-950/5 hover:text-zinc-950 focus-visible:outline-brand-500 dark:text-zinc-300 dark:hover:bg-white/10 dark:hover:text-white',
  danger: 'bg-red-500/10 text-red-700 ring-1 ring-red-600/15 hover:bg-red-500/15 focus-visible:outline-red-500 dark:text-red-300 dark:ring-red-400/20',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({
  variant = 'secondary',
  size = 'default',
  leadingIcon,
  trailingIcon,
  className,
  children,
  ...props
}, ref) {
  return (
    <button
      ref={ref}
      type="button"
      className={clsx(
        'inline-flex shrink-0 items-center justify-center gap-2 rounded-md font-medium outline-none disabled:pointer-events-none disabled:opacity-45',
        size === 'default' ? 'min-h-10 py-2.5 text-base sm:min-h-9 sm:py-2 sm:text-sm' : 'min-h-9 py-2 text-base sm:min-h-7 sm:py-1.5 sm:text-sm',
        leadingIcon || trailingIcon ? 'pr-3 pl-2' : 'px-3',
        'focus-visible:outline-2 focus-visible:outline-offset-2',
        variants[variant],
        className,
      )}
      {...props}
    >
      {leadingIcon}
      {children}
      {trailingIcon}
    </button>
  )
})

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  children: ReactNode
}

export function IconButton({ label, children, className, ...props }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={clsx(
        'relative inline-flex size-9 shrink-0 items-center justify-center rounded-md text-zinc-600 outline-none hover:bg-zinc-950/5 hover:text-zinc-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 dark:text-zinc-300 dark:hover:bg-white/10 dark:hover:text-white',
        className,
      )}
      {...props}
    >
      {children}
      <span className="absolute top-1/2 left-1/2 size-[max(100%,3rem)] -translate-1/2 pointer-fine:hidden" aria-hidden="true" />
    </button>
  )
}
