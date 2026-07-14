import { expect, test, type Locator, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (window.sessionStorage.getItem('tiger-flow-e2e-ready')) return
    window.localStorage.clear()
    window.sessionStorage.setItem('tiger-flow-e2e-ready', '1')
  })
  await page.goto('/')
})

test('fresh learner sees answers and guided typing before recall', async ({ page }, testInfo) => {
  await expect(page.getByRole('heading', { name: '先看字形，再把两键练成反射' })).toBeVisible()
  await expect(page.getByText('横 fi，竖 gs，撇 tp，点/捺 id，折 ae。')).toBeVisible()
  await expect(page.getByText('例字：百、丞、刁、孑')).toBeVisible()
  await expect(page.getByText('快速热身')).toHaveCount(0)
  await page.evaluate(() => {
    const key = 'tiger-flow-progress-v1'
    const progress = JSON.parse(window.localStorage.getItem(key) ?? '{}')
    progress.settings.autoAdvance = false
    window.localStorage.setItem(key, JSON.stringify(progress))
  })
  await page.reload()
  await page.getByRole('button', { name: '开始第 1 课' }).click()
  const training = page.getByRole('dialog', { name: '第 1 课：五个基本笔画' })

  await expect(page.getByText('先学，答案可见')).toBeVisible()
  await expect(page.getByRole('heading', { name: '先看字形、根码和例字' })).toBeVisible()
  await expect(page.getByText('fi', { exact: true }).first()).toBeVisible()
  await expect(training.getByText('例字：申')).toBeVisible()
  await expect(page.getByRole('textbox', { name: /输入.*虎码编码/ })).toHaveCount(0)
  await expect(page.getByRole('navigation')).toHaveCount(0)

  await page.getByRole('button', { name: '开始两轮跟打' }).click()
  const codes = ['fi', 'gs', 'tp', 'id', 'ae']
  await completeGuidedRootCopy(page, codes)

  await expect(page.getByText('英文练码')).toBeVisible()
  await expect.poll(() => readProgressCount(page, 'learned')).toBe(5)
  expect(await readProgressCount(page, 'mastery')).toBe(0)
  await expect(training.getByText('交错盲打，第 1 / 2 轮')).toBeVisible()

  const answer = page.getByRole('textbox', { name: /输入.*虎码编码/ })
  const visibleCodeSlots = answer.locator('xpath=preceding-sibling::div[1]')
  await expect(visibleCodeSlots).toHaveCSS('outline-style', 'solid')
  const firstGlyph = await training.locator('#question-glyph').textContent()
  const firstCode = rootCodeForGlyph(firstGlyph)
  const hintButton = training.getByRole('button', { name: '给我编码' })
  await expect(hintButton).toHaveAttribute('aria-expanded', 'false')
  await expect(training.locator('#code-memory-hint')).toHaveCount(1)
  await hintButton.click()
  await expect(training.getByRole('button', { name: '收起编码' })).toHaveAttribute('aria-expanded', 'true')
  await expect(training.getByText(`编码是 ${firstCode}。看着答案正确敲一次，这个字根稍后会重新出现。`)).toBeVisible()
  await expect(answer).toBeEditable()
  await expect(answer).toBeFocused()
  await expect(answer).toHaveAttribute('aria-describedby', 'code-memory-hint')
  await answer.fill(firstCode)
  await expect(page.getByText('看过编码，先修正手指动作')).toBeVisible()
  await expect(answer).not.toHaveAttribute('aria-describedby', /.+/)
  const firstRepair = training.getByRole('textbox', { name: /重新输入.*正确编码/ })
  await expect(firstRepair).toBeFocused()
  await expect(training.getByRole('button', { name: '下一题' })).toHaveCount(0)
  await firstRepair.fill(firstCode)
  await expect(page.getByText('动作已修正，这次不计掌握，稍后重新盲打。')).toBeVisible()
  await expect(training.getByRole('button', { name: '下一题' })).toBeFocused()
  await expect.poll(() => readProgressCount(page, 'mastery')).toBe(1)
  await expect.poll(() => readMasteryCorrect(page, rootIdForGlyph(firstGlyph))).toBe(0)

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
  expect(overflow).toBe(false)
  await page.screenshot({ path: `test-results/${testInfo.project.name}-guided-training.png`, fullPage: true })

  await training.getByRole('button', { name: '下一题' }).click()
  const secondGlyph = await training.locator('#question-glyph').textContent()
  const secondCode = rootCodeForGlyph(secondGlyph)
  await answer.fill('zz')
  await expect(page.getByText('你的输入：zz')).toBeVisible()
  await expect(page.getByText('正确编码：').getByText(secondCode)).toBeVisible()
  const secondRepair = training.getByRole('textbox', { name: /重新输入.*正确编码/ })
  await expect(secondRepair).toBeFocused()
  await secondRepair.fill(secondCode)
  await training.getByRole('button', { name: '下一题' }).click()

  await finishRootRecall(training)
  await expect(page.getByRole('heading', { name: '本轮完成' })).toBeFocused()
  await expect(training.getByText('83%', { exact: true })).toBeVisible()
  await expect(training.locator('dl > div').filter({ hasText: '首答正确' }).getByText('8', { exact: true })).toBeVisible()
  await expect.poll(() => readLatestSessionSummary(page)).toBe('12/10/8')
  await page.getByRole('button', { name: '完成今日训练' }).click()
  await expect(page.getByRole('heading', { name: '今天到这里刚好' })).toBeVisible()
  await expect(page.getByRole('button', { name: '再深入一轮' })).toBeFocused()

  await openView(page, '课程')
  const strokeStage = page.getByRole('listitem').filter({
    has: page.getByRole('heading', { name: '五个笔画，先会按' }),
  })
  await expect(strokeStage.getByText('100%', { exact: true })).toBeVisible()
  await expect(strokeStage.getByText('已完成', { exact: true })).toBeVisible()
})

