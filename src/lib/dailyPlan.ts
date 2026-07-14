import { characters } from '../data/characters.generated'
import { articles, basicStrokes, courseStages, orderedRoots, splitExamples } from '../data/curriculum'
import { requiredSplits } from '../data/splits.generated'
import type {
  CourseStage,
  DailySegment,
  ProgressState,
  SessionRecord,
  TrainingRequest,
} from '../types'
import { getIntensityProfile, type IntensityProfile } from './intensity'
import { characterId, dueItemIds, isResolvableItemId, rootId, shortcutId, splitId } from './items'
import { shortcutLessonId } from './lessons'
import { splitUsesOnlyRoots } from './splitEncoding'
import { hasCompletedStage } from './stages'

export type DailyStepStatus = 'done' | 'current' | 'upcoming' | 'skipped'

export interface DailyStep {
  id: 'foundation' | 'review' | 'learn' | 'apply'
  label: string
  detail: string
  status: DailyStepStatus
}

export interface CurriculumPosition {
  stage: CourseStage
  completed: number
  total: number
  percent: number
}

export interface DailyPlan {
  dateKey: string
  profile: IntensityProfile
  nextRequest?: TrainingRequest
  complete: boolean
  headline: string
  description: string
  ctaLabel: string
  steps: DailyStep[]
  attempted: number
  targetAttempts: number
  reviewed: number
  introduced: number
  learningTarget: number
  newLimit: number
  dueCount: number
  position: CurriculumPosition
  forecastDue: number
  forecastNewLimit: number
  extraIntroduced: number
}

const basicStrokeIds = new Set(basicStrokes.map((stroke) => rootId(stroke.entry)))
const splitPool = [...splitExamples, ...requiredSplits].filter(
  (split, index, entries) => entries.findIndex((entry) => entry.char === split.char) === index,
)

