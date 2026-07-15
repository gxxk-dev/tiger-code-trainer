// @vitest-environment jsdom

import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { articles, splitExamples } from '../../data/curriculum'
import { splitId } from '../../lib/items'
import { ArticleTrainer } from './ArticleTrainer'
import { FormulaTrainer } from './FormulaTrainer'
import { SplitTrainer } from './SplitTrainer'

describe('paused training time', () => {
  let now: number

  beforeEach(() => {
    now = 1_000
    vi.spyOn(Date, 'now').mockImplementation(() => now)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('excludes a pause from the article timer and CPM denominator', () => {
    let intervalTick: (() => void) | undefined
    vi.spyOn(window, 'setInterval').mockImplementation((handler: TimerHandler) => {
      if (typeof handler === 'function') intervalTick = () => handler()
      return 1
    })
    vi.spyOn(window, 'clearInterval').mockImplementation(() => undefined)

    const onFinished = vi.fn()
    const request = { kind: 'article' as const, title: '文章计时测试', articleId: articles[0].id }
    const { rerender } = render(
      <ArticleTrainer request={request} onFinished={onFinished} />,
    )
    const typed = Array.from(articles[0].text).slice(0, 20).join('')

    fireEvent.change(screen.getByRole('textbox', { name: '输入区' }), {
      target: { value: typed },
    })

    now = 61_000
    rerender(<ArticleTrainer request={request} onFinished={onFinished} paused />)
    now = 361_000
    rerender(<ArticleTrainer request={request} onFinished={onFinished} paused={false} />)

    now = 421_000
    act(() => intervalTick?.())

    expect(screen.getByText('120s')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '完成本段' }))
    expect(onFinished).toHaveBeenCalledWith(expect.objectContaining({
      charsPerMinute: 10,
    }))
  })

  it('excludes a pause from formula response times', () => {
    const onFinished = vi.fn()
    const { rerender } = render(<FormulaTrainer onFinished={onFinished} />)

    now = 2_000
    rerender(<FormulaTrainer onFinished={onFinished} paused />)
    now = 62_000
    rerender(<FormulaTrainer onFinished={onFinished} paused={false} />)

    now = 63_000
    answerFormula('Aa')
    now += 500
    answerFormula('ABb')
    now += 500
    answerFormula('ABCc')
    now += 500
    answerFormula('ABCD')
    now += 500
    answerFormula('ABCZ')

    expect(onFinished).toHaveBeenCalledWith(expect.objectContaining({
      responseTimes: [2_000, 500, 500, 500, 500],
    }))
  })

  it('excludes a pause from split response times', () => {
    const split = splitExamples.find((entry) => entry.char === '柯')
    if (!split) throw new Error('Expected the split fixture for 柯')

    const onAnswer = vi.fn()
    const onFinished = vi.fn()
    const request = { kind: 'splits' as const, title: '拆字计时测试', itemIds: [splitId(split)] }
    const { rerender } = render(
      <SplitTrainer request={request} onAnswer={onAnswer} onFinished={onFinished} />,
    )

    now = 2_000
    rerender(<SplitTrainer request={request} onAnswer={onAnswer} onFinished={onFinished} paused />)
    now = 62_000
    rerender(<SplitTrainer request={request} onAnswer={onAnswer} onFinished={onFinished} paused={false} />)

    now = 63_000
    const choices = screen.getByRole('group', { name: '为“柯”按顺序选择字根' })
    fireEvent.click(within(choices).getByRole('button', { name: /木/ }))
    fireEvent.click(within(choices).getByRole('button', { name: /可/ }))
    fireEvent.click(screen.getByRole('button', { name: '提交拆分' }))

    expect(onAnswer).toHaveBeenCalledWith(splitId(split), true, 2_000, false)
  })
})

function answerFormula(answer: string) {
  fireEvent.click(screen.getByRole('button', { name: answer }))
  fireEvent.click(screen.getByRole('button', { name: '下一题' }))
}