test('root primer explains examples and locates the root inside a character', async ({ page }) => {
  await page.evaluate(() => {
    const key = 'tiger-flow-progress-v1'
    const progress = JSON.parse(window.localStorage.getItem(key) ?? '{}') as {
      settings?: { dailyMinutes?: number; newItemsPerRound?: number }
    }
    if (!progress.settings) throw new Error('Expected initialized progress settings')
    progress.settings.dailyMinutes = 20
    progress.settings.newItemsPerRound = 12
    window.localStorage.setItem(key, JSON.stringify(progress))
  })
  await page.reload()
  await openView(page, '课程')
  const rootStage = page.getByRole('listitem').filter({
    has: page.getByRole('heading', { name: '字根微包', exact: true }),
  })
  await rootStage.getByRole('button', { name: '学习' }).click()

  const training = page.getByRole('dialog')
  await expect(training.getByRole('heading', { name: '先看字形、根码和例字' })).toBeVisible()
  const rootNote = training.getByRole('note', { name: '字根说明' })
  await expect(rootNote).toContainText('完整字根不再往下拆')
  await expect(rootNote).toContainText('先按大码，再按小码')
  await expect(training.getByRole('button', { name: '开始两轮跟打' })).toBeVisible()
  await training.getByRole('button', { name: '开始两轮跟打' }).click()

  const application = training.getByRole('region', { name: '字根“一”的例字' })
  await expect(application).toContainText('例字是字根或变形出现过的整字')
  await expect(application).toContainText('百')
  await expect(application).toContainText('一')
  await expect(application).toContainText('Fi')
  await expect(application).toContainText('白')
  await expect(application).toContainText('Ub')
  await expect(application.getByText('当前根', { exact: true })).toBeVisible()
})

test('leaving after guided root copying returns to the primer', async ({ page }) => {
  await page.getByRole('button', { name: '开始第 1 课' }).click()
  const training = page.getByRole('dialog', { name: '第 1 课：五个基本笔画' })
  await expect(training.getByRole('heading', { name: '先看字形、根码和例字' })).toBeVisible()
  await training.getByRole('button', { name: '开始两轮跟打' }).click()
  await completeGuidedRootCopy(page, ['fi', 'gs', 'tp', 'id', 'ae'])

  await expect(training.getByText('英文练码')).toBeVisible()
  await training.getByRole('button', { name: '退出训练' }).click()
  await expect(page.getByRole('heading', { name: '先看字形，再把两键练成反射' })).toBeVisible()

  await openView(page, '课程')
  const incompleteStrokeStage = page.getByRole('listitem').filter({
    has: page.getByRole('heading', { name: '五个笔画，先会按' }),
  })
  await expect(incompleteStrokeStage.getByText('0%', { exact: true })).toBeVisible()
  await expect(incompleteStrokeStage.getByText('已完成', { exact: true })).toHaveCount(0)

  await incompleteStrokeStage.getByRole('button', { name: '学习' }).click()
  const resumedTraining = page.getByRole('dialog', { name: '五个笔画，先会按' })
  await expect(resumedTraining.getByRole('heading', { name: '先看字形、根码和例字' })).toBeVisible()
  await expect(resumedTraining.getByRole('note', { name: '字根说明' })).toBeVisible()
  await expect(resumedTraining.getByRole('textbox', { name: /输入.*虎码编码/ })).toHaveCount(0)
})

test('pausing preserves the current motor drill question', async ({ page }) => {
  await page.evaluate(() => {
    const key = 'tiger-flow-progress-v1'
    const progress = JSON.parse(window.localStorage.getItem(key) ?? '{}')
    progress.settings.autoAdvance = false
    window.localStorage.setItem(key, JSON.stringify(progress))
  })
  await page.reload()
  await page.getByRole('button', { name: '开始第 1 课' }).click()
  const training = page.getByRole('dialog', { name: '第 1 课：五个基本笔画' })
  await training.getByRole('button', { name: '我已经会了，直接练习' }).click()

  const answer = training.getByRole('textbox', { name: /输入.*虎码编码/ })
  const firstGlyph = await training.locator('#question-glyph').textContent()
  await answer.fill(rootCodeForGlyph(firstGlyph))
  await training.getByRole('button', { name: '下一题' }).click()
  await expect(training.getByText('2 / 10', { exact: true })).toBeVisible()
  const currentGlyph = await training.locator('#question-glyph').textContent()

  await training.getByRole('button', { name: '暂停训练' }).click()
  await expect(training.getByRole('heading', { name: '训练已暂停' })).toBeVisible()
  await training.getByRole('button', { name: '继续', exact: true }).click()

  await expect(training.getByText('2 / 10', { exact: true })).toBeVisible()
  await expect(training.locator('#question-glyph')).toHaveText(currentGlyph ?? '')
  await expect(answer).toBeFocused()
})

