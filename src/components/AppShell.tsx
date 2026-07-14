import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  BarChart3,
  BookOpen,
  Home,
  Menu,
  Search,
  Settings,
  X,
} from 'lucide-react'
import clsx from 'clsx'
import type { ViewId } from '../types'
import { AppIcon } from './ui/AppIcon'
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const mobileHeaderRef = useRef<HTMLElement>(null)
  const menuTriggerRef = useRef<HTMLButtonElement>(null)
  const mainRef = useRef<HTMLElement>(null)

  const selectView = (view: ViewId) => {
    onViewChange(view)
    setMobileMenuOpen(false)
    window.scrollTo({ top: 0, left: 0 })
    window.requestAnimationFrame(() => mainRef.current?.focus())
  }

  useEffect(() => {
    if (!mobileMenuOpen) return
    const frame = window.requestAnimationFrame(() => {
      mobileHeaderRef.current?.querySelector<HTMLElement>('#mobile-navigation button')?.focus()
    })
    const closeMenu = (event: KeyboardEvent | PointerEvent) => {
      if (event instanceof KeyboardEvent && event.key === 'Escape') {
        setMobileMenuOpen(false)
        menuTriggerRef.current?.focus()
        return
      }
      if (event instanceof PointerEvent && !mobileHeaderRef.current?.contains(event.target as Node)) {
        setMobileMenuOpen(false)
      }
    }
    window.addEventListener('keydown', closeMenu)
    window.addEventListener('pointerdown', closeMenu)
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('keydown', closeMenu)
      window.removeEventListener('pointerdown', closeMenu)
    }
  }, [mobileMenuOpen])

  return (
    <div className="isolate min-h-dvh bg-canvas text-zinc-950 dark:bg-canvas-dark dark:text-zinc-100">
      <aside className="fixed inset-y-0 left-0 z-30 grid w-60 grid-rows-[auto_1fr_auto] gap-8 border-r border-zinc-950/8 bg-white px-3 py-5 max-lg:hidden dark:border-white/8 dark:bg-zinc-950">
        <a href={import.meta.env.BASE_URL} aria-label="Homepage" className="flex items-center gap-2 px-2 text-zinc-950 dark:text-white">
          <BrandMark size="large" />
          <span className="font-semibold">虎序</span>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Tiger Flow</p>
        </a>
        <nav aria-label="主要导航">
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
                    <AppIcon icon={Icon} />
                    <span className="min-w-0 flex-1 text-left">{item.label}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>
        <div className="border-t border-zinc-950/8 pt-3 dark:border-white/8">
          <button
            type="button"
            onClick={onOpenSettings}
            className="flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium text-zinc-600 outline-none hover:bg-zinc-950/4 hover:text-zinc-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 dark:text-zinc-400 dark:hover:bg-white/6 dark:hover:text-white"
          >
            <AppIcon icon={Settings} />
            设置
          </button>
        </div>
      </aside>

      <header
        ref={mobileHeaderRef}
        className="sticky top-0 z-30 border-b border-zinc-950/8 bg-canvas/90 backdrop-blur lg:hidden dark:border-white/8 dark:bg-canvas-dark/90"
        onBlur={(event) => {
          if (mobileMenuOpen && !event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setMobileMenuOpen(false)
          }
        }}
      >
        <div className="flex h-14 items-center justify-between px-4">
          <a href={import.meta.env.BASE_URL} aria-label="Homepage" className="flex items-center gap-2 font-semibold text-zinc-950 dark:text-white">
            <BrandMark />
            虎序
          </a>
          <div className="flex items-center gap-1">
            <IconButton
              label="设置"
              icon={Settings}
              onClick={() => {
                setMobileMenuOpen(false)
                onOpenSettings()
              }}
            />
            <IconButton
              ref={menuTriggerRef}
              label={mobileMenuOpen ? '关闭导航' : '打开导航'}
              icon={mobileMenuOpen ? X : Menu}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-navigation"
              onClick={() => setMobileMenuOpen((open) => !open)}
            />
          </div>
        </div>
        {mobileMenuOpen ? (
          <nav id="mobile-navigation" className="absolute inset-x-0 top-full border-b border-zinc-950/8 bg-white p-2 dark:border-white/8 dark:bg-zinc-950" aria-label="移动导航">
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
                        'flex min-h-12 w-full items-center gap-3 rounded-md px-3 text-base font-medium outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-500 sm:text-sm',
                        active
                          ? 'bg-zinc-950/6 text-zinc-950 dark:bg-white/10 dark:text-white'
                          : 'text-zinc-600 hover:bg-zinc-950/4 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-white/6 dark:hover:text-white',
                      )}
                    >
                      <AppIcon icon={Icon} />
                      {item.label}
                    </button>
                  </li>
                )
              })}
            </ul>
          </nav>
        ) : null}
      </header>

      <main ref={mainRef} tabIndex={-1} className="min-w-0 outline-none lg:ml-60">
        {children}
      </main>
    </div>
  )
}

function BrandMark({ size = 'default' }: { size?: 'default' | 'large' }) {
  return (
    <span
      className={clsx(
        'flex shrink-0 items-center justify-center rounded-md bg-brand-600 font-semibold text-white',
        size === 'large' ? 'size-8' : 'size-7',
      )}
      aria-hidden="true"
    >
      虎
    </span>
  )
}
