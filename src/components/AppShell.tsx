import type { ReactNode } from 'react'
import {
  BarChart3,
  BookOpen,
  Home,
  Search,
  Settings,
} from 'lucide-react'
import clsx from 'clsx'
import type { ViewId } from '../types'
import { IconButton } from './ui/Button'

const navigation: Array<{ id: ViewId; label: string; icon: typeof Home }> = [
  { id: 'today', label: '练习', icon: Home },
  { id: 'course', label: '课程', icon: BookOpen },
  { id: 'stats', label: '轨迹', icon: BarChart3 },
  { id: 'lookup', label: '查码', icon: Search },
]

interface AppShellProps {
  activeView: ViewId
  onViewChange: (view: ViewId) => void
  onOpenSettings: () => void
  children: ReactNode
}

export function AppShell({
  activeView,
  onViewChange,
  onOpenSettings,
  children,
}: AppShellProps) {
  const selectView = (view: ViewId) => {
    onViewChange(view)
    window.scrollTo({ top: 0, left: 0 })
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
        <IconButton label="设置" onClick={onOpenSettings}>
          <Settings className="size-4" aria-hidden="true" />
        </IconButton>
      </header>

      <main className="min-w-0 pb-24 lg:ml-60 lg:pb-0">
        {children}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-950/8 bg-white/95 px-2 pt-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] backdrop-blur lg:hidden dark:border-white/8 dark:bg-zinc-950/95" aria-label="快捷导航">
        <ul role="list" className="grid grid-cols-4">
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