test('split learner can request the worked process without gaining mastery', async ({ page }) => {
  await openView(page, '课程')
  const splitStage = page.getByRole('listitem').filter({ hasText: '看懂拆分' })
  await splitStage.getByRole('button', { name: '学习' }).click()
  await page.getByRole('button', { name: '看完过程，开始选字根' }).click()

  await page.getByRole('button', { name: '我不会，带我拆这题' }).click()
  await expect(page.getByText('已带你拆完，本题不计掌握')).toBeVisible()
  const process = page.getByRole('region', { name: '“秃”的拆字过程' })
  await expect(process).toContainText('禾')
  await expect(process).toContainText('Xh')
  await expect(process).toContainText('几')
  await expect(process).toContainText('Oj')
  await expect(process).toContainText('xoj')
  await expect.poll(() => readMasteryCorrect(page, 'split:秃')).toBe(0)
  const guidedResults = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
  expect(guidedResults.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''))).toEqual([])

  await page.getByRole('button', { name: '下一题' }).click()
  await expect(page.getByRole('heading', { name: '秃' })).toBeFocused()
  await expect(page.getByText('本轮错题再测')).toBeVisible()
  await page.getByRole('group', { name: '为“秃”选择拆分' }).getByRole('button', { name: '禾 + 几' }).click()
  await page.getByRole('button', { name: '下一题' }).click()
  await expect(page.getByRole('heading', { name: '本轮完成' })).toBeVisible()
  await expect(page.locator('dl > div').filter({ hasText: '首答正确' }).getByText('0', { exact: true })).toBeVisible()
})

test('incorrect split feedback has no serious accessibility violations', async ({ page }) => {
  await openView(page, '课程')
  const splitStage = page.getByRole('listitem').filter({ hasText: '看懂拆分' })
  await splitStage.getByRole('button', { name: '学习' }).click()
  await page.getByRole('button', { name: '看完过程，开始选字根' }).click()

  const choices = page.getByRole('group', { name: '为“秃”选择拆分' }).getByRole('button')
  const labels = await choices.allTextContents()
  const wrongIndex = labels.findIndex((label) => label.trim() !== '禾 + 几')
  expect(wrongIndex).toBeGreaterThanOrEqual(0)
  await choices.nth(wrongIndex).click()
  await expect(page.getByText(/正确拆分：秃 = 禾 \+ 几/)).toBeVisible()

  const incorrectResults = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
  expect(incorrectResults.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''))).toEqual([])
})

test('interrupted shortcut lesson reopens before moving to another pack', async ({ page }) => {
  await openView(page, '课程')
  const shortcutStage = page.getByRole('listitem').filter({ hasText: '简码与选重' })
  await shortcutStage.getByRole('button', { name: '学习' }).click()
  const training = page.getByRole('dialog', { name: '简码与选重' })
  await expect(training.getByRole('heading', { name: '先看答案，不测试' })).toBeVisible()
  const firstLessonCode = await training.getByText('高频简码').first().locator('..').textContent()

  await training.getByRole('button', { name: '我已经会了，直接练习' }).click()
  await expect(training.getByText('英文练码')).toBeVisible()
  await training.getByRole('button', { name: '退出训练' }).click()

  await shortcutStage.getByRole('button', { name: '学习' }).click()
  await expect(training.getByRole('heading', { name: '先看答案，不测试' })).toBeVisible()
  await expect(training.getByText('高频简码').first().locator('..')).toHaveText(firstLessonCode ?? '')
  await expect(training.getByRole('textbox', { name: /输入.*虎码编码/ })).toHaveCount(0)
})

test('today exposes one next action and a read-only daily path', async ({ page }) => {
  await page.getByRole('button', { name: '我已经学过' }).click()

  const mainHeader = page.locator('main header')
  await expect(mainHeader.getByRole('button', { name: '学习取码公式' })).toBeVisible()
  await expect(mainHeader.getByRole('button')).toHaveCount(1)

  const dailyPath = page.locator('section[aria-labelledby="today-path-title"]')
  await expect(dailyPath.getByRole('heading', { name: '今日轨迹' })).toBeVisible()
  await expect(dailyPath.getByRole('listitem')).toHaveCount(4)
  await expect(dailyPath.getByRole('button')).toHaveCount(0)
  await expect(dailyPath.getByText('系统按顺序推进，当前步骤不需要手动选择。')).toBeVisible()
})

