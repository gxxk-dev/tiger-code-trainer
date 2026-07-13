import { expect, test, type Page } from '@playwright/test'
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
  await expect(page.getByRole('heading', { name: '先看答案，不会也能开始' })).toBeVisible()
  await expect(page.getByText('横 fi，竖 gs，撇 tp，点/捺 id，折 ae。')).toBeVisible()
  await expect(page.getByText('F 键先绑定平横“一”；Flat 帮你找 f，i 来自 yī 的韵母。')).toBeVisible()
  await expect(page.getByText('快速热身')).toHaveCount(0)
  await page.getByRole('button', { name: '开始第 1 课' }).click()
  const training = page.getByRole('dialog', { name: '第 1 课 · 五个基本笔画' })

  await expect(page.getByText('先学 · 答案可见')).toBeVisible()
  await expect(page.getByRole('heading', { name: '先认识完整字根和根码' })).toBeVisible()
  await expect(page.getByText('fi', { exact: true }).first()).toBeVisible()
  await expect(training.getByText('G 键先绑定竖；想象一根“钢丝”竖直垂下，s 也来自 shù。')).toBeVisible()
  await expect(page.getByRole('textbox', { name: /输入.*虎码编码/ })).toHaveCount(0)
  await expect(page.getByRole('navigation')).toHaveCount(0)

  await page.getByRole('button', { name: '跟着根码打一次' }).click()
  const codes = ['fi', 'gs', 'tp', 'id', 'ae']
  await completeGuidedRootCopy(page, codes)

  await expect(page.getByText('英文练码')).toBeVisible()
  await expect.poll(() => readProgressCount(page, 'learned')).toBe(5)
  expect(await readProgressCount(page, 'mastery')).toBe(0)

  const answer = page.getByRole('textbox', { name: /输入.*虎码编码/ })
  const hintButton = training.getByRole('button', { name: '给我一点提示' })
  await expect(hintButton).toHaveAttribute('aria-expanded', 'false')
  await expect(training.locator('#code-memory-hint')).toHaveCount(1)
  await expect(training.getByText('F 键先绑定平横“一”；Flat 帮你找 f，i 来自 yī 的韵母。')).toHaveCount(0)
  await hintButton.click()
  await expect(training.getByRole('button', { name: '收起提示' })).toHaveAttribute('aria-expanded', 'true')
  await expect(training.getByText('F 键先绑定平横“一”；Flat 帮你找 f，i 来自 yī 的韵母。')).toBeVisible()
  await expect(answer).toBeEditable()
  await expect(answer).toBeFocused()
  await expect(answer).toHaveAttribute('aria-describedby', 'code-memory-hint')
  await answer.fill('fi')
  await expect(page.getByText('借提示答对，本题不计掌握')).toBeVisible()
  await expect(answer).not.toHaveAttribute('aria-describedby', /.+/)
  await expect(training.getByRole('button', { name: '下一题' })).toBeFocused()
  await page.waitForTimeout(1_100)
  await expect(page.getByText('借提示答对，本题不计掌握')).toBeVisible()
  await expect.poll(() => readProgressCount(page, 'mastery')).toBe(1)
  await expect.poll(() => readMasteryCorrect(page, 'root:fi:一')).toBe(0)

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
  expect(overflow).toBe(false)
  await page.screenshot({ path: `test-results/${testInfo.project.name}-guided-training.png`, fullPage: true })

  await page.keyboard.press('Enter')
  await expect(training.getByText('G 键先绑定竖；想象一根“钢丝”竖直垂下，s 也来自 shù。')).toHaveCount(0)
  await answer.fill('aa')
  await expect(page.getByText('你的输入：aa')).toBeVisible()
  await expect(page.getByText('正确编码：').getByText('gs')).toBeVisible()
  await expect(training.getByText('G 键先绑定竖；想象一根“钢丝”竖直垂下，s 也来自 shù。')).toBeVisible()
  await page.getByRole('button', { name: '下一题' }).click()

  for (const code of ['tp', 'id', 'ae']) {
    await expect(answer).toBeEditable()
    await answer.fill(code)
    await expect(page.getByText('正确', { exact: true })).toBeVisible()
  }
  await expect(page.getByText('本轮错题再测')).toBeVisible()
  await expect(training.getByRole('button', { name: '给我一点提示' })).toHaveAttribute('aria-expanded', 'false')
  await expect(training.getByText('G 键先绑定竖；想象一根“钢丝”竖直垂下，s 也来自 shù。')).toHaveCount(0)
  await answer.fill('fi')
  await expect(page.getByText('正确', { exact: true })).toBeVisible()
  await expect(answer).toHaveValue('')
  await answer.fill('gs')
  await expect(page.getByText('正确', { exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: '本轮完成' })).toBeFocused()
  await expect(training.getByText('71%', { exact: true })).toBeVisible()
  await expect(training.locator('dl > div').filter({ hasText: '首答正确' }).getByText('3', { exact: true })).toBeVisible()
  await expect.poll(() => readLatestSessionSummary(page)).toBe('7/5/3')
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

