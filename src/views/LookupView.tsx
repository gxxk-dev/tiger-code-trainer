import { useEffect, useMemo, useState } from 'react'
import { ExternalLink, Image, Search } from 'lucide-react'
import clsx from 'clsx'
import { orderedRoots } from '../data/curriculum'
import { displayRootGlyph } from '../lib/items'
import type { CharacterLookupEntry } from '../types'

type LookupMode = 'characters' | 'roots'

export function LookupView() {
  const [mode, setMode] = useState<LookupMode>('characters')
  const [query, setQuery] = useState('')
  const [keyFilter, setKeyFilter] = useState('')
  const [lookupCharacters, setLookupCharacters] = useState<CharacterLookupEntry[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (mode !== 'characters' || lookupCharacters.length) return
    setLoading(true)
    void import('../data/lookup.generated').then((module) => {
      setLookupCharacters(module.lookupCharacters)
      setLoading(false)
    })
  }, [lookupCharacters.length, mode])

  const characterResults = useMemo(() => {
    if (!query.trim()) return lookupCharacters.slice(0, 12)
    const characters = new Set(Array.from(query.trim()))
    return lookupCharacters.filter((entry) => characters.has(entry.char) || entry.code.includes(query.toLowerCase())).slice(0, 30)
  }, [lookupCharacters, query])

  const rootResults = useMemo(() => orderedRoots.filter((root) => {
    const normalizedQuery = query.trim().toLowerCase()
    const matchesQuery = !normalizedQuery
      || root.root.includes(normalizedQuery)
      || root.variants?.includes(normalizedQuery)
      || root.code.includes(normalizedQuery)
      || root.examples.some((example) => example.includes(normalizedQuery))
    return matchesQuery && (!keyFilter || root.code[0] === keyFilter)
  }), [keyFilter, query])

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
      <header className="border-b border-zinc-950/8 pb-8 dark:border-white/8">
        <p className="font-mono text-sm font-medium text-brand-700 dark:text-brand-300">离线查码</p>
        <h1 className="mt-2 max-w-[20ch] text-3xl font-semibold text-balance text-zinc-950 sm:text-4xl dark:text-white">查字、查根、查全码</h1>
        <p className="mt-3 max-w-[56ch] text-base text-pretty text-zinc-600 sm:text-sm dark:text-zinc-400">包含官网前 5000 高频字和 241 个字根。输入多个汉字可批量查询。</p>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex shrink-0 gap-1 rounded-lg bg-zinc-950/5 p-1 dark:bg-white/6" role="tablist" aria-label="查询类型">
          {([['characters', '汉字'], ['roots', '字根']] as const).map(([value, label]) => (
            <button
              type="button"
              role="tab"
              key={value}
              aria-selected={mode === value}
              onClick={() => { setMode(value); setQuery('') }}
              className={clsx(
                'min-h-10 rounded-md px-3 text-base font-medium outline-none focus-visible:outline-2 focus-visible:outline-brand-500 sm:min-h-8 sm:text-sm',
                mode === value ? 'bg-white text-zinc-950 shadow-sm ring-1 ring-zinc-950/5 dark:bg-white/10 dark:text-white dark:shadow-none dark:ring-white/8' : 'text-zinc-600 dark:text-zinc-400',
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <label htmlFor="lookup-input" className="relative min-w-0 flex-1">
          <span className="sr-only">{mode === 'characters' ? '输入汉字或编码' : '输入字根或编码'}</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-500" aria-hidden="true" />
          <input
            id="lookup-input"
            name="lookup"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={mode === 'characters' ? '输入汉字或编码，例如：虎码' : '输入字根、例字或编码，例如：水 / ks'}
            autoComplete="off"
            className="min-h-12 w-full rounded-md bg-white py-2 pr-3 pl-10 text-base text-zinc-950 shadow-sm ring-1 ring-zinc-950/10 outline-none placeholder:text-zinc-500 focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-brand-500 sm:min-h-10 sm:text-sm dark:bg-white/5 dark:text-white dark:shadow-none dark:ring-white/10 dark:placeholder:text-zinc-500"
          />
        </label>
      </div>

      {mode === 'characters' ? (
        <section aria-live="polite" aria-busy={loading}>
          {loading ? <LookupSkeleton /> : (
            <ul role="list" className="grid gap-3 md:grid-cols-2">
              {characterResults.map((entry) => (
                <li key={entry.char} className="rounded-lg bg-white p-5 ring-1 ring-zinc-950/8 dark:bg-white/4 dark:ring-white/8">
                  <div className="flex min-w-0 items-start gap-4">
                    <span className="flex size-14 shrink-0 items-center justify-center font-root text-4xl font-medium text-zinc-950 dark:text-white">{entry.char}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <p className="font-mono text-lg font-semibold text-brand-700 dark:text-brand-300">{entry.code}</p>
                        {entry.short ? <p className="text-sm text-zinc-500 dark:text-zinc-400">简码 {entry.short}</p> : null}
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">频率 #{entry.rank}</p>
                      </div>
                      <p className="mt-2 font-root text-base text-zinc-800 dark:text-zinc-200">
                        {Array.from(entry.decomposition).map((root, index) => (
                          <span key={`${root}-${index}`}>
                            {index ? <span className="px-1 text-zinc-300 dark:text-zinc-600">+</span> : null}
                            {displayRootGlyph(root, entry.rootCodes[index])}<span className="font-mono text-sm text-zinc-500 dark:text-zinc-400"> {entry.rootCodes[index]?.toLowerCase()}</span>
                          </span>
                        ))}
                      </p>
                      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{entry.pinyin} · 全部编码 {entry.codes.join(' / ')}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {!loading && !characterResults.length ? <NoResults /> : null}
        </section>
      ) : (
        <section aria-live="polite">
          <div className="-mx-4 overflow-x-auto px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
            <div className="flex min-w-max gap-1 pb-2" aria-label="按大码筛选">
              <button type="button" onClick={() => setKeyFilter('')} className={keyButtonClass(!keyFilter)}>全部</button>
              {Array.from('abcdefghijklmnopqrstuvwxyz').map((key) => (
                <button type="button" key={key} onClick={() => setKeyFilter(key)} className={keyButtonClass(keyFilter === key)}>{key.toUpperCase()}</button>
              ))}
            </div>
          </div>
          <ul role="list" className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {rootResults.map((root, index) => (
              <li key={`${root.root}-${root.code}-${index}`} className="flex min-w-0 items-center gap-4 rounded-md bg-white p-3 ring-1 ring-zinc-950/8 dark:bg-white/4 dark:ring-white/8">
                <span className="flex size-11 shrink-0 items-center justify-center font-root text-2xl font-medium text-zinc-950 dark:text-white">{root.root}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-mono text-base font-semibold text-brand-700 dark:text-brand-300">{root.code}</span>
                  <span className="mt-1 block truncate font-root text-sm text-zinc-500 dark:text-zinc-400">{root.examples.join(' · ') || root.variants || '字根'}</span>
                </span>
              </li>
            ))}
          </ul>
          {!rootResults.length ? <NoResults /> : null}
        </section>
      )}

      <section aria-labelledby="chart-title" className="border-t border-zinc-950/8 pt-8 dark:border-white/8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="chart-title" className="text-xl font-semibold text-zinc-950 dark:text-white">官方字根图</h2>
            <p className="mt-1 max-w-[56ch] text-base text-pretty text-zinc-600 sm:text-sm dark:text-zinc-400">用于查看无法由系统字体显示的变体字根。</p>
          </div>
          <Image className="size-4 shrink-0 text-zinc-500" aria-hidden="true" />
        </div>
        <a href="/assets/tiger-root-chart.webp" target="_blank" className="group mt-5 block overflow-hidden rounded-lg bg-white ring-1 ring-zinc-950/8 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 dark:bg-zinc-950 dark:ring-white/8">
          <img src="/assets/tiger-root-chart.webp" width="2600" height="938" loading="lazy" alt="虎码官方浅色字根图" className="w-full dark:hidden" />
          <img src="/assets/tiger-root-chart-dark.webp" width="2600" height="938" loading="lazy" alt="虎码官方深色字根图" className="hidden w-full dark:block" />
          <span className="sr-only">在新标签页打开字根图</span>
        </a>
        <p className="mt-2 flex items-center gap-1 text-sm text-zinc-500 dark:text-zinc-400">
          来源：虎码官网
          <ExternalLink className="size-4 shrink-0" aria-hidden="true" />
        </p>
      </section>
    </div>
  )
}

function keyButtonClass(active: boolean): string {
  return clsx(
    'min-h-10 min-w-10 rounded-md px-2 font-mono text-base font-medium outline-none ring-1 ring-zinc-950/8 focus-visible:outline-2 focus-visible:outline-brand-500 sm:min-h-8 sm:min-w-8 sm:text-sm dark:ring-white/8',
    active ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950' : 'bg-white text-zinc-600 hover:bg-zinc-50 dark:bg-white/4 dark:text-zinc-300 dark:hover:bg-white/8',
  )
}

function LookupSkeleton() {
  return <div className="grid gap-3 md:grid-cols-2" aria-label="正在载入查码数据">{Array.from({ length: 6 }, (_, index) => <div key={index} className="h-28 animate-pulse rounded-lg bg-zinc-950/5 dark:bg-white/5" />)}</div>
}

function NoResults() {
  return <p className="rounded-md bg-zinc-950/4 p-5 text-base text-zinc-600 sm:text-sm dark:bg-white/5 dark:text-zinc-400">没有找到匹配内容。</p>
}