test('training intensity persists its matching daily limits', async ({ page }) => {
  await page.getByRole('button', { name: '我已经学过' }).click()

  const intensity = page.getByRole('group', { name: '训练强度' })
  await expect(intensity.getByRole('button', { name: '标准，10 分钟' })).toHaveAttribute('aria-pressed', 'true')
  await intensity.getByRole('button', { name: '深入，20 分钟' }).click()
  await expect(intensity.getByRole('button', { name: '深入，20 分钟' })).toHaveAttribute('aria-pressed', 'true')
  await expect.poll(async () => page.evaluate(() => {
    const progress = JSON.parse(window.localStorage.getItem('tiger-flow-progress-v1') ?? '{}') as {
      settings?: { dailyMinutes?: number; newItemsPerRound?: number }
    }
    return `${progress.settings?.dailyMinutes}/${progress.settings?.newItemsPerRound}`
  })).toBe('20/12')
})

test('an interrupted daily lesson resumes before application', async ({ page }) => {
  await page.evaluate(() => {
    const key = 'tiger-flow-progress-v1'
    const progress = JSON.parse(window.localStorage.getItem(key) ?? '{}')
    const finishedAt = Date.now() - 86_400_000
    progress.onboardingComplete = true
    progress.completedStages = { strokes: finishedAt, formula: finishedAt }
    progress.sessions = [{
      id: 'formula-complete',
      kind: 'formula',
      stageId: 'formula',
      finishedAt,
      durationSeconds: 60,
      attempted: 5,
      correct: 5,
      firstTryCorrect: 5,
      medianMs: 700,
    }]
    window.localStorage.setItem(key, JSON.stringify(progress))
  })
  await page.reload()

  await page.getByRole('button', { name: '开始今日训练' }).click()
  const training = page.getByRole('dialog', { name: '今日字根' })
  await training.getByRole('button', { name: '开始两轮跟打' }).click()
  await completeVisibleGuidedRootCopy(page, 5)
  await expect(training.getByText('英文练码')).toBeVisible()
  await training.getByRole('button', { name: '退出训练' }).click()

  await expect(page.getByRole('heading', { name: '下一段：今日字根' })).toBeVisible()
  await expect(page.getByRole('heading', { name: '把刚学的内容用起来' })).toHaveCount(0)
  await page.getByRole('button', { name: '开始今日训练' }).click()
  await expect(training.getByRole('heading', { name: '先看字形、根码和例字' })).toBeVisible()
})

test('due review is the only next action before new learning', async ({ page }) => {
  await page.evaluate(() => {
    const key = 'tiger-flow-progress-v1'
    const progress = JSON.parse(window.localStorage.getItem(key) ?? '{}')
    const now = Date.now()
    progress.onboardingComplete = true
    progress.learned = { 'root:fi:一': now - 86_400_000 }
    progress.mastery = {
      'root:fi:一': {
        level: 1,
        attempts: 1,
        correct: 1,
        streak: 1,
        lapses: 0,
        averageMs: 800,
        lastSeenAt: now - 86_400_000,
        dueAt: now - 1_000,
      },
    }
    progress.sessions = [{
      id: 'formula-complete',
      kind: 'formula',
      stageId: 'formula',
      finishedAt: now - 86_400_000,
      durationSeconds: 60,
      attempted: 5,
      correct: 5,
      firstTryCorrect: 5,
      medianMs: 700,
    }]
    window.localStorage.setItem(key, JSON.stringify(progress))
  })
  await page.reload()

  await expect(page.getByRole('heading', { name: '先复习 1 个到期内容' })).toBeVisible()
  const mainHeader = page.locator('main header')
  await expect(mainHeader.getByRole('button', { name: '开始今日训练' })).toBeVisible()
  await expect(mainHeader.getByRole('button')).toHaveCount(1)

  const dailyPath = page.locator('section[aria-labelledby="today-path-title"]')
  await expect(dailyPath.getByRole('listitem').filter({ hasText: '复习' })).toContainText('进行中')
  await expect(dailyPath.getByRole('button')).toHaveCount(0)
  for (const oldEntry of ['到期复习', '新字根微包', '第一个拆分示范']) {
    await expect(page.getByRole('button', { name: oldEntry, exact: true })).toHaveCount(0)
  }

  await mainHeader.getByRole('button', { name: '开始今日训练' }).click()
  const review = page.getByRole('dialog', { name: '到期复习' })
  await expect(review).toBeVisible()
  const answer = review.getByRole('textbox', { name: /输入.*虎码编码/ })
  await review.getByRole('button', { name: '给我编码' }).click()
  await answer.fill('fi')
  await expect(review.getByText('看过编码，先修正手指动作')).toBeVisible()
  await review.getByRole('textbox', { name: '重新输入“一”的正确编码' }).fill('fi')
  await review.getByRole('button', { name: '下一题' }).click()
  await expect(review.getByText('错题重新盲打')).toBeVisible()
  await answer.fill('fi')
  await expect(review.getByRole('heading', { name: '本轮完成' })).toBeVisible()
  await review.getByRole('button', { name: '继续下一段' }).click()
  await expect(review.getByRole('heading', { name: '本轮完成' })).toHaveCount(0)
  await expect(page.getByRole('dialog', { name: '今日字根' }).getByRole('heading', { name: '先看字形、根码和例字' })).toBeVisible()
})

