// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { splitExamples } from '../../data/curriculum'
import { splitId } from '../../lib/items'
import { SplitTrainer } from './SplitTrainer'

afterEach(cleanup)

describe('split root assembly', () => {
  it('requires the learner to assemble the roots in order', () => {
    const split = splitExamples.find((entry) => entry.char === '柯')!
    const onAnswer = vi.fn()

    render(
      <SplitTrainer
        request={{ kind: 'splits', title: '拆分训练', itemIds: [splitId(split)] }}
        onAnswer={onAnswer}
        onFinished={vi.fn()}
      />,
    )

    const choices = screen.getByRole('group', { name: '为“柯”按顺序选择字根' })
    expect(within(choices).queryByRole('button', { name: '木 + 可' })).toBeNull()

    clickRoot(choices, '可')
    clickRoot(choices, '木')
    fireEvent.click(screen.getByRole('button', { name: '提交拆分' }))

    expect(onAnswer).toHaveBeenCalledWith(splitId(split), false, expect.any(Number), false)
    expect(screen.getByText('当前拆分').parentElement?.textContent).toContain('可 + 木')
    expect(screen.getByText(/正确拆分：柯 = 木 \+ 可/)).not.toBeNull()
  })

  it('allows repeated roots without exposing a complete answer button', () => {
    const split = splitExamples.find((entry) => entry.char === '叕')!
    const onAnswer = vi.fn()

    render(
      <SplitTrainer
        request={{ kind: 'splits', title: '拆分训练', itemIds: [splitId(split)] }}
        onAnswer={onAnswer}
        onFinished={vi.fn()}
      />,
    )

    const choices = screen.getByRole('group', { name: '为“叕”按顺序选择字根' })
    expect(within(choices).queryByRole('button', { name: '又 + 又 + 又 + 又' })).toBeNull()

    for (let count = 0; count < 4; count += 1) clickRoot(choices, '又')
    fireEvent.click(screen.getByRole('button', { name: '提交拆分' }))

    expect(onAnswer).toHaveBeenCalledWith(splitId(split), true, expect.any(Number), false)
    expect(screen.getByText(/叕 = 又 \+ 又 \+ 又 \+ 又/)).not.toBeNull()
  })

  it('rejects an incomplete repeated-root split', () => {
    const split = splitExamples.find((entry) => entry.char === '叕')!
    const onAnswer = vi.fn()

    render(
      <SplitTrainer
        request={{ kind: 'splits', title: '拆分训练', itemIds: [splitId(split)] }}
        onAnswer={onAnswer}
        onFinished={vi.fn()}
      />,
    )

    const choices = screen.getByRole('group', { name: '为“叕”按顺序选择字根' })
    clickRoot(choices, '又')
    fireEvent.click(screen.getByRole('button', { name: '提交拆分' }))

    expect(onAnswer).toHaveBeenCalledWith(splitId(split), false, expect.any(Number), false)
    expect(screen.getByText(/正确拆分：叕 = 又 \+ 又 \+ 又 \+ 又/)).not.toBeNull()
  })
})

function clickRoot(container: HTMLElement, glyph: string) {
  fireEvent.click(within(container).getByRole('button', { name: new RegExp(glyph) }))
}
