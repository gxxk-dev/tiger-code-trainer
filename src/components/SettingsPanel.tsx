import { useEffect, useRef, useState } from 'react'
import {
  Download,
  GitFork,
  Laptop,
  Moon,
  Sun,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import clsx from 'clsx'
import type { AppSettings, ProgressState } from '../types'
import { exportProgress } from '../lib/storage'
import { Button, IconButton } from './ui/Button'

interface SettingsPanelProps {
  open: boolean
  progress: ProgressState
  onClose: () => void
  onUpdate: (settings: Partial<AppSettings>) => void
  onReset: () => void
  onRestore: (file: File) => Promise<void>
}

const themes: Array<{ value: AppSettings['theme']; label: string; icon: typeof Sun }> = [
  { value: 'system', label: '跟随系统', icon: Laptop },
  { value: 'light', label: '浅色', icon: Sun },
  { value: 'dark', label: '深色', icon: Moon },
]

export function SettingsPanel({
  open,
  progress,
  onClose,
  onUpdate,
  onReset,
  onRestore,
}: SettingsPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!open) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose, open])

  if (!open) return null

  const restore = async (file: File | undefined) => {
    if (!file) return
    try {
      await onRestore(file)
      setMessage('进度已导入。')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '导入失败。')
    }
  }

  const reset = () => {
    if (!window.confirm('确定清空全部学习记录吗？这个操作无法撤销。')) return
    onReset()
    setMessage('学习记录已清空。')
  }

  return (
    <div className="fixed inset-0 z-60" role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <button type="button" aria-label="点击遮罩关闭设置" className="absolute inset-0 bg-zinc-950/35" onClick={onClose} />
      <section className="absolute inset-y-0 right-0 flex w-[min(30rem,100vw)] flex-col overflow-y-auto bg-white shadow-2xl dark:bg-zinc-950 dark:shadow-none dark:ring-1 dark:ring-white/10">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-zinc-950/8 bg-white/95 px-5 backdrop-blur dark:border-white/8 dark:bg-zinc-950/95">
          <h2 id="settings-title" className="text-lg font-semibold text-zinc-950 dark:text-white">设置</h2>
          <IconButton label="关闭设置" onClick={onClose}>
            <X className="size-4" aria-hidden="true" />
          </IconButton>
        </header>

        <div className="grid gap-8 p-5">
          <section aria-labelledby="appearance-title" className="grid gap-3">
            <div>
              <h3 id="appearance-title" className="font-medium text-zinc-950 dark:text-white">外观</h3>
              <p className="mt-1 text-base text-pretty text-zinc-600 sm:text-sm dark:text-zinc-400">主题选择会保存在当前浏览器。</p>
            </div>
            <div className="grid grid-cols-3 gap-1 rounded-lg bg-zinc-950/5 p-1 dark:bg-white/6">
              {themes.map((item) => {
                const Icon = item.icon
                const active = progress.settings.theme === item.value
                return (
                  <button
                    type="button"
                    key={item.value}
                    onClick={() => onUpdate({ theme: item.value })}
                    aria-pressed={active}
                    className={clsx(
                      'flex min-h-11 items-center justify-center gap-2 rounded-md px-2 text-base font-medium outline-none focus-visible:outline-2 focus-visible:outline-brand-500 sm:min-h-9 sm:text-sm',
                      active
                        ? 'bg-white text-zinc-950 shadow-sm ring-1 ring-zinc-950/5 dark:bg-white/10 dark:text-white dark:shadow-none dark:ring-white/8'
                        : 'text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white',
                    )}
                  >
                    <Icon className="size-4 shrink-0" aria-hidden="true" />
                    {item.label}
                  </button>
                )
              })}
            </div>
          </section>

          <section aria-labelledby="plan-title" className="grid gap-5 border-t border-zinc-950/8 pt-7 dark:border-white/8">
            <div>
              <h3 id="plan-title" className="font-medium text-zinc-950 dark:text-white">训练计划</h3>
              <p className="mt-1 text-base text-pretty text-zinc-600 sm:text-sm dark:text-zinc-400">只影响今日推荐，所有课程仍可自由进入。</p>
            </div>
            <fieldset className="grid gap-2">
              <legend className="text-base font-medium text-zinc-800 sm:text-sm dark:text-zinc-200">每日时长</legend>
              <div className="grid grid-cols-3 gap-1 rounded-lg bg-zinc-950/5 p-1 dark:bg-white/6">
                {([5, 10, 20] as const).map((minutes) => (
                  <button
                    type="button"
                    key={minutes}
                    onClick={() => onUpdate({ dailyMinutes: minutes })}
                    aria-pressed={progress.settings.dailyMinutes === minutes}
                    className={clsx(
                      'min-h-11 rounded-md px-2 text-base font-medium tabular-nums outline-none focus-visible:outline-2 focus-visible:outline-brand-500 sm:min-h-9 sm:text-sm',
                      progress.settings.dailyMinutes === minutes
                        ? 'bg-white text-zinc-950 shadow-sm ring-1 ring-zinc-950/5 dark:bg-white/10 dark:text-white dark:shadow-none dark:ring-white/8'
                        : 'text-zinc-600 dark:text-zinc-400',
                    )}
                  >
                    {minutes} 分钟
                  </button>
                ))}
              </div>
            </fieldset>
            <label className="grid gap-2 text-base font-medium text-zinc-800 sm:text-sm dark:text-zinc-200" htmlFor="new-items">
              每轮新内容
              <span className="inline-grid grid-cols-[1fr_--spacing(8)]">
                <select
                  id="new-items"
                  name="new-items"
                  value={progress.settings.newItemsPerRound}
                  onChange={(event) => onUpdate({ newItemsPerRound: Number(event.target.value) as 5 | 8 | 12 })}
                  className="col-span-full row-start-1 min-h-11 appearance-none rounded-md bg-white px-3 pr-8 text-base font-normal text-zinc-950 shadow-sm ring-1 ring-zinc-950/10 outline-none focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-brand-500 sm:min-h-9 sm:text-sm dark:bg-white/5 dark:text-white dark:shadow-none dark:ring-white/10"
                >
                  <option value={5}>5 个</option>
                  <option value={8}>8 个</option>
                  <option value={12}>12 个</option>
                </select>
                <span className="pointer-events-none col-start-2 row-start-1 place-self-center text-zinc-500" aria-hidden="true">⌄</span>
              </span>
            </label>
            <SettingToggle
              id="auto-advance"
              label="答对后自动下一题"
              checked={progress.settings.autoAdvance}
              onChange={(checked) => onUpdate({ autoAdvance: checked })}
            />
            <SettingToggle
              id="reduced-motion"
              label="减少动态效果"
              checked={progress.settings.reducedMotion}
              onChange={(checked) => onUpdate({ reducedMotion: checked })}
            />
          </section>

          <section aria-labelledby="data-title" className="grid gap-4 border-t border-zinc-950/8 pt-7 dark:border-white/8">
            <div>
              <h3 id="data-title" className="font-medium text-zinc-950 dark:text-white">学习数据</h3>
              <p className="mt-1 text-base text-pretty text-zinc-600 sm:text-sm dark:text-zinc-400">进度只保存在本机。可导出后在另一浏览器恢复。</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button leadingIcon={<Download className="size-4" aria-hidden="true" />} onClick={() => exportProgress(progress)}>
                导出进度
              </Button>
              <Button leadingIcon={<Upload className="size-4" aria-hidden="true" />} onClick={() => fileInputRef.current?.click()}>
                导入进度
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                name="progress-file"
                accept="application/json"
                className="sr-only"
                aria-label="选择进度文件"
                onChange={(event) => void restore(event.target.files?.[0])}
              />
            </div>
            <Button variant="danger" leadingIcon={<Trash2 className="size-4" aria-hidden="true" />} onClick={reset} className="w-fit">
              清空学习记录
            </Button>
            <p className="min-h-6 text-base text-zinc-600 sm:text-sm dark:text-zinc-400" aria-live="polite">{message}</p>
          </section>

          <section aria-labelledby="about-title" className="grid gap-3 border-t border-zinc-950/8 pt-7 dark:border-white/8">
            <div>
              <h3 id="about-title" className="font-medium text-zinc-950 dark:text-white">关于虎序</h3>
              <p className="mt-1 text-base text-pretty text-zinc-600 sm:text-sm dark:text-zinc-400">
                Copyright (C) 2026 gxxk-dev。按 GNU AGPL v3 或更高版本发布，不提供任何担保。
              </p>
            </div>
            <a
              href="https://github.com/gxxk-dev/tiger-code-trainer"
              target="_blank"
              rel="noreferrer"
              className="flex min-h-11 w-fit items-center gap-2 rounded-md px-2 text-base font-medium text-zinc-700 outline-none hover:bg-zinc-950/4 hover:text-zinc-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 sm:min-h-9 sm:text-sm dark:text-zinc-300 dark:hover:bg-white/6 dark:hover:text-white"
            >
              <GitFork className="size-4 shrink-0" aria-hidden="true" />
              查看源代码与许可证
            </a>
          </section>
        </div>
      </section>
    </div>
  )
}

interface SettingToggleProps {
  id: string
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}

function SettingToggle({ id, label, checked, onChange }: SettingToggleProps) {
  return (
    <label htmlFor={id} className="flex min-w-0 items-center justify-between gap-4 text-base font-medium text-zinc-800 sm:text-sm dark:text-zinc-200">
      <span className="min-w-0">{label}</span>
      <span className="group relative inline-flex w-11 shrink-0 rounded-full bg-zinc-200 p-0.5 inset-ring inset-ring-zinc-950/5 outline-offset-2 outline-brand-500 has-checked:bg-brand-600 has-focus-visible:outline-2 sm:w-9 dark:bg-white/10 dark:inset-ring-white/10 dark:has-checked:bg-brand-500">
        <span className="aspect-square w-1/2 rounded-full bg-white shadow-xs ring-1 ring-zinc-950/5 transition-transform duration-200 ease-in-out group-has-checked:translate-x-full" />
        <input
          id={id}
          name={id}
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="absolute inset-0 size-full appearance-none focus:outline-hidden"
        />
      </span>
    </label>
  )
}