test('lookup loads offline character data', async ({ page }) => {
  await openView(page, '查码')
  const search = page.getByRole('searchbox', { name: '输入汉字或编码' })
  await search.fill('虎码')
  await expect(page.getByText('zh', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('mnm', { exact: true })).toBeVisible()

  const characterTab = page.getByRole('tab', { name: '汉字' })
  const rootTab = page.getByRole('tab', { name: '字根' })
  await characterTab.focus()
  await page.keyboard.press('ArrowRight')
  await expect(rootTab).toBeFocused()
  await expect(rootTab).toHaveAttribute('aria-selected', 'true')
  await expect(page.locator('#lookup-panel-characters')).toBeHidden()
  await expect(page.locator('#lookup-panel-roots')).toBeVisible()
  const rootSearch = page.getByRole('searchbox', { name: '输入字根或编码' })
  await rootSearch.fill('bk')
  await expect(page.getByText('𠂎', { exact: true })).toBeVisible()
  await rootSearch.fill('rk')
  await expect(page.getByText('囗', { exact: true }).first()).toBeVisible()
})

test('theme choice persists and dark asset is selected', async ({ page }, testInfo) => {
  const isMobile = page.viewportSize()!.width < 1024
  if (isMobile) {
    await page.getByRole('button', { name: '设置' }).click()
  } else {
    await page.getByRole('button', { name: '设置' }).click()
  }
  await page.getByRole('button', { name: '深色' }).click()
  await expect(page.locator('html')).toHaveClass(/dark/)
  const buildInfo = page.getByText(/^版本 (?:[0-9a-f]{7}|dev)，构建于 \d{4}-\d{2}-\d{2}$/)
  await expect(buildInfo).toBeVisible()
  await expect(buildInfo.locator('time')).toHaveAttribute('datetime', /^\d{4}-\d{2}-\d{2}T/)
  await page.getByRole('button', { name: '关闭设置', exact: true }).click()
  await page.reload()
  await expect(page.locator('html')).toHaveClass(/dark/)
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#111310')

  await openView(page, '查码')
  const darkChartLink = page.getByRole('link', { name: '在新标签页打开深色官方字根图' })
  const lightChartLink = page.locator('a[aria-label="在新标签页打开浅色官方字根图"]')
  await expect(darkChartLink).toBeVisible()
  await expect(lightChartLink).toBeHidden()
  await expect(darkChartLink).toHaveAttribute('href', /tiger-root-chart-dark\.webp$/)
  await expect(darkChartLink).toHaveAttribute('target', '_blank')
  await expect(darkChartLink).toHaveAttribute('rel', 'noreferrer')
  await darkChartLink.scrollIntoViewIfNeeded()
  await expect.poll(() => darkChartLink.locator('img').evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true)
  await page.screenshot({ path: `test-results/${testInfo.project.name}-dark.png`, fullPage: true })
})

test('real input session accepts composed Chinese text', async ({ page }) => {
  await openView(page, '课程')
  const phraseStage = page.getByRole('listitem').filter({ hasText: '短句与真实输入' })
  await phraseStage.getByRole('button', { name: '学习' }).click()
  await expect(page.getByRole('heading', { name: '先切到 Fcitx5 虎码' })).toBeVisible()
  await page.getByRole('button', { name: '开始 Fcitx5 实打' }).click()
  await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', isComposing: true })))
  await expect(page.getByRole('textbox', { name: '输入区' })).toBeVisible()
  const input = page.getByRole('textbox', { name: '输入区' })
  await input.fill('今天下午三点开会，请把修改后的文档发给我。')
  await expect(page.getByText('100%')).toBeVisible()
  await page.getByRole('button', { name: '完成本段' }).click()
  await expect(page.getByRole('heading', { name: '本轮完成' })).toBeVisible()
})

test('course exposes formula and split practice', async ({ page }) => {
  await openView(page, '课程')
  await expect(page.getByRole('heading', { name: '从第一次按键，到稳定日用' })).toBeVisible()

  const formulaStage = page.getByRole('listitem').filter({ hasText: '一条取码公式' })
  await formulaStage.getByRole('button', { name: '学习' }).click()
  await expect(page.getByRole('heading', { name: '只记这一条取码公式' })).toBeVisible()
  await page.getByRole('button', { name: '开始公式练习' }).click()
  const answers = ['Aa', 'ABb', 'ABCc', 'ABCD', 'ABCZ']
  const answerSlots: number[] = []

  for (const [index, answer] of answers.entries()) {
    const questionHeading = index === answers.length - 1 ? '五根及以上怎样取码？' : `${index + 1} 个字根怎样取码？`
    await expect(page.getByRole('heading', { name: questionHeading })).toBeFocused()
    const choices = page.getByRole('group', { name: '取码选项' }).getByRole('button')
    const before = await choices.allTextContents()
    answerSlots.push(before.indexOf(answer))
    const answerButton = page.getByRole('button', { name: answer, exact: true })
    await answerButton.click()
    await expect(page.getByText('正确', { exact: true })).toBeVisible()
    expect(await choices.allTextContents()).toEqual(before)
    await expect(answerButton).toBeDisabled()
    expect(await choices.evaluateAll((buttons) => buttons.every((button) => (button as HTMLButtonElement).disabled))).toBe(true)
    await expect(page.getByRole('button', { name: '下一题' })).toBeFocused()

    if (index < answers.length - 1) {
      await page.getByRole('button', { name: '下一题' }).click()
    }
  }

  expect(answerSlots.toSorted()).toEqual([0, 1, 2, 3, 4])
  expect(answerSlots).not.toEqual([0, 1, 2, 3, 4])
  expect(answerSlots).not.toEqual([4, 3, 2, 1, 0])
  await page.getByRole('button', { name: '退出训练' }).click()

  const splitStage = page.getByRole('listitem').filter({ hasText: '看懂拆分' })
  await splitStage.getByRole('button', { name: '学习' }).click()
  await expect(page.getByRole('heading', { name: '看懂汉字怎样一步步变成全码' })).toBeVisible()
  const splitBasics = page.locator('section[aria-labelledby="split-basics-title"]')
  await expect(splitBasics.getByRole('heading', { name: '虎码拆分不是按部首分类' })).toBeVisible()
  await expect(splitBasics).toContainText('柯 → 木 + 可')
  await expect(splitBasics).toContainText('普通拆分，不断笔')
  await expect(splitBasics).toContainText('果 → 田 + 木')
  await expect(splitBasics).toContainText('切字，必要时剪断一笔')
  await expect(splitBasics).toContainText('惠拆成十 + 田 + 厶 + 心')
  const splitPrimer = page.getByRole('region', { name: '“秃”的拆字过程' })
  await expect(splitPrimer).toContainText('秃')
  await expect(splitPrimer).toContainText('禾')
  await expect(splitPrimer).toContainText('Xh')
  await expect(splitPrimer).toContainText('几')
  await expect(splitPrimer).toContainText('Oj')
  await expect(splitPrimer).toContainText('ABb')
  await expect(splitPrimer).toContainText('xoj')

  await page.getByRole('button', { name: '看完过程，开始选字根' }).click()
  const splitChoices = page.getByRole('group', { name: '为“秃”选择拆分' })
  await expect(splitChoices).toBeVisible()
  await expect(page.getByText('1 / 1', { exact: true })).toBeVisible()
  await expect(page.getByRole('textbox')).toHaveCount(0)
  const correctSplit = splitChoices.getByRole('button', { name: '禾 + 几' })
  await expect(correctSplit).toHaveAttribute('aria-pressed', 'false')
  await correctSplit.click()
  await expect(correctSplit).toHaveAttribute('aria-pressed', 'true')
  await expect(correctSplit).toBeDisabled()
  expect(await splitChoices.getByRole('button').evaluateAll((buttons) => buttons.every((button) => (button as HTMLButtonElement).disabled))).toBe(true)
  await expect(page.getByRole('button', { name: '下一题' })).toBeFocused()
  await expect(page.getByText(/秃 = 禾 \+ 几/)).toBeVisible()

  const splitFeedback = page.getByRole('region', { name: '“秃”的拆字过程' })
  await expect(splitFeedback).toContainText('禾')
  await expect(splitFeedback).toContainText('Xh')
  await expect(splitFeedback).toContainText('几')
  await expect(splitFeedback).toContainText('Oj')
  await expect(splitFeedback).toContainText('ABb')
  await expect(splitFeedback).toContainText('xoj')
  await page.getByRole('button', { name: '退出训练' }).click()

  await splitStage.getByRole('button', { name: '学习' }).click()
  const splitRulesReview = page.getByText('重看普通拆分与切字')
  await expect(splitRulesReview).toBeVisible()
  await splitRulesReview.click()
  await expect(page.getByRole('heading', { name: '虎码拆分不是按部首分类' })).toBeVisible()
  await page.getByRole('button', { name: '退出训练' }).click()

  const shortcutStage = page.getByRole('listitem').filter({ hasText: '简码与选重' })
  await shortcutStage.getByRole('button', { name: '学习' }).click()
  await expect(page.getByRole('heading', { name: '先看答案，不测试' })).toBeVisible()
  await expect(page.getByText('高频简码').first()).toBeVisible()
})

test('stats history stays inside a 320 pixel viewport and exposes chart values', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 760 })
  await page.evaluate(() => {
    const key = 'tiger-flow-progress-v1'
    const progress = JSON.parse(window.localStorage.getItem(key) ?? '{}')
    progress.onboardingComplete = true
    progress.sessions = [{
      id: 'stats-layout',
      kind: 'roots',
      stageId: 'roots',
      finishedAt: Date.now(),
      durationSeconds: 90,
      attempted: 12,
      correct: 11,
      firstTryCorrect: 10,
      medianMs: 900,
    }]
    window.localStorage.setItem(key, JSON.stringify(progress))
  })
  await page.reload()
  await openView(page, '轨迹')
  await expect(page.locator('main')).toBeFocused()

  const chart = page.getByRole('list', { name: '最近七天训练题数' })
  await expect(chart).toBeVisible()
  await expect(chart).toContainText('12')
  expect(await hasHorizontalOverflow(page)).toBe(false)
})

