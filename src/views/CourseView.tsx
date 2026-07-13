import { ArrowRight, Check, Play } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { ProgressBar } from '../components/ui/ProgressBar'
import { characters } from '../data/characters.generated'
import { articles, basicStrokes, courseStages, orderedRoots, rootPacks, splitExamples } from '../data/curriculum'
import { requiredSplits } from '../data/splits.generated'
import { characterId, displayRootGlyph, rootId, shortcutId, splitId } from '../lib/items'
import { masteryPercent } from '../lib/mastery'
import { shouldShowLesson } from '../lib/lessons'
import type { CourseStage, ProgressState, TrainingRequest } from '../types'

interface CourseViewProps {
  progress: ProgressState
  onStart: (request: TrainingRequest) => void
}

export function CourseView({ progress, onStart }: CourseViewProps) {
  const startStage = (stage: CourseStage) => {
    const request = requestForStage(stage, progress)
    onStart(request)
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
      <header className="border-b border-zinc-950/8 pb-8 dark:border-white/8">
        <p className="font-mono text-sm font-medium text-brand-700 dark:text-brand-300">完整路线 · 可随时跳关</p>
        <h1 className="mt-2 max-w-[20ch] text-3xl font-semibold text-balance text-zinc-950 sm:text-4xl dark:text-white">从第一次按键，到稳定日用</h1>
        <p className="mt-3 max-w-[56ch] text-base text-pretty text-zinc-600 sm:text-sm dark:text-zinc-400">
          推荐顺序不会锁住内容。已经会的阶段可直接测试，薄弱内容会进入复习队列。
        </p>
      </header>

      <section aria-labelledby="roadmap-title">
        <h2 id="roadmap-title" className="sr-only">课程路线</h2>
        <ol role="list" className="divide-y divide-zinc-950/8 border-y border-zinc-950/8 dark:divide-white/8 dark:border-white/8">
          {courseStages.map((stage) => {
            const percent = stageProgress(stage, progress)
            const request = requestForStage(stage, progress)
            const needsLesson = shouldShowLesson(request, progress)
            return (
              <li key={stage.id} className="grid gap-4 py-5 md:grid-cols-[2.5rem_minmax(0,1fr)_9rem_auto] md:items-center">
                <span className="font-mono text-sm text-zinc-500 tabular-nums dark:text-zinc-400">{String(stage.index).padStart(2, '0')}</span>
                <div className="min-w-0">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold text-zinc-950 dark:text-white">{stage.title}</h3>
                    {percent >= 85 ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 py-1 pr-2 pl-1 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                        <Check className="size-4 shrink-0" aria-hidden="true" />
                        稳定
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 max-w-[68ch] text-base text-pretty text-zinc-600 sm:text-sm dark:text-zinc-400">{stage.description}</p>
                </div>
                <div className="grid gap-2">
                  <div className="flex items-center justify-between gap-3 text-sm text-zinc-500 dark:text-zinc-400">
                    <span>{stage.target}</span>
                    <span className="tabular-nums">{percent}%</span>
                  </div>
                  <ProgressBar value={percent} label={`${stage.title}进度`} tone={stage.index >= 7 ? 'green' : 'blue'} />
                </div>
                <Button
                  size="compact"
                  leadingIcon={percent ? <ArrowRight className="size-4" aria-hidden="true" /> : <Play className="size-4" aria-hidden="true" />}
                  onClick={() => startStage(stage)}
                >
                  {needsLesson ? '学习' : percent ? '继续练习' : '练习'}
                </Button>
              </li>
            )
          })}
        </ol>
      </section>

      <section aria-labelledby="packs-title" className="border-t border-zinc-950/8 pt-8 dark:border-white/8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="packs-title" className="text-xl font-semibold text-zinc-950 dark:text-white">字根微包</h2>
            <p className="mt-1 max-w-[56ch] text-base text-pretty text-zinc-600 sm:text-sm dark:text-zinc-400">每包约 15 个，每轮只学 {progress.settings.newItemsPerRound} 个。前几包优先覆盖常用部件和五个基本笔画。</p>
          </div>
          <p className="text-sm text-zinc-500 tabular-nums dark:text-zinc-400">共 {rootPacks.length} 包 · 241 根</p>
        </div>
        <ul role="list" className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {rootPacks.map((pack, index) => {
            const score = Math.round(pack.roots.reduce((sum, root) => sum + masteryPercent(progress.mastery[rootId(root)]), 0) / pack.roots.length)
            return (
              <li key={pack.id}>
                <button
                  type="button"
                  onClick={() => {
                    const unseen = pack.roots.filter((root) => !progress.mastery[rootId(root)])
                    const selected = (unseen.length ? unseen : pack.roots).slice(0, progress.settings.newItemsPerRound)
                    onStart({ kind: 'roots', title: pack.title, stageId: 'roots', itemIds: selected.map(rootId) })
                  }}
                  className="flex w-full min-w-0 items-center gap-3 rounded-md bg-white p-3 text-left ring-1 ring-zinc-950/8 outline-none hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 dark:bg-white/4 dark:ring-white/8 dark:hover:bg-white/8"
                >
                  <span className="font-mono text-sm text-zinc-500 tabular-nums dark:text-zinc-400">{String(index + 1).padStart(2, '0')}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-base font-medium text-zinc-950 sm:text-sm dark:text-white">{pack.title}</span>
                    <span className="mt-1 block truncate font-root text-sm text-zinc-500 dark:text-zinc-400">{pack.roots.slice(0, 8).map((root) => displayRootGlyph(root.root, root.code)).join(' ')}</span>
                  </span>
                  <span className="text-sm text-zinc-500 tabular-nums dark:text-zinc-400">{score}%</span>
                </button>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}

function requestForStage(stage: CourseStage, progress: ProgressState): TrainingRequest {
  const count = progress.settings.newItemsPerRound
  switch (stage.id) {
    case 'strokes':
      return {
        kind: 'roots',
        title: stage.title,
        stageId: stage.id,
        itemIds: basicStrokes.map((stroke) => rootId(stroke.entry)),
      }
    case 'formula':
      return { kind: 'formula', title: stage.title, stageId: stage.id }
    case 'roots': {
      const pack = rootPacks.find((candidate) => candidate.roots.some((root) => !progress.mastery[rootId(root)])) ?? rootPacks[0]
      const unseen = pack.roots.filter((root) => !progress.mastery[rootId(root)])
      const selected = (unseen.length ? unseen : pack.roots).slice(0, count)
      return { kind: 'roots', title: pack.title, stageId: stage.id, itemIds: selected.map(rootId) }
    }
    case 'splits':
      const unseen = [...splitExamples, ...requiredSplits.filter((entry) => !splitExamples.some((example) => example.char === entry.char))]
        .filter((entry) => !progress.mastery[splitId(entry)])
      const selected = (unseen.length ? unseen : splitExamples).slice(0, Math.max(8, count))
      return {
        kind: 'splits',
        title: stage.title,
        stageId: stage.id,
        itemIds: selected.map(splitId),
      }
    case 'first-500': {
      const pool = characters.filter((item) => item.band === 1)
      const unseen = pool.filter((item) => !progress.mastery[characterId(item)])
      return { kind: 'characters', title: stage.title, stageId: stage.id, itemIds: (unseen.length ? unseen : pool).slice(0, count + 4).map(characterId) }
    }
    case 'shortcuts': {
      const pool = characters.filter((item) => item.short)
      const unseen = pool.filter((item) => !progress.mastery[shortcutId(item)])
      return { kind: 'characters', title: stage.title, stageId: stage.id, itemIds: (unseen.length ? unseen : pool).slice(0, count + 4).map(characterId) }
    }
    case 'phrases':
      return { kind: 'article', title: stage.title, stageId: stage.id, articleId: articles[0].id }
    case 'later-1000': {
      const pool = characters.filter((item) => item.band !== 1)
      const unseen = pool.filter((item) => !progress.mastery[characterId(item)])
      return { kind: 'characters', title: stage.title, stageId: stage.id, itemIds: (unseen.length ? unseen : pool).slice(0, count + 4).map(characterId) }
    }
    case 'fluency':
      return { kind: 'article', title: stage.title, stageId: stage.id, articleId: articles.at(-1)?.id }
    default:
      return { kind: stage.kind, title: stage.title, stageId: stage.id }
  }
}

function stageProgress(stage: CourseStage, progress: ProgressState): number {
  if (stage.id === 'strokes') {
    const entries = basicStrokes.map((stroke) => stroke.entry)
    return average(entries.map((root) => masteryPercent(progress.mastery[rootId(root)])))
  }
  if (stage.id === 'formula') return progress.sessions.some((session) => session.stageId === stage.id) ? 100 : 0
  if (stage.id === 'roots') return average(orderedRoots.map((root) => masteryPercent(progress.mastery[rootId(root)])))
  if (stage.id === 'splits') return average(requiredSplits.map((split) => masteryPercent(progress.mastery[splitId(split)])))
  if (stage.id === 'first-500') return average(characters.slice(0, 500).map((entry) => masteryPercent(progress.mastery[characterId(entry)])))
  if (stage.id === 'shortcuts') {
    const shortcutEntries = characters.slice(0, 500).filter((entry) => entry.short)
    return Math.min(100, Math.round(progress.sessions.filter((session) => session.stageId === stage.id).length * 25 + average(shortcutEntries.map((entry) => masteryPercent(progress.mastery[shortcutId(entry)]))) * 0.5))
  }
  if (stage.id === 'later-1000') return average(characters.slice(500).map((entry) => masteryPercent(progress.mastery[characterId(entry)])))
  const sessions = progress.sessions.filter((session) => session.stageId === stage.id)
  if (!sessions.length) return 0
  return Math.min(100, Math.round(sessions.reduce((sum, session) => sum + session.correct / Math.max(1, session.attempted) * 100, 0) / sessions.length))
}

function average(values: number[]): number {
  if (!values.length) return 0
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
}
