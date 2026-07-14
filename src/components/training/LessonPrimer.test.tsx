// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { basicStrokes, splitExamples } from '../../data/curriculum'
import { rootId, splitId } from '../../lib/items'
import { SPLIT_RULES_LESSON_ID } from '../../lib/lessons'
import { createInitialProgress } from '../../lib/storage'
import { LessonPrimer } from './LessonPrimer'

describe('root guided typing', () => {
  it('requires two consecutive correct repetitions', () => {
    const root = basicStrokes[0].entry

    render(
      <LessonPrimer
        request={{ kind: 'roots', title: '基本笔画', itemIds: [rootId(root)] }}
        progress={createInitialProgress()}
        onComplete={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '开始两轮跟打' }))
    const input = screen.getByRole('textbox', { name: /照着答案输入/ })
    const continueButton = screen.getByRole('button', { name: '打乱顺序，开始两轮盲打' })

    fireEvent.change(input, { target: { value: root.code } })
    expect(screen.getByText('第 1 次完成，再敲一次相同根码。')).toBeVisible()

    fireEvent.change(input, { target: { value: 'zz' } })
    expect(screen.getByText('顺序不对，重新连续敲对两次。')).toBeVisible()
    expect(continueButton).toBeDisabled()

    fireEvent.change(input, { target: { value: root.code } })
    expect(screen.getByText('第 1 次完成，再敲一次相同根码。')).toBeVisible()
    expect(continueButton).toBeDisabled()

    fireEvent.change(input, { target: { value: root.code } })
    expect(continueButton).toBeEnabled()
  })
})

describe('split rule lesson', () => {
  it('keeps the split basics available after the first lesson', () => {
    const progress = createInitialProgress()
    const split = splitExamples[0]
    progress.learned[SPLIT_RULES_LESSON_ID] = Date.now()

    render(
      <LessonPrimer
        request={{ kind: 'splits', title: '拆分练习', itemIds: [splitId(split)] }}
        progress={progress}
        onComplete={vi.fn()}
      />,
    )

    const disclosure = screen.getByText('重看普通拆分与切字')
    expect(disclosure).toBeVisible()
    fireEvent.click(disclosure)
    expect(screen.getByRole('heading', { name: '虎码拆分不是按部首分类' })).toBeVisible()
  })
})