test('layout reflows at 320 CSS pixels', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 760 })
  await page.reload()
  await expect(page.getByRole('heading', { name: '先看字形，再把两键练成反射' })).toBeVisible()
  await expect(page.getByRole('button', { name: '开始第 1 课' })).toBeVisible()
  const menuTrigger = page.getByRole('button', { name: '打开导航' })
  await menuTrigger.click()
  await expect(page.getByRole('navigation', { name: '移动导航' }).getByRole('button').first()).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(menuTrigger).toBeFocused()
  await expect(page.getByRole('navigation', { name: '移动导航' })).toHaveCount(0)
  await menuTrigger.click()
  const mobileNavigation = page.getByRole('navigation', { name: '移动导航' })
  await mobileNavigation.getByRole('button').last().focus()
  await page.keyboard.press('Tab')
  await expect(mobileNavigation).toHaveCount(0)
  expect(await hasHorizontalOverflow(page)).toBe(false)

  await page.getByRole('button', { name: '开始第 1 课' }).click()
  await expect(page.getByRole('heading', { name: '先看字形、根码和例字' })).toBeVisible()
  expect(await hasHorizontalOverflow(page)).toBe(false)
  await page.getByRole('button', { name: '退出训练' }).click()

  await openView(page, '课程')
  const formulaStage = page.getByRole('listitem').filter({ hasText: '一条取码公式' })
  await formulaStage.getByRole('button', { name: '学习' }).click()
  await expect(page.getByRole('heading', { name: '只记这一条取码公式' })).toBeVisible()
  expect(await hasHorizontalOverflow(page)).toBe(false)
})

