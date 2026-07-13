import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { AppShell } from './components/AppShell'
import { SettingsPanel } from './components/SettingsPanel'
import { useProgress } from './hooks/useProgress'
import { useTheme } from './hooks/useTheme'
import { dueItemIds } from './lib/items'
import type { TrainingRequest, ViewId } from './types'
import { TodayView } from './views/TodayView'

const CourseView = lazy(() => import('./views/CourseView').then((module) => ({ default: module.CourseView })))
const LookupView = lazy(() => import('./views/LookupView').then((module) => ({ default: module.LookupView })))
const ReviewView = lazy(() => import('./views/ReviewView').then((module) => ({ default: module.ReviewView })))
const StatsView = lazy(() => import('./views/StatsView').then((module) => ({ default: module.StatsView })))
const TrainingSession = lazy(() => import('./components/TrainingSession').then((module) => ({ default: module.TrainingSession })))

function App() {
  const {
    progress,
    recordAnswer,
    markLearned,
    completeSession,
    skipOnboarding,
    updateSettings,
    resetProgress,
    restoreProgress,
  } = useProgress()
  const [activeView, setActiveView] = useState<ViewId>('today')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [training, setTraining] = useState<TrainingRequest | null>(null)
  const trainingTriggerRef = useRef<HTMLElement | null>(null)

  useTheme(progress.settings.theme)

  useEffect(() => {
    document.documentElement.classList.toggle(
      'reduce-motion',
      progress.settings.reducedMotion,
    )
  }, [progress.settings.reducedMotion])

  const startTraining = useCallback((request: TrainingRequest) => {
    trainingTriggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    setTraining(request)
  }, [])

  const closeTraining = useCallback(() => {
    setTraining(null)
    window.setTimeout(() => {
      if (trainingTriggerRef.current?.isConnected) {
        trainingTriggerRef.current.focus()
        return
      }
      document.querySelector<HTMLElement>('main button:not(:disabled), main a[href]')?.focus()
    }, 0)
  }, [])

  const view = (() => {
    switch (activeView) {
      case 'course':
        return <CourseView progress={progress} onStart={startTraining} />
      case 'review':
        return <ReviewView progress={progress} onStart={startTraining} />
      case 'stats':
        return <StatsView progress={progress} onStart={startTraining} />
      case 'lookup':
        return <LookupView />
      case 'today':
      default:
        return (
          <TodayView
            progress={progress}
            onStart={startTraining}
            onOpenCourse={() => setActiveView('course')}
            onSkipOnboarding={() => {
              skipOnboarding()
              setActiveView('course')
            }}
          />
        )
    }
  })()

  return (
    <>
      <div inert={training ? true : undefined} aria-hidden={training ? true : undefined}>
        <AppShell
          activeView={activeView}
          onViewChange={setActiveView}
          onOpenSettings={() => setSettingsOpen(true)}
          dueCount={dueItemIds(progress).length}
        >
          <Suspense fallback={<ViewLoading />}>{view}</Suspense>
        </AppShell>

        <SettingsPanel
          open={settingsOpen}
          progress={progress}
          onClose={() => setSettingsOpen(false)}
          onUpdate={updateSettings}
          onReset={resetProgress}
          onRestore={restoreProgress}
        />
      </div>

      {training ? (
        <Suspense fallback={<SessionLoading />}>
          <TrainingSession
            key={`${training.kind}-${training.title}-${training.articleId ?? ''}`}
            request={training}
            progress={progress}
            onAnswer={recordAnswer}
            onLearned={markLearned}
            onComplete={completeSession}
            onClose={closeTraining}
          />
        </Suspense>
      ) : null}
    </>
  )
}

export default App

function ViewLoading() {
  return (
    <div className="mx-auto grid min-h-80 max-w-6xl place-items-center px-4" role="status">
      <p className="text-base text-zinc-500 sm:text-sm dark:text-zinc-400">正在载入…</p>
    </div>
  )
}

function SessionLoading() {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-canvas dark:bg-canvas-dark" role="status">
      <p className="text-base text-zinc-500 sm:text-sm dark:text-zinc-400">正在准备训练…</p>
    </div>
  )
}
