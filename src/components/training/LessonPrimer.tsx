import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, Check, Eye, Keyboard } from 'lucide-react'
import clsx from 'clsx'
import {
  articles,
  basicStrokes,
  ruleLabels,
} from '../../data/curriculum'
import {
  displayRootGlyph,
  resolveCharacter,
  resolveRoot,
  resolveSplit,
  rootId,
} from '../../lib/items'
import { lessonIdsForRequest, sourceItemId } from '../../lib/lessons'
import { getRootMemoryHint } from '../../lib/rootHints'
import type { ProgressState, TrainingRequest } from '../../types'
import { Button } from '../ui/Button'
import { MemoryHint } from './MemoryHint'

interface LessonPrimerProps {
  request: TrainingRequest
  progress: ProgressState
  onComplete: (itemIds: string[]) => void
}

interface LessonItem {
  id: string
  glyph: string
  label: string
  code: string
  detail: string
  hint?: string
}

export function LessonPrimer({ request, progress, onComplete }: LessonPrimerProps) {
  const lessonIds = useMemo(() => lessonIdsForRequest(request, progress), [progress, request])
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  if (request.kind === 'formula') {
    return <FormulaLesson headingRef={headingRef} onComplete={() => onComplete(lessonIds)} />
  }
  if (request.kind === 'article') {
    return <ArticleLesson request={request} headingRef={headingRef} onComplete={() => onComplete(lessonIds)} />
  }

  const items = buildLessonItems(lessonIds, request)
  if (request.kind === 'splits') {
    return <SplitLesson items={items} headingRef={headingRef} onComplete={() => onComplete(lessonIds)} />
  }
  return <CodeLesson items={items} headingRef={headingRef} onComplete={() => onComplete(lessonIds)} />
}