test('today and training views have no serious accessibility violations', async ({ page }) => {
  const todayResults = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze()
  expect(todayResults.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''))).toEqual([])

  await openView(page, '轨迹')
  await page.getByRole('button', { name: '开始第一课' }).click()
  await expect(page.getByRole('heading', { name: '先看字形、根码和例字' })).toBeVisible()
  const trainingResults = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze()
  expect(trainingResults.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''))).toEqual([])

  await page.getByRole('button', { name: '我已经会了，直接练习' }).click()
  await page.getByRole('button', { name: '给我编码' }).click()
  const hintResults = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze()
  expect(hintResults.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''))).toEqual([])

  await page.getByRole('textbox', { name: /输入.*虎码编码/ }).fill('aa')
  const repair = page.getByRole('textbox', { name: /重新输入.*正确编码/ })
  await expect(repair).toBeFocused()
  const expectedCode = await page.getByText('正确编码：').locator('span').textContent()
  if (!expectedCode) throw new Error('Expected a root repair code')
  await repair.fill(expectedCode)
  await expect(page.getByRole('button', { name: '下一题' })).toBeFocused()
  const incorrectResults = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze()
  expect(incorrectResults.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''))).toEqual([])
})

test('legacy learner keeps progress and continues with the formula', async ({ page }) => {
  await page.evaluate(() => {
    const now = Date.now()
    window.localStorage.setItem('tiger-flow-progress-v1', JSON.stringify({
      version: 1,
      createdAt: now - 60_000,
      mastery: {
        'root:fi:一': {
          level: 1,
          attempts: 2,
          correct: 2,
          streak: 2,
          lapses: 0,
          averageMs: 800,
          lastSeenAt: now,
          dueAt: now + 86_400_000,
        },
      },
      sessions: [{
        id: 'legacy-strokes',
        kind: 'roots',
        stageId: 'roots',
        finishedAt: now,
        durationSeconds: 90,
        attempted: 5,
        correct: 5,
        firstTryCorrect: 5,
        medianMs: 800,
      }],
      settings: {
        theme: 'system',
        dailyMinutes: 10,
        newItemsPerRound: 8,
        autoAdvance: true,
        autoAdvanceDelay: 700,
        reducedMotion: false,
      },
    }))
  })
  await page.reload()

  await expect(page.getByRole('heading', { name: '先学一条取码公式' })).toBeVisible()
  await expect(page.getByRole('heading', { name: '先看答案，不会也能开始' })).toHaveCount(0)
  await expect.poll(async () => page.evaluate(() => JSON.parse(window.localStorage.getItem('tiger-flow-progress-v1') ?? '{}').version)).toBe(2)

  await openView(page, '课程')
  const migratedStrokeStage = page.getByRole('listitem').filter({
    has: page.getByRole('heading', { name: '五个笔画，先会按' }),
  })
  await expect(migratedStrokeStage.getByText('100%', { exact: true })).toBeVisible()
  await expect(migratedStrokeStage.getByText('已完成', { exact: true })).toBeVisible()

  const formulaStage = page.getByRole('listitem').filter({ hasText: '一条取码公式' })
  await formulaStage.getByRole('button', { name: '学习' }).click()
  await expect(page.getByRole('heading', { name: '只记这一条取码公式' })).toBeVisible()
})

