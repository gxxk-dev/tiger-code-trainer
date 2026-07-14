import { useEffect, useRef, useState } from 'react'
import { Check, RotateCcw } from 'lucide-react'
import clsx from 'clsx'
import { articles } from '../../data/curriculum'
import { calculateAccuracy } from '../../lib/mastery'
import type { TrainingRequest } from '../../types'
import { Button } from '../ui/Button'
import type { TrainingFinishedHandler } from './types'

interface ArticleTrainerProps {
  request: TrainingRequest
  onFinished: TrainingFinishedHandler
  paused?: boolean
  className?: string
}

export function ArticleTrainer({ request, onFinished, paused = false, className }: ArticleTrainerProps) {
  const article = articles.find((item) => item.id === request.articleId) ?? articles[0]
  const [value, setValue] = useState('')
  const [startedAt, setStartedAt] = useState(0)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [backspaces, setBackspaces] = useState(0)
  const [composing, setComposing] = useState(false)
  const pausedAt = useRef<number | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!startedAt || paused) return
    const interval = window.setInterval(() => setElapsedSeconds(Math.max(1, Math.round((Date.now() - startedAt) / 1000))), 500)
    return () => window.clearInterval(interval)
  }, [paused, startedAt])

  useEffect(() => {
    if (paused && pausedAt.current === null) pausedAt.current = Date.now()
    if (!paused && pausedAt.current !== null) {
      const pauseDuration = Date.now() - pausedAt.current
      setStartedAt((value) => value ? value + pauseDuration : value)
      pausedAt.current = null
    }
  }, [paused])

  const accuracy = calculateAccuracy(article.text, value)
  const currentPauseDuration = pausedAt.current === null ? 0 : Date.now() - pausedAt.current
  const activeElapsedMs = startedAt ? Date.now() - startedAt - currentPauseDuration : 0
  const cpm = startedAt ? Math.round(Array.from(value).length / Math.max(1, activeElapsedMs / 60_000)) : 0

  const finish = () => {
    const expected = Array.from(article.text)
    const actual = Array.from(value)
    const matches = expected.filter((character, index) => character === actual[index]).length
    onFinished({
      attempted: expected.length,
      correct: matches,
      firstTryCorrect: Math.max(0, matches - backspaces),
      responseTimes: [],
      charsPerMinute: cpm,
    })
  }

  return (
    <main className={clsx('mx-auto grid min-h-[calc(100dvh-4rem)] max-w-4xl content-center gap-7 px-4 py-10 sm:px-6 lg:px-8', className)}>
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-zinc-950/8 pb-5 dark:border-white/8">
        <div>
          <p className="font-mono text-sm font-medium text-emerald-700 dark:text-emerald-300">Fcitx5 中文实战，{article.level}</p>
          <h1 className="mt-2 text-2xl font-semibold text-zinc-950 dark:text-white">{article.title}</h1>
        </div>
        <dl className="flex gap-6">
          <div><dt className="text-base text-zinc-500 sm:text-sm dark:text-zinc-400">准确率</dt><dd className="mt-1 font-mono text-lg font-semibold text-zinc-950 tabular-nums dark:text-white">{accuracy}%</dd></div>
          <div><dt className="text-base text-zinc-500 sm:text-sm dark:text-zinc-400">字 / 分</dt><dd className="mt-1 font-mono text-lg font-semibold text-zinc-950 tabular-nums dark:text-white">{cpm || '—'}</dd></div>
          <div><dt className="text-base text-zinc-500 sm:text-sm dark:text-zinc-400">时间</dt><dd className="mt-1 font-mono text-lg font-semibold text-zinc-950 tabular-nums dark:text-white">{elapsedSeconds}s</dd></div>
        </dl>
      </div>

      <div className="rounded-lg bg-white p-5 ring-1 ring-zinc-950/8 dark:bg-white/4 dark:ring-white/8">
        <p className="font-root text-xl/9 text-zinc-500 dark:text-zinc-400">
          {Array.from(article.text).map((character, index) => {
            const typed = Array.from(value)[index]
            return (
              <span key={`${character}-${index}`} className={clsx(
                typed === character ? 'text-zinc-950 dark:text-white' : '',
                typed && typed !== character ? 'bg-red-500/12 text-red-700 dark:text-red-300' : '',
                index === Array.from(value).length ? 'border-b-2 border-blue-500' : '',
              )}>{character}</span>
            )
          })}
        </p>
      </div>

      <label htmlFor="article-input" className="grid gap-2 text-base font-medium text-zinc-800 sm:text-sm dark:text-zinc-200">
        输入区
        <textarea
          ref={textareaRef}
          id="article-input"
          name="article-input"
          value={value}
          onCompositionStart={() => setComposing(true)}
          onCompositionEnd={() => setComposing(false)}
          onKeyDown={(event) => {
            if (event.key === 'Backspace') setBackspaces((count) => count + 1)
            if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing && !composing) {
              event.preventDefault()
              if (value) finish()
            }
          }}
          onChange={(event) => {
            if (!startedAt && event.target.value) setStartedAt(Date.now())
            setValue(event.target.value.slice(0, Array.from(article.text).length + 10))
          }}
          placeholder="在这里使用虎码输入目标文字"
          spellCheck={false}
          className="min-h-32 resize-none rounded-md bg-white p-4 font-root text-lg text-zinc-950 shadow-sm ring-1 ring-zinc-950/10 outline-none placeholder:text-zinc-500 focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-brand-500 dark:bg-white/5 dark:text-white dark:shadow-none dark:ring-white/10 dark:placeholder:text-zinc-500"
        />
      </label>

      <div className="flex flex-wrap justify-end gap-2">
        <Button onClick={() => { setValue(''); setStartedAt(0); setElapsedSeconds(0); setBackspaces(0); textareaRef.current?.focus() }} leadingIcon={RotateCcw}>重来</Button>
        <Button variant="primary" leadingIcon={Check} onClick={finish} disabled={!value}>完成本段</Button>
      </div>
    </main>
  )
}