export function localDateKey(now = Date.now()): string {
  const date = new Date(now)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function buildDailyPlan(progress: ProgressState, now = Date.now()): DailyPlan {
  const dateKey = localDateKey(now)
  const profile = getIntensityProfile(progress.settings.dailyMinutes)
  const sessions = sessionsForDate(progress.sessions, dateKey)
  const plannedSessions = sessions.filter((session) => session.segment !== 'extra')
  const dayStart = localDayStart(now)
  const attempted = sum(plannedSessions.map((session) => session.attempted))
  const reviewed = sum(plannedSessions.filter((session) => session.segment === 'review').map((session) => session.attempted))
  const introduced = sum(plannedSessions
    .filter((session) => session.segment === 'learn')
    .map((session) => session.learningItems ?? session.introduced ?? 0))
  const learnedItemIds = plannedSessions
    .filter((session) => session.segment === 'learn')
    .flatMap((session) => session.itemIds ?? [])
  const extraIntroduced = sum(sessions.filter((session) => session.segment === 'extra').map((session) => session.introduced ?? 0))
  const dueIds = dueItemIds(progress, now)
  const applicationDone = plannedSessions.some((session) => session.segment === 'apply')
  const foundationDoneToday = plannedSessions.some((session) => session.segment === 'foundation')
  const formulaComplete = hasCompletedStage(progress, 'formula')
  const position = curriculumPosition(progress)
  const maxApplicationSize = Math.min(3, profile.newItems)
  const pendingReviewIds = reviewsDueWithinDay(progress, dueIds, now, dayStart)
  const reviewLoad = reviewed + pendingReviewIds.length
  const newLimit = adaptiveNewLimit(profile, reviewLoad, maxApplicationSize)
  const applicationSize = Math.min(maxApplicationSize, newLimit)
  const learningTarget = Math.max(0, newLimit - applicationSize)
  const forecastDue = forecastDueCount(progress, now)
  const forecastNewLimit = adaptiveNewLimit(profile, forecastDue, maxApplicationSize)

  let nextRequest: TrainingRequest | undefined
  let complete = false

  if (!progress.onboardingComplete) {
    nextRequest = dailyRequest({
      kind: 'roots',
      title: '第 1 课：五个基本笔画',
      stageId: 'strokes',
      itemIds: basicStrokes.map((stroke) => rootId(stroke.entry)),
    }, dateKey, 'foundation')
  } else if (foundationDoneToday) {
    complete = true
  } else if (!formulaComplete) {
    nextRequest = dailyRequest({ kind: 'formula', title: courseStages[1].title, stageId: 'formula' }, dateKey, 'foundation')
  } else if (applicationDone || attempted >= profile.targetAttempts) {
    complete = true
  } else if (dueIds.length > 0) {
    const remaining = Math.max(1, profile.targetAttempts - attempted)
    nextRequest = dailyRequest({
      kind: 'review',
      title: '到期复习',
      itemIds: dueIds.slice(0, Math.min(12, remaining)),
    }, dateKey, 'review')
  } else if (newLimit === 0 && pendingReviewIds.length > 0) {
    const remaining = Math.max(1, profile.targetAttempts - attempted)
    nextRequest = dailyRequest({
      kind: 'review',
      title: '即将到期复习',
      itemIds: pendingReviewIds.slice(0, Math.min(12, remaining)),
    }, dateKey, 'review')
  } else if (introduced < learningTarget) {
    const next = nextCurriculumRequest(progress, learningTarget - introduced)
    if (next) {
      const segment: DailySegment = next.request.kind === 'article' ? 'apply' : 'learn'
      nextRequest = dailyRequest(next.request, dateKey, segment)
    }
  }

  if (!complete && !nextRequest) {
    const application = applicationSize
      ? applicationRequest(progress, applicationSize, dayStart, learnedItemIds)
      : undefined
    if (application) nextRequest = dailyRequest(application, dateKey, 'apply')
    else complete = true
  }

  const headline = planHeadline(nextRequest, complete)
  const description = planDescription({
    complete,
    attempted,
    introduced,
    newLimit,
    dueCount: dueIds.length,
    scheduledReviewCount: pendingReviewIds.length,
    nextSegment: nextRequest?.segment,
    profile,
  })
  const ctaLabel = complete
    ? '再深入一轮'
    : attempted > 0
      ? '继续今日训练'
      : nextRequest?.segment === 'foundation'
        ? progress.onboardingComplete ? '学习取码公式' : '开始第 1 课'
        : '开始今日训练'

  return {
    dateKey,
    profile,
    nextRequest,
    complete,
    headline,
    description,
    ctaLabel,
    steps: buildSteps({
      progress,
      formulaComplete,
      nextRequest,
      complete,
      dueCount: dueIds.length,
      scheduledReviewCount: pendingReviewIds.length,
      reviewed,
      introduced,
      learningTarget,
      newLimit,
      applicationDone,
    }),
    attempted,
    targetAttempts: profile.targetAttempts,
    reviewed,
    introduced,
    learningTarget,
    newLimit,
    dueCount: dueIds.length,
    position,
    forecastDue,
    forecastNewLimit,
    extraIntroduced,
  }
}

export function buildDeepDiveRequest(progress: ProgressState, now = Date.now()): TrainingRequest {
  const dateKey = localDateKey(now)
  const profile = getIntensityProfile(progress.settings.dailyMinutes)
  const dueIds = dueItemIds(progress, now)

  if (!progress.onboardingComplete) {
    return dailyRequest({
      kind: 'roots',
      title: '第 1 课：五个基本笔画',
      stageId: 'strokes',
      itemIds: basicStrokes.map((stroke) => rootId(stroke.entry)),
    }, dateKey, 'extra')
  }
  if (!hasCompletedStage(progress, 'formula')) {
    return dailyRequest({ kind: 'formula', title: courseStages[1].title, stageId: 'formula' }, dateKey, 'extra')
  }
  if (dueIds.length) {
    return dailyRequest({ kind: 'review', title: '深入复习', itemIds: dueIds.slice(0, 12) }, dateKey, 'extra')
  }

  const next = nextCurriculumRequest(progress, profile.newItems)
  if (next) return dailyRequest({ ...next.request, title: `深入：${next.request.title}` }, dateKey, 'extra')

  return dailyRequest({
    kind: 'article',
    title: '深入：真实中文跟打',
    stageId: 'fluency',
    articleId: articles.at(-1)?.id,
  }, dateKey, 'extra')
}

export function sessionsForDate(sessions: SessionRecord[], dateKey: string): SessionRecord[] {
  return sessions.filter((session) => session.origin === 'daily'
    && (session.planDate ?? localDateKey(session.finishedAt)) === dateKey)
}

function dailyRequest(request: TrainingRequest, planDate: string, segment: DailySegment): TrainingRequest {
  return { ...request, origin: 'daily', planDate, segment }
}

function adaptiveNewLimit(profile: IntensityProfile, reviewLoad: number, applicationSize: number): number {
  const expectedReviews = profile.newItems + applicationSize
  const overloadReduction = Math.ceil(Math.max(0, reviewLoad - expectedReviews) / 2)
  const budgetLimit = Math.max(0, profile.targetAttempts - reviewLoad - applicationSize)
  return Math.max(0, Math.min(profile.newItems - overloadReduction, budgetLimit, profile.newItems))
}

function nextCurriculumRequest(progress: ProgressState, count: number): { stage: CourseStage; request: TrainingRequest } | undefined {
  if (count <= 0) return undefined

  const rootCandidates = orderedRoots.filter((root) => !basicStrokeIds.has(rootId(root)))
  const pendingRoots = rootCandidates.filter((root) => progress.learned[rootId(root)] && !progress.mastery[rootId(root)])
  const roots = (pendingRoots.length
    ? pendingRoots
    : rootCandidates.filter((root) => !progress.mastery[rootId(root)]))
    .slice(0, count)
  if (roots.length) {
    return {
      stage: courseStages[2],
      request: { kind: 'roots', title: '今日字根', stageId: 'roots', itemIds: roots.map(rootId) },
    }
  }

  const pendingSplits = splitPool.filter((split) => progress.learned[splitId(split)] && !progress.mastery[splitId(split)])
  const splits = (pendingSplits.length
    ? pendingSplits
    : splitPool.filter((split) => !progress.mastery[splitId(split)]))
    .slice(0, count)
  if (splits.length) {
    return {
      stage: courseStages[3],
      request: { kind: 'splits', title: '今日拆字', stageId: 'splits', itemIds: splits.map(splitId) },
    }
  }

  const firstPool = characters.filter((character) => character.band === 1)
  const pendingFirstCharacters = firstPool.filter((character) => progress.learned[characterId(character)] && !progress.mastery[characterId(character)])
  const firstCharacters = (pendingFirstCharacters.length
    ? pendingFirstCharacters
    : firstPool.filter((character) => !progress.mastery[characterId(character)]))
    .slice(0, count)
  if (firstCharacters.length) {
    return {
      stage: courseStages[4],
      request: { kind: 'characters', title: '今日常用字', stageId: 'first-500', itemIds: firstCharacters.map(characterId) },
    }
  }

  const shortcutPool = characters.slice(0, 500).filter((character) => character.short)
  const pendingShortcuts = shortcutPool.filter((character) => {
    const id = characterId(character)
    return progress.learned[shortcutLessonId(id)] && !progress.mastery[shortcutId(character)]
  })
  const shortcuts = (pendingShortcuts.length
    ? pendingShortcuts
    : shortcutPool.filter((character) => !progress.mastery[shortcutId(character)]))
    .slice(0, count)
  if (shortcuts.length) {
    return {
      stage: courseStages[5],
      request: { kind: 'characters', title: '今日简码', stageId: 'shortcuts', itemIds: shortcuts.map(characterId) },
    }
  }

  if (!hasCompletedStage(progress, 'phrases')) {
    return {
      stage: courseStages[6],
      request: { kind: 'article', title: '真实中文短句', stageId: 'phrases', articleId: articles[0].id },
    }
  }

  const laterPool = characters.filter((character) => character.band !== 1)
  const pendingLaterCharacters = laterPool.filter((character) => progress.learned[characterId(character)] && !progress.mastery[characterId(character)])
  const laterCharacters = (pendingLaterCharacters.length
    ? pendingLaterCharacters
    : laterPool.filter((character) => !progress.mastery[characterId(character)]))
    .slice(0, count)
  if (laterCharacters.length) {
    return {
      stage: courseStages[7],
      request: { kind: 'characters', title: '今日进阶常用字', stageId: 'later-1000', itemIds: laterCharacters.map(characterId) },
    }
  }

  return {
    stage: courseStages[8],
    request: { kind: 'article', title: '真实段落跟打', stageId: 'fluency', articleId: articles.at(-1)?.id },
  }
}

function applicationRequest(
  progress: ProgressState,
  count: number,
  dayStart: number,
  learnedItemIds: string[],
): TrainingRequest | undefined {
  const hasCharacterPractice = Object.keys(progress.mastery).some((id) => id.startsWith('char:'))
  if (hasCharacterPractice) {
    return { kind: 'article', title: '把编码用进真实短句', stageId: 'phrases', articleId: articles[0].id }
  }

  const knownRoots = orderedRoots.filter((root) => progress.learned[rootId(root)] || progress.mastery[rootId(root)])
  const preferred = new Map(['休', '扣', '什', '百', '么', '仕', '刁', '壬', '与'].map((char, index) => [char, index]))
  const knownCandidates = splitPool
    .filter((split) => split.roots.length >= 2 && split.roots.length <= 3)
    .filter((split) => splitUsesOnlyRoots(split, knownRoots))
    .sort((left, right) => {
      const leftPriority = preferred.get(left.char) ?? 999
      const rightPriority = preferred.get(right.char) ?? 999
      return leftPriority - rightPriority || left.roots.length - right.roots.length
    })
  const unseen = knownCandidates.filter((split) => !progress.mastery[splitId(split)])
  const practicedSplits = new Set(learnedItemIds.filter((id) => id.startsWith('split:')))
  const practicedToday = knownCandidates.filter((split) => practicedSplits.has(splitId(split)))
  const introducedToday = knownCandidates.filter((split) => (progress.learned[splitId(split)] ?? 0) >= dayStart)
  const selected = (practicedToday.length
    ? practicedToday
    : introducedToday.length
      ? introducedToday
      : unseen.length ? unseen : knownCandidates).slice(0, count)
  if (!selected.length) return undefined
  return { kind: 'splits', title: '把字根用进汉字', stageId: 'splits', itemIds: selected.map(splitId) }
}

function curriculumPosition(progress: ProgressState): CurriculumPosition {
  if (!progress.onboardingComplete) return position(courseStages[0], 0, 1)
  if (!hasCompletedStage(progress, 'formula')) return position(courseStages[1], 0, 1)

  const rootCompleted = orderedRoots.filter((root) => basicStrokeIds.has(rootId(root)) || progress.mastery[rootId(root)]).length
  if (rootCompleted < orderedRoots.length) return position(courseStages[2], rootCompleted, orderedRoots.length)

  const splitCompleted = splitPool.filter((split) => progress.mastery[splitId(split)]).length
  if (splitCompleted < splitPool.length) return position(courseStages[3], splitCompleted, splitPool.length)

  const firstPool = characters.filter((character) => character.band === 1)
  const firstCompleted = firstPool.filter((character) => progress.mastery[characterId(character)]).length
  if (firstCompleted < firstPool.length) return position(courseStages[4], firstCompleted, firstPool.length)

  const shortcutPool = characters.slice(0, 500).filter((character) => character.short)
  const shortcutCompleted = shortcutPool.filter((character) => progress.mastery[shortcutId(character)]).length
  if (shortcutCompleted < shortcutPool.length) return position(courseStages[5], shortcutCompleted, shortcutPool.length)

  if (!hasCompletedStage(progress, 'phrases')) return position(courseStages[6], 0, 1)

  const laterPool = characters.filter((character) => character.band !== 1)
  const laterCompleted = laterPool.filter((character) => progress.mastery[characterId(character)]).length
  if (laterCompleted < laterPool.length) return position(courseStages[7], laterCompleted, laterPool.length)

  return position(courseStages[8], hasCompletedStage(progress, 'fluency') ? 1 : 0, 1)
}

function position(stage: CourseStage, completed: number, total: number): CurriculumPosition {
  return { stage, completed, total, percent: Math.min(100, Math.round(completed / Math.max(1, total) * 100)) }
}

function forecastDueCount(progress: ProgressState, now: number): number {
  const cutoff = now + 24 * 60 * 60_000
  return Object.entries(progress.mastery).filter(([id, record]) => isReviewableId(id)
    && isResolvableItemId(id)
    && record.attempts > 0
    && record.dueAt <= cutoff).length
}

function reviewsDueWithinDay(progress: ProgressState, dueIds: string[], now: number, dayStart: number): string[] {
  const cutoff = now + 24 * 60 * 60_000
  const pending = new Set(dueIds)
  for (const [id, record] of Object.entries(progress.mastery)) {
    if (isReviewableId(id) && isResolvableItemId(id) && record.attempts > 0 && record.lastSeenAt < dayStart && record.dueAt <= cutoff) {
      pending.add(id)
    }
  }
  return [...pending].sort((left, right) => (progress.mastery[left]?.dueAt ?? 0) - (progress.mastery[right]?.dueAt ?? 0))
}

function isReviewableId(id: string): boolean {
  return id.startsWith('root:') || id.startsWith('char:') || id.startsWith('split:') || id.startsWith('shortcut:')
}

function planHeadline(request: TrainingRequest | undefined, complete: boolean): string {
  if (complete) return '今天到这里刚好'
  if (request?.segment === 'foundation') return request.stageId === 'strokes' ? '先认识五个基本笔画' : '先学一条取码公式'
  if (request?.segment === 'review') return `先复习 ${request.itemIds?.length ?? 0} 个到期内容`
  if (request?.segment === 'learn') return `下一段：${request.title}`
  if (request?.segment === 'apply') return '把刚学的内容用起来'
  return '继续今天的练习'
}

function planDescription(input: {
  complete: boolean
  attempted: number
  introduced: number
  newLimit: number
  dueCount: number
  scheduledReviewCount: number
  nextSegment?: DailySegment
  profile: IntensityProfile
}): string {
  if (input.complete) {
    return input.attempted
      ? `已完成 ${input.attempted} 题。继续深入是可选的，明天会先处理由此产生的复习。`
      : '今天的基础内容已经完成。可以停在这里，也可以再深入一轮。'
  }
  if (input.dueCount) return '到期内容始终优先；复习负荷越高，今天安排的新内容越少。'
  if (input.nextSegment === 'review' && input.scheduledReviewCount) {
    return '未来 24 小时的复习负荷已满，先提前清掉一部分，不再叠加新内容。'
  }
  return `复习后学习一小组新内容，随后立即应用；预计约 ${input.profile.minutes} 分钟。`
}

function buildSteps(input: {
  progress: ProgressState
  formulaComplete: boolean
  nextRequest?: TrainingRequest
  complete: boolean
  dueCount: number
  scheduledReviewCount: number
  reviewed: number
  introduced: number
  learningTarget: number
  newLimit: number
  applicationDone: boolean
}): DailyStep[] {
  const current = input.nextRequest?.segment
  const foundationDone = input.progress.onboardingComplete && input.formulaComplete
  const reviewDone = input.dueCount === 0
  const learnDone = input.introduced >= input.learningTarget

  return [
    {
      id: 'foundation',
      label: '基础',
      detail: foundationDone ? '基本笔画与取码公式已完成' : '先完成唯一的前置内容',
      status: foundationDone ? 'done' : current === 'foundation' ? 'current' : input.complete ? 'skipped' : 'upcoming',
    },
    {
      id: 'review',
      label: '复习',
      detail: input.dueCount
        ? `${input.dueCount} 项到期`
        : current === 'review' && input.scheduledReviewCount
          ? `${input.scheduledReviewCount} 项即将到期`
          : input.reviewed ? `已完成 ${input.reviewed} 题` : '今天没有到期内容',
      status: current === 'review' ? 'current' : reviewDone ? 'done' : input.complete ? 'skipped' : 'upcoming',
    },
    {
      id: 'learn',
      label: '新学',
      detail: input.learningTarget
        ? `${Math.min(input.introduced, input.learningTarget)} / ${input.learningTarget} 个`
        : input.newLimit ? '本轮直接进入应用' : '今日容量留给复习',
      status: current === 'learn' ? 'current' : learnDone ? 'done' : input.complete ? 'skipped' : 'upcoming',
    },
    {
      id: 'apply',
      label: '应用',
      detail: input.applicationDone ? '已完成拆字或实打' : '用刚学内容完成一轮',
      status: current === 'apply' ? 'current' : input.applicationDone ? 'done' : input.complete ? 'skipped' : 'upcoming',
    },
  ]
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0)
}

function localDayStart(now: number): number {
  const date = new Date(now)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}
