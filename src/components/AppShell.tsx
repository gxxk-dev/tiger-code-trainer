import { useEffect, useState, type ReactNode } from 'react'
import {
  BarChart3,
  BookOpen,
  Home,
  Menu,
  RotateCcw,
  Search,
  Settings,
  X,
} from 'lucide-react'
import clsx from 'clsx'
import type { ViewId } from '../types'
import { IconButton } from './ui/Button'

const navigation: Array<{ id: ViewId; label: string; icon: typeof Home }> = [
  { id: 'today', label: '今日', icon: Home },
  { id: 'course', label: '课程', icon: BookOpen },
  { id: 'review', label: '复习', icon: RotateCcw },
  { id: 'stats', label: '统计', icon: BarChart3 },
  { id: 'lookup', label: '查码', icon: Search },
]

interface AppShellProps {
  activeView: ViewId
  onViewChange: (view: ViewId) => void
  onOpenSettings: () => void
  dueCount: number
  children: ReactNode
}

export function AppShell({
  activeView,
  onViewChange,
  onOpenSettings,
  dueCount,
  children,
}: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    if (!mobileOpen) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileOpen(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [mobileOpen])

  const selectView = (view: ViewId) => {
    onViewChange(view)
    setMobileOpen(false)
  }

  return (
    <div className="isolate min-h-dvh bg-canvas text-zinc-950 dark:bg-canvas-dark dark:text-zinc-100">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-zinc-950/8 bg-white px-3 py-5 lg:flex dark:border-white/8 dark:bg-zinc-950">
        <a href={import.meta.env.BASE_URL} aria-label="Homepage" className="flex items-center gap-2 px-2 text-zinc-950 dark:text-white">
          <span className="flex size-8 items-center justify-center rounded-md bg-brand-600 font-semibold text-white" aria-hidden="true">虎</span>
          <span className="font-semibold">虎序</span>
          <span className="text-sm text-zinc-500 dark:text-zinc-400">Tiger Flow</span>
        </a>
        <nav className="mt-8" aria-label="主要导航">
          <ul role="list" className="grid gap-1">
            {navigation.map((item) => {
              const Icon = item.icon
              const active = item.id === activeView
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => selectView(item.id)}
                    aria-current={active ? 'page' : undefined}
                    className={clsx(
                      'flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500',
                      active
                        ? 'bg-zinc-950/6 text-zinc-950 dark:bg-white/10 dark:text-white'
                        : 'text-zinc-600 hover:bg-zinc-950/4 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-white/6 dark:hover:text-white',
                    )}
                  >
                    <Icon className="size-4 shrink-0" aria-hidden="true" />
                    <span className="min-w-0 flex-1 text-left">{item.label}</span>
                    {item.id === 'review' && dueCount > 0 ? (
                      <span className="rounded-full bg-blue-500/10 px-1.5 py-0.5 text-blue-700 tabular-nums dark:text-blue-300">{dueCount}</span>
                    ) : null}
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>
        <div className="mt-auto border-t border-zinc-950/8 pt-3 dark:border-white/8">
          <button
            type="button"
            onClick={onOpenSettings}
            className="flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium text-zinc-600 outline-none hover:bg-zinc-950/4 hover:text-zinc-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 dark:text-zinc-400 dark:hover:bg-white/6 dark:hover:text-white"
          >
            <Settings className="size-4 shrink-0" aria-hidden="true" />
            设置
          </button>
        </div>
      </aside>

      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-zinc-950/8 bg-canvas/90 px-4 backdrop-blur lg:hidden dark:border-white/8 dark:bg-canvas-dark/90">
        <a href={import.meta.env.BASE_URL} aria-label="Homepage" className="flex items-center gap-2 font-semibold text-zinc-950 dark:text-white">
          <span className="flex size-7 items-center justify-center rounded-md bg-brand-600 text-white" aria-hidden="true">虎</span>
          虎序
        </a>
        <IconButton label="打开导航" onClick={() => setMobileOpen(true)}>
          <Menu className="size-4" aria-hidden="true" />
        </IconButton>
      </header>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="导航菜单">
          <button type="button" className="absolute inset-0 bg-zinc-950/35" aria-label="关闭导航" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 right-0 flex w-[min(21rem,88vw)] flex-col bg-white p-4 shadow-xl dark:bg-zinc-950 dark:shadow-none dark:ring-1 dark:ring-white/10">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-zinc-950 dark:text-white">导航</p>
              <IconButton label="关闭导航" onClick={() => setMobileOpen(false)}>
                <X className="size-4" aria-hidden="true" />
              </IconButton>
            </div>
            <nav className="mt-6" aria-label="移动导航">
              <ul role="list" className="grid gap-1">
                {navigation.map((item) => {
                  const Icon = item.icon
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => selectView(item.id)}
                        className={clsx(
                          'flex w-full items-center gap-3 rounded-md p-3 text-base font-medium outline-none focus-visible:outline-2 focus-visible:outline-brand-500',
                          item.id === activeView ? 'bg-zinc-950/6 text-zinc-950 dark:bg-white/10 dark:text-white' : 'text-zinc-600 dark:text-zinc-300',
                        )}
                      >
                        <Icon className="size-4 shrink-0" aria-hidden="true" />
                        {item.label}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </nav>
            <button
              type="button"
              onClick={() => { setMobileOpen(false); onOpenSettings() }}
              className="mt-auto flex items-center gap-3 rounded-md p-3 text-base font-medium text-zinc-600 outline-none focus-visible:outline-2 focus-visible:outline-brand-500 dark:text-zinc-300"
            >
              <Settings className="size-4 shrink-0" aria-hidden="true" />
              设置
            </button>
          </div>
        </div>
      ) : null}

      <main className="min-w-0 pb-24 lg:ml-60 lg:pb-0">
        {children}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-950/8 bg-white/95 px-2 pt-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] backdrop-blur lg:hidden dark:border-white/8 dark:bg-zinc-950/95" aria-label="快捷导航">
        <ul role="list" className="grid grid-cols-5">
          {navigation.map((item) => {
            const Icon = item.icon
            const active = item.id === activeView
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => selectView(item.id)}
                  aria-current={active ? 'page' : undefined}
                  className={clsx(
                    'flex min-h-12 w-full flex-col items-center justify-center gap-1 rounded-md text-sm font-medium outline-none focus-visible:outline-2 focus-visible:outline-brand-500',
                    active ? 'bg-zinc-950/6 text-zinc-950 dark:bg-white/10 dark:text-white' : 'text-zinc-500 dark:text-zinc-400',
                  )}
                >
                  <Icon className="size-4 shrink-0" aria-hidden="true" />
                  <span>{item.label}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}