function CodeLesson({
  items,
  headingRef,
  onComplete,
}: {
  items: LessonItem[]
  headingRef: React.RefObject<HTMLHeadingElement | null>
  onComplete: () => void
}) {
  const [phase, setPhase] = useState<'look' | 'copy'>('look')
  const [index, setIndex] = useState(0)
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const item = items[index]

  useEffect(() => {
    if (phase === 'copy') inputRef.current?.focus()
  }, [index, phase])

  if (!item) return null

  if (phase === 'look') {
    return (
      <main className="mx-auto grid min-h-[calc(100dvh-4rem)] max-w-4xl content-center gap-8 px-4 py-10 sm:px-6 lg:px-8">
        <header className="max-w-2xl">
          <p className="font-mono text-sm font-medium text-brand-700 dark:text-brand-300">第 1 步 / 3 · 认识</p>
          <h1 ref={headingRef} tabIndex={-1} className="mt-2 text-3xl font-semibold text-balance text-zinc-950 outline-none dark:text-white">先看答案，不测试</h1>
          <p className="mt-3 max-w-[58ch] text-base text-pretty text-zinc-600 dark:text-zinc-400">
            这轮只学 {items.length} 个。把字形、编码和学习联想一起看一遍；联想不是额外规则，现在也不用背熟。
          </p>
        </header>

        <ul role="list" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((lessonItem) => (
            <li key={lessonItem.id} className="grid min-h-36 grid-cols-[4rem_1fr] items-center gap-4 rounded-lg bg-white p-4 ring-1 ring-zinc-950/8 dark:bg-white/4 dark:ring-white/8">
              <span className="font-root text-5xl font-medium text-zinc-950 dark:text-white">{displayRootGlyph(lessonItem.glyph)}</span>
              <div className="min-w-0">
                <span className="block text-base font-medium text-zinc-500 sm:text-sm dark:text-zinc-400">{lessonItem.label}</span>
                <span className="mt-1 block font-mono text-2xl font-semibold text-brand-700 dark:text-brand-300">{lessonItem.code}</span>
                <span className="mt-2 block text-base text-pretty text-zinc-600 sm:text-sm dark:text-zinc-300">{lessonItem.detail}</span>
                {lessonItem.hint ? (
                  <MemoryHint text={lessonItem.hint} className="mt-3 border-t border-zinc-950/8 pt-3 dark:border-white/8" />
                ) : null}
              </div>
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap gap-2">
          <Button variant="primary" leadingIcon={<Keyboard className="size-4" aria-hidden="true" />} onClick={() => setPhase('copy')}>
            跟着答案打一次
          </Button>
          <Button variant="ghost" onClick={onComplete}>我已经会了，直接练习</Button>
        </div>
      </main>
    )
  }

  const copied = value === item.code
  const advance = () => {
    if (!copied) return
    if (index + 1 >= items.length) {
      onComplete()
      return
    }
    setIndex((current) => current + 1)
    setValue('')
  }

  return (
    <main className="mx-auto grid min-h-[calc(100dvh-4rem)] max-w-3xl content-center gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <header>
        <p className="font-mono text-sm font-medium text-brand-700 dark:text-brand-300">第 2 步 / 3 · 跟打 {index + 1} / {items.length}</p>
        <h1 ref={headingRef} tabIndex={-1} className="mt-2 text-3xl font-semibold text-balance text-zinc-950 outline-none dark:text-white">答案一直显示，照着输入</h1>
        <p className="mt-3 text-base text-zinc-600 dark:text-zinc-400">跟打不计分。最后一步才会遮住答案。</p>
      </header>

      <section aria-labelledby="copy-glyph" className="grid min-h-80 content-center justify-items-center gap-6 text-center">
        <div>
          <p id="copy-glyph" className="font-root text-7xl font-medium text-zinc-950 sm:text-8xl dark:text-white">{displayRootGlyph(item.glyph)}</p>
          <p className="mt-2 text-base font-medium text-zinc-600 dark:text-zinc-300">{item.label}</p>
        </div>
        <div className="flex justify-center gap-2" aria-label={`答案 ${item.code}`}>
          {Array.from(item.code).map((character, codeIndex) => (
            <span key={`${character}-${codeIndex}`} className="flex size-12 items-center justify-center rounded-md bg-blue-500/8 font-mono text-xl font-semibold text-blue-800 ring-1 ring-blue-500/20 dark:text-blue-200">{character}</span>
          ))}
        </div>
        {item.hint ? (
          <MemoryHint text={item.hint} className="max-w-lg text-left" />
        ) : null}
        <label className="grid w-full max-w-xs gap-2 text-left text-base font-medium text-zinc-700 sm:text-sm dark:text-zinc-300">
          照着输入 {item.code}
          <input
            ref={inputRef}
            type="text"
            name="guided-code-answer"
            value={value}
            onChange={(event) => setValue(event.target.value.toLowerCase().replace(/[^a-z]/g, '').slice(0, item.code.length))}
            onKeyDown={(event) => {
              if (event.key === 'Enter') advance()
            }}
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
            aria-label={`照着答案输入“${displayRootGlyph(item.glyph)}”的编码`}
            className={clsx(
              'min-h-12 rounded-md bg-white px-3 text-center font-mono text-xl font-semibold text-zinc-950 ring-1 outline-none focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-brand-500 dark:bg-white/5 dark:text-white',
              copied ? 'ring-emerald-500/40' : 'ring-zinc-950/12 dark:ring-white/12',
            )}
          />
        </label>
        <p className="min-h-6 text-base text-zinc-600 dark:text-zinc-300" aria-live="polite">
          {copied ? <span className="inline-flex items-center gap-2 text-emerald-700 dark:text-emerald-300"><Check className="size-4" aria-hidden="true" />对，就是这几个键</span> : null}
        </p>
      </section>

      <div className="flex justify-center">
        <Button variant="primary" disabled={!copied} trailingIcon={<ArrowRight className="size-4" aria-hidden="true" />} onClick={advance}>
          {index + 1 >= items.length ? '遮住答案，开始练习' : '下一个'}
        </Button>
      </div>
    </main>
  )
}

function FormulaLesson({ headingRef, onComplete }: { headingRef: React.RefObject<HTMLHeadingElement | null>; onComplete: () => void }) {
  const formulas = [
    ['1 根', 'Aa', '大码 + 自己的小码'],
    ['2 根', 'ABb', '两个大码 + 末根小码'],
    ['3 根', 'ABCc', '三个大码 + 末根小码'],
    ['4 根', 'ABCD', '四个大码'],
    ['5 根以上', 'ABCZ', '前三根 + 最后一根的大码'],
  ]
  return (
    <main className="mx-auto grid min-h-[calc(100dvh-4rem)] max-w-4xl content-center gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <header className="max-w-2xl">
        <p className="font-mono text-sm font-medium text-brand-700 dark:text-brand-300">先学规则 · 不测试</p>
        <h1 ref={headingRef} tabIndex={-1} className="mt-2 text-3xl font-semibold text-balance text-zinc-950 outline-none dark:text-white">只记这一条取码公式</h1>
        <p className="mt-3 text-base text-pretty text-zinc-600 dark:text-zinc-400">大写字母只是公式里的大码记号，小写字母代表末根的小码；实际输入仍然全部使用小写。</p>
      </header>
      <dl className="divide-y divide-zinc-950/8 border-y border-zinc-950/8 dark:divide-white/8 dark:border-white/8">
        {formulas.map(([count, formula, detail]) => (
          <div key={count} className="grid grid-cols-[5.5rem_1fr] items-center gap-x-3 gap-y-1 py-3 text-base sm:grid-cols-[6rem_5rem_1fr] sm:gap-3 sm:text-sm">
            <dt className="font-medium text-zinc-950 dark:text-white">{count}</dt>
            <dd className="font-mono text-lg font-semibold text-brand-700 dark:text-brand-300">{formula}</dd>
            <dd className="col-start-2 text-zinc-600 sm:col-auto dark:text-zinc-300">{detail}</dd>
          </div>
        ))}
      </dl>
      <section className="rounded-lg bg-blue-500/8 p-4 ring-1 ring-blue-500/20" aria-labelledby="formula-example">
        <p id="formula-example" className="font-medium text-zinc-950 dark:text-white">例：华 = 亻(J) + 匕(V) + 十(Ns)</p>
        <p className="mt-2 text-base text-zinc-700 sm:text-sm dark:text-zinc-300">三个字根用 ABCc，所以取 J、V、N，再补末根小码 s：<span className="font-mono font-semibold">jvns</span>。</p>
      </section>
      <Button variant="primary" className="w-fit" trailingIcon={<ArrowRight className="size-4" aria-hidden="true" />} onClick={onComplete}>开始公式练习</Button>
    </main>
  )
}

function SplitLesson({ items, headingRef, onComplete }: { items: LessonItem[]; headingRef: React.RefObject<HTMLHeadingElement | null>; onComplete: () => void }) {
  return (
    <main className="mx-auto grid min-h-[calc(100dvh-4rem)] max-w-4xl content-center gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <header className="max-w-2xl">
        <p className="font-mono text-sm font-medium text-brand-700 dark:text-brand-300">先看示范 · 不测试</p>
        <h1 ref={headingRef} tabIndex={-1} className="mt-2 text-3xl font-semibold text-balance text-zinc-950 outline-none dark:text-white">先看怎么拆，再自己选择</h1>
        <p className="mt-3 text-base text-pretty text-zinc-600 dark:text-zinc-400">先认完整的大字根，再按书写顺序排列。下面就是本轮会遇到的答案。</p>
      </header>
      <ul role="list" className="divide-y divide-zinc-950/8 border-y border-zinc-950/8 dark:divide-white/8 dark:border-white/8">
        {items.map((item) => (
          <li key={item.id} className="grid grid-cols-[3rem_1fr_auto] items-start gap-4 py-4">
            <span className="font-root text-3xl font-medium text-zinc-950 dark:text-white">{item.glyph}</span>
            <span className="min-w-0">
              <span className="block font-root text-base font-medium text-zinc-950 dark:text-white">{item.detail}</span>
              <span className="mt-1 block text-base text-zinc-500 sm:text-sm dark:text-zinc-400">{item.label}</span>
            </span>
            <span className="font-mono text-base font-semibold text-brand-700 dark:text-brand-300">{item.code}</span>
          </li>
        ))}
      </ul>
      <Button variant="primary" className="w-fit" trailingIcon={<ArrowRight className="size-4" aria-hidden="true" />} onClick={onComplete}>开始拆分练习</Button>
    </main>
  )
}

function ArticleLesson({ request, headingRef, onComplete }: { request: TrainingRequest; headingRef: React.RefObject<HTMLHeadingElement | null>; onComplete: () => void }) {
  const article = articles.find((entry) => entry.id === request.articleId) ?? articles[0]
  return (
    <main className="mx-auto grid min-h-[calc(100dvh-4rem)] max-w-3xl content-center gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <header className="max-w-2xl">
        <p className="font-mono text-sm font-medium text-brand-700 dark:text-brand-300">真实输入前的准备</p>
        <h1 ref={headingRef} tabIndex={-1} className="mt-2 text-3xl font-semibold text-balance text-zinc-950 outline-none dark:text-white">先切到 Fcitx5 虎码</h1>
        <p className="mt-3 text-base text-pretty text-zinc-600 dark:text-zinc-400">下一页直接输入中文，不需要在网页里打虎码字母。候选和选重都由系统输入法处理。</p>
      </header>
      <section className="rounded-lg bg-white p-5 ring-1 ring-zinc-950/8 dark:bg-white/4 dark:ring-white/8" aria-labelledby="article-preview">
        <div className="flex items-center gap-2 text-base font-medium text-zinc-500 sm:text-sm dark:text-zinc-400"><Eye className="size-4" aria-hidden="true" />本轮原文</div>
        <p id="article-preview" className="mt-3 text-lg/8 text-zinc-950 dark:text-white">{article.text}</p>
      </section>
      <Button variant="primary" className="w-fit" leadingIcon={<Keyboard className="size-4" aria-hidden="true" />} onClick={onComplete}>开始 Fcitx5 实打</Button>
    </main>
  )
}

function buildLessonItems(itemIds: string[], request: TrainingRequest): LessonItem[] {
  return itemIds.flatMap((id) => {
    const sourceId = sourceItemId(id)
    const root = resolveRoot(sourceId)
    if (root) {
      const stroke = basicStrokes.find((candidate) => rootId(candidate.entry) === sourceId)
      const hint = getRootMemoryHint(root)
      return [{
        id,
        glyph: root.root,
        label: stroke?.name ?? '字根',
        code: root.code,
        detail: hint.compactCue,
        hint: hint.mnemonic,
      }]
    }
    const character = resolveCharacter(sourceId)
    if (character) {
      const split = resolveSplit(`split:${character.char}`)
      const shortcut = request.stageId === 'shortcuts' ? character.short : undefined
      return [{
        id,
        glyph: character.char,
        label: shortcut ? '高频简码' : `常用字 #${character.rank}`,
        code: shortcut ?? character.code,
        detail: shortcut
          ? `全码 ${character.code}，日常输入可直接用 ${shortcut}`
          : split ? `拆成 ${split.roots.map((glyph) => displayRootGlyph(glyph)).join(' + ')}` : '先看全码，拆分会在后面解释',
      }]
    }
    const split = resolveSplit(sourceId)
    if (split) {
      return [{
        id,
        glyph: split.char,
        label: split.rule ? ruleLabels[split.rule] : '按书写顺序',
        code: split.code,
        detail: split.roots.map((glyph) => displayRootGlyph(glyph)).join(' + '),
      }]
    }
    return []
  })
}