test('root primer explains complete roots and applies their codes to a character', async ({ page }) => {
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
  await expect(training.getByRole('heading', { name: '先认识完整字根和根码' })).toBeVisible()
  const rootNote = training.getByRole('note', { name: '字根说明' })
  await expect(rootNote).toContainText('完整字根不再往下拆')
  await expect(rootNote).toContainText('先按大码，再按小码')
  await expect(training.getByRole('button', { name: '跟着根码打一次' })).toBeVisible()

  const application = training.getByRole('region', { name: '“休”的拆字过程' })
  await expect(application).toContainText('休')
  await expect(application).toContainText('亻')
  await expect(application).toContainText('Jr')
  await expect(application).toContainText('木')
  await expect(application).toContainText('Em')
  await expect(application).toContainText('ABb')
  await expect(application).toContainText('jem')
})

test('leaving after guided root copying returns to the primer', async ({ page }) => {
  await page.getByRole('button', { name: '开始第 1 课' }).click()
  const training = page.getByRole('dialog', { name: '第 1 课 · 五个基本笔画' })
  await expect(training.getByRole('heading', { name: '先认识完整字根和根码' })).toBeVisible()
  await training.getByRole('button', { name: '跟着根码打一次' }).click()
  await completeGuidedRootCopy(page, ['fi', 'gs', 'tp', 'id', 'ae'])

  await expect(training.getByText('英文练码')).toBeVisible()
  await training.getByRole('button', { name: '退出训练' }).click()
  await expect(page.getByRole('heading', { name: '先看答案，不会也能开始' })).toBeVisible()

  await openView(page, '课程')
  const incompleteStrokeStage = page.getByRole('listitem').filter({
    has: page.getByRole('heading', { name: '五个笔画，先会按' }),
  })
  await expect(incompleteStrokeStage.getByText('0%', { exact: true })).toBeVisible()
  await expect(incompleteStrokeStage.getByText('已完成', { exact: true })).toHaveCount(0)

  await incompleteStrokeStage.getByRole('button', { name: '学习' }).click()
  const resumedTraining = page.getByRole('dialog', { name: '五个笔画，先会按' })
  await expect(resumedTraining.getByRole('heading', { name: '先认识完整字根和根码' })).toBeVisible()
  await expect(resumedTraining.getByRole('note', { name: '字根说明' })).toBeVisible()
  await expect(resumedTraining.getByRole('textbox', { name: /输入.*虎码编码/ })).toHaveCount(0)
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
  await expect(intensity.getByRole('button', { name: '标准 · 10 分' })).toHaveAttribute('aria-pressed', 'true')
  await intensity.getByRole('button', { name: '深入 · 20 分' }).click()
  await expect(intensity.getByRole('button', { name: '深入 · 20 分' })).toHaveAttribute('aria-pressed', 'true')
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
  await training.getByRole('button', { name: '跟着根码打一次' }).click()
  await completeVisibleGuidedRootCopy(page, 5)
  await expect(training.getByText('英文练码')).toBeVisible()
  await training.getByRole('button', { name: '退出训练' }).click()

  await expect(page.getByRole('heading', { name: '下一段：今日字根' })).toBeVisible()
  await expect(page.getByRole('heading', { name: '把刚学的内容用起来' })).toHaveCount(0)
  await page.getByRole('button', { name: '开始今日训练' }).click()
  await expect(training.getByRole('heading', { name: '先认识完整字根和根码' })).toBeVisible()
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
  for (let attempt = 0; attempt < 2; attempt += 1) {
    await review.getByRole('button', { name: '给我一点提示' }).click()
    await answer.fill('fi')
    await expect(review.getByText('借提示答对，本题不计掌握')).toBeVisible()
    await review.getByRole('button', { name: '下一题' }).click()
  }
  await expect(review.getByRole('heading', { name: '本轮完成' })).toBeVisible()
  await review.getByRole('button', { name: '继续下一段' }).click()
  await expect(review.getByRole('heading', { name: '本轮完成' })).toHaveCount(0)
  await expect(review.getByRole('textbox', { name: /输入.*虎码编码/ })).toBeVisible()
})

