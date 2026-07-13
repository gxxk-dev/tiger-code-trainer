import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => window.localStorage.clear())
  await page.reload()
})

test('today view starts a working root session', async ({ page }, testInfo) => {
  await expect(page.getByRole('heading', { name: '学一点，马上拿来打字' })).toBeVisible()
  await expect(page.getByRole('button', { name: '开始今日训练' })).toBeVisible()
  await page.getByRole('button', { name: '开始今日训练' }).click()
  await expect(page.getByText('英文练码')).toBeVisible()

  const answer = page.getByRole('textbox', { name: /输入.*虎码编码/ })
  await answer.fill('fi')
  await expect(page.getByText('正确', { exact: true })).toBeVisible()

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
  expect(overflow).toBe(false)
  await page.screenshot({ path: `test-results/${testInfo.project.name}-training.png`, fullPage: true })
})

test('lookup loads offline character data', async ({ page }) => {
  const isMobile = page.viewportSize()!.width < 1024
  if (isMobile) {
    await page.getByRole('navigation', { name: '快捷导航' }).getByRole('button', { name: '查码' }).click()
  } else {
    await page.getByRole('navigation', { name: '主要导航' }).getByRole('button', { name: '查码' }).click()
  }
  const search = page.getByRole('searchbox', { name: '输入汉字或编码' })
  await search.fill('虎码')
  await expect(page.getByText('zh', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('mnm', { exact: true })).toBeVisible()
})

test('theme choice persists and dark asset is selected', async ({ page }, testInfo) => {
  const isMobile = page.viewportSize()!.width < 1024
  if (isMobile) {
    await page.getByRole('button', { name: '打开导航' }).click()
    await page.getByRole('dialog', { name: '导航菜单' }).getByRole('button', { name: '设置' }).click()
  } else {
    await page.getByRole('button', { name: '设置' }).click()
  }
  await page.getByRole('button', { name: '深色' }).click()
  await expect(page.locator('html')).toHaveClass(/dark/)
  await page.getByRole('button', { name: '关闭设置', exact: true }).click()
  await page.reload()
  await expect(page.locator('html')).toHaveClass(/dark/)

  if (isMobile) {
    await page.getByRole('navigation', { name: '快捷导航' }).getByRole('button', { name: '查码' }).click()
  } else {
    await page.getByRole('navigation', { name: '主要导航' }).getByRole('button', { name: '查码' }).click()
  }
  await expect(page.getByAltText('虎码官方深色字根图')).toBeVisible()
  await page.screenshot({ path: `test-results/${testInfo.project.name}-dark.png`, fullPage: true })
})

test('real input session accepts composed Chinese text', async ({ page }) => {
  await page.getByRole('button', { name: /真实中文短句/ }).click()
  const input = page.getByRole('textbox', { name: '输入区' })
  await input.fill('今天下午三点开会，请把修改后的文档发给我。')
  await expect(page.getByText('100%')).toBeVisible()
  await page.getByRole('button', { name: '完成本段' }).click()
  await expect(page.getByRole('heading', { name: '本轮完成' })).toBeVisible()
})

test('course exposes formula and split practice', async ({ page }) => {
  const isMobile = page.viewportSize()!.width < 1024
  const navigation = page.getByRole('navigation', { name: isMobile ? '快捷导航' : '主要导航' })
  await navigation.getByRole('button', { name: '课程' }).click()
  await expect(page.getByRole('heading', { name: '从第一次按键，到稳定日用' })).toBeVisible()

  const formulaStage = page.getByRole('listitem').filter({ hasText: '一条取码公式' })
  await formulaStage.getByRole('button', { name: '开始' }).click()
  await page.getByRole('button', { name: 'Aa' }).click()
  await expect(page.getByText('正确', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '退出训练' }).click()

  const splitStage = page.getByRole('listitem').filter({ hasText: '看懂拆分' })
  await splitStage.getByRole('button', { name: '开始' }).click()
  await page.getByRole('button', { name: '禾 + 几' }).click()
  await expect(page.getByText('拆分正确')).toBeVisible()
})

test('layout reflows at 320 CSS pixels', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 760 })
  await page.reload()
  await expect(page.getByRole('heading', { name: '学一点，马上拿来打字' })).toBeVisible()
  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }))
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth)
})

test('today and training views have no serious accessibility violations', async ({ page }) => {
  const todayResults = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze()
  expect(todayResults.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''))).toEqual([])

  await page.getByRole('button', { name: '开始今日训练' }).click()
  const trainingResults = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze()
  expect(trainingResults.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''))).toEqual([])
})