test('experienced learner can persistently skip the first lesson', async ({ page }) => {
  await page.getByRole('button', { name: '我已经学过' }).click()
  await expect(page.getByRole('heading', { name: '先学一条取码公式' })).toBeVisible()
  await expect(page.getByRole('heading', { name: '从第一次按键，到稳定日用' })).toHaveCount(0)
  await expect.poll(async () => page.evaluate(() => JSON.parse(window.localStorage.getItem('tiger-flow-progress-v1') ?? '{}').onboardingComplete)).toBe(true)

  await openView(page, '课程')
  const skippedStrokeStage = page.getByRole('listitem').filter({
    has: page.getByRole('heading', { name: '五个笔画，先会按' }),
  })
  await expect(skippedStrokeStage.getByText('100%', { exact: true })).toBeVisible()
  await expect(skippedStrokeStage.getByText('已完成', { exact: true })).toBeVisible()

  await page.reload()
  await expect(page.getByRole('heading', { name: '先学一条取码公式' })).toBeVisible()
  await expect(page.getByRole('heading', { name: '先看答案，不会也能开始' })).toHaveCount(0)
})

async function openView(page: Page, name: '练习' | '课程' | '轨迹' | '查码') {
  const isMobile = page.viewportSize()!.width < 1024
  if (isMobile) await page.getByRole('button', { name: '打开导航' }).click()
  const navigation = page.getByRole('navigation', { name: isMobile ? '移动导航' : '主要导航' })
  await navigation.getByRole('button', { name }).click()
}

async function completeGuidedRootCopy(page: Page, codes: string[]) {
  for (const [index, code] of codes.entries()) {
    const guidedInput = page.getByRole('textbox', { name: /照着答案输入/ })
    await guidedInput.fill(code)
    await expect(page.getByText('第 1 次完成，再敲一次相同根码。')).toBeVisible()
    await guidedInput.fill(code)
    await expect(page.getByText('两次正确，手指已经走过这条路径')).toBeVisible()
    await page.getByRole('button', { name: index === codes.length - 1 ? '打乱顺序，开始两轮盲打' : '下一个字根' }).click()
  }
}

async function completeVisibleGuidedRootCopy(page: Page, count: number) {
  for (let index = 0; index < count; index += 1) {
    const guidedInput = page.getByRole('textbox', { name: /照着答案输入/ })
    const prompt = await guidedInput.locator('..').textContent()
    const code = prompt?.match(/照着输入\s*([a-z]+)/)?.[1]
    if (!code) throw new Error(`Could not read guided code from: ${prompt}`)
    await guidedInput.fill(code)
    await expect(page.getByText('第 1 次完成，再敲一次相同根码。')).toBeVisible()
    await guidedInput.fill(code)
    await expect(page.getByText('两次正确，手指已经走过这条路径')).toBeVisible()
    await page.getByRole('button', { name: index === count - 1 ? '打乱顺序，开始两轮盲打' : '下一个字根' }).click()
  }
}

async function finishRootRecall(training: Locator) {
  const answer = training.getByRole('textbox', { name: /输入.*虎码编码/ })
  while (await training.getByRole('heading', { name: '本轮完成' }).count() === 0) {
    const glyph = await training.locator('#question-glyph').textContent()
    await answer.fill(rootCodeForGlyph(glyph))
    await training.getByRole('button', { name: '下一题' }).click()
  }
}

function rootCodeForGlyph(glyph: string | null): string {
  const code = ({ '一': 'fi', '丨': 'gs', '丿': 'tp', '丶': 'id', '㇆': 'ae' } as Record<string, string>)[glyph ?? '']
  if (!code) throw new Error(`Unknown root glyph: ${glyph}`)
  return code
}

function rootIdForGlyph(glyph: string | null): string {
  const code = rootCodeForGlyph(glyph)
  return `root:${code}:${glyph}`
}

async function readProgressCount(page: Page, key: 'learned' | 'mastery'): Promise<number> {
  return page.evaluate((field) => {
    const progress = JSON.parse(window.localStorage.getItem('tiger-flow-progress-v1') ?? '{}') as Record<string, Record<string, unknown>>
    return Object.keys(progress[field] ?? {}).length
  }, key)
}

async function readMasteryCorrect(page: Page, id: string): Promise<number> {
  return page.evaluate((itemId) => {
    const progress = JSON.parse(window.localStorage.getItem('tiger-flow-progress-v1') ?? '{}') as {
      mastery?: Record<string, { correct?: number }>
    }
    return progress.mastery?.[itemId]?.correct ?? -1
  }, id)
}

async function readLatestSessionSummary(page: Page): Promise<string> {
  return page.evaluate(() => {
    const progress = JSON.parse(window.localStorage.getItem('tiger-flow-progress-v1') ?? '{}') as {
      sessions?: Array<{ attempted: number; correct: number; firstTryCorrect: number }>
    }
    const session = progress.sessions?.at(-1)
    return session ? `${session.attempted}/${session.correct}/${session.firstTryCorrect}` : ''
  })
}

async function hasHorizontalOverflow(page: Page): Promise<boolean> {
  return page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
}