test('lookup loads offline character data', async ({ page }) => {
  await openView(page, '查码')
  const search = page.getByRole('searchbox', { name: '输入汉字或编码' })
  await search.fill('虎码')
  await expect(page.getByText('zh', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('mnm', { exact: true })).toBeVisible()

  await page.getByRole('tab', { name: '字根' }).click()
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
  await page.getByRole('button', { name: '关闭设置', exact: true }).click()
  await page.reload()
  await expect(page.locator('html')).toHaveClass(/dark/)

  await openView(page, '查码')
  await expect(page.getByAltText('虎码官方深色字根图')).toBeVisible()
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
    const choices = page.getByRole('group', { name: '取码选项' }).getByRole('button')
    const before = await choices.allTextContents()
    answerSlots.push(before.indexOf(answer))
    await page.getByRole('button', { name: answer, exact: true }).click()
    await expect(page.getByText('正确', { exact: true })).toBeVisible()
    expect(await choices.allTextContents()).toEqual(before)

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
  await expect(page.getByText(/秃 = 禾 \+ 几/)).toBeVisible()

  const splitFeedback = page.getByRole('region', { name: '“秃”的拆字过程' })
  await expect(splitFeedback).toContainText('禾')
  await expect(splitFeedback).toContainText('Xh')
  await expect(splitFeedback).toContainText('几')
  await expect(splitFeedback).toContainText('Oj')
  await expect(splitFeedback).toContainText('ABb')
  await expect(splitFeedback).toContainText('xoj')
  await page.getByRole('button', { name: '退出训练' }).click()

  const shortcutStage = page.getByRole('listitem').filter({ hasText: '简码与选重' })
  await shortcutStage.getByRole('button', { name: '学习' }).click()
  await expect(page.getByRole('heading', { name: '先看答案，不测试' })).toBeVisible()
  await expect(page.getByText('高频简码').first()).toBeVisible()
})

test('layout reflows at 320 CSS pixels', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 760 })
  await page.reload()
  await expect(page.getByRole('heading', { name: '先看答案，不会也能开始' })).toBeVisible()
  await expect(page.getByRole('button', { name: '开始第 1 课' })).toBeVisible()
  expect(await hasHorizontalOverflow(page)).toBe(false)

  await page.getByRole('button', { name: '开始第 1 课' }).click()
  await expect(page.getByRole('heading', { name: '先认识完整字根和根码' })).toBeVisible()
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
  await expect(page.getByRole('heading', { name: '先认识完整字根和根码' })).toBeVisible()
  const trainingResults = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze()
  expect(trainingResults.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''))).toEqual([])

  await page.getByRole('button', { name: '我已经会了，直接练习' }).click()
  await page.getByRole('button', { name: '给我一点提示' }).click()
  const hintResults = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze()
  expect(hintResults.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''))).toEqual([])

  await page.getByRole('textbox', { name: /输入.*虎码编码/ }).fill('aa')
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
  const navigation = page.getByRole('navigation', { name: isMobile ? '快捷导航' : '主要导航' })
  await navigation.getByRole('button', { name }).click()
}

async function completeGuidedRootCopy(page: Page, codes: string[]) {
  for (const [index, code] of codes.entries()) {
    const guidedInput = page.getByRole('textbox', { name: /照着答案输入/ })
    await guidedInput.fill(code)
    await expect(page.getByText('对，就是这几个键')).toBeVisible()
    await page.getByRole('button', { name: index === codes.length - 1 ? '遮住答案，开始练习' : '下一个' }).click()
  }
}

async function completeVisibleGuidedRootCopy(page: Page, count: number) {
  for (let index = 0; index < count; index += 1) {
    const guidedInput = page.getByRole('textbox', { name: /照着答案输入/ })
    const prompt = await guidedInput.locator('..').textContent()
    const code = prompt?.match(/照着输入\s*([a-z]+)/)?.[1]
    if (!code) throw new Error(`Could not read guided code from: ${prompt}`)
    await guidedInput.fill(code)
    await expect(page.getByText('对，就是这几个键')).toBeVisible()
    await page.getByRole('button', { name: index === count - 1 ? '遮住答案，开始练习' : '下一个' }).click()
  }
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
