// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { basicStrokes } from '../../data/curriculum'
import { rootId } from '../../lib/items'
import { updateMastery } from '../../lib/mastery'
import { createInitialProgress } from '../../lib/storage'
import { CodeTrainer } from './CodeTrainer'

afterEach(cleanup)

describe('root motor recall', () => {
  it('requires two new cold recalls after an error', async () => {
    const progress = createInitialProgress()
    progress.settings.autoAdvance = false
    const root = basicStrokes[0].entry
    const onAnswer = vi.fn()
    const onFinished = vi.fn()

    render(
      <CodeTrainer
        request={{ kind: 'roots', title: '单根测试', itemIds: [rootId(root)] }}
        progress={progress}
        onAnswer={onAnswer}
        onFinished={onFinished}
      />,
    )

    answerRoot('fi')
    fireEvent.click(screen.getByRole('button', { name: '下一题' }))

    answerRoot('aa')
    expect(onAnswer).toHaveBeenCalledTimes(1)
    expect(onAnswer.mock.calls[0][1]).toBe(false)
    fireEvent.change(screen.getByRole('textbox', { name: '重新输入“一”的正确编码' }), { target: { value: 'fi' } })
    fireEvent.click(screen.getByRole('button', { name: '下一题' }))

    answerRoot('fi')
    expect(onAnswer).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: '下一题' }))

    answerRoot('fi')
    expect(onAnswer).toHaveBeenCalledTimes(2)
    expect(onAnswer.mock.calls[1][1]).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: '下一题' }))

    await waitFor(() => expect(onFinished).toHaveBeenCalledWith(expect.objectContaining({
      attempted: 4,
      correct: 3,
      firstTryCorrect: 1,
    })))
  })

  it('requires two cold recalls when review resumes a root with no successful recall', async () => {
    const progress = createInitialProgress()
    progress.settings.autoAdvance = false
    const root = basicStrokes[0].entry
    const itemId = rootId(root)
    progress.learned[itemId] = Date.now() - 1_000
    progress.mastery[itemId] = updateMastery(undefined, false, 900, false, Date.now() - 1_000)
    const onAnswer = vi.fn()
    const onFinished = vi.fn()

    render(
      <CodeTrainer
        request={{ kind: 'review', title: '中断后复习', itemIds: [itemId] }}
        progress={progress}
        onAnswer={onAnswer}
        onFinished={onFinished}
      />,
    )

    answerRoot(root.code)
    expect(onAnswer).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '下一题' }))

    answerRoot(root.code)
    expect(onAnswer).toHaveBeenCalledTimes(1)
    expect(onAnswer).toHaveBeenCalledWith(itemId, true, expect.any(Number), false)
    fireEvent.click(screen.getByRole('button', { name: '下一题' }))

    await waitFor(() => expect(onFinished).toHaveBeenCalledWith(expect.objectContaining({
      attempted: 2,
      correct: 2,
    })))
  })

  it('keeps one cold recall for a due root with an earlier successful recall', async () => {
    const progress = createInitialProgress()
    progress.settings.autoAdvance = false
    const root = basicStrokes[0].entry
    const itemId = rootId(root)
    progress.learned[itemId] = Date.now() - 60_000
    progress.mastery[itemId] = updateMastery(undefined, true, 800, false, Date.now() - 60_000)
    const onAnswer = vi.fn()
    const onFinished = vi.fn()

    render(
      <CodeTrainer
        request={{ kind: 'review', title: '到期复习', itemIds: [itemId] }}
        progress={progress}
        onAnswer={onAnswer}
        onFinished={onFinished}
      />,
    )

    answerRoot(root.code)
    expect(onAnswer).toHaveBeenCalledTimes(1)
    expect(onAnswer).toHaveBeenCalledWith(itemId, true, expect.any(Number), false)
    fireEvent.click(screen.getByRole('button', { name: '下一题' }))

    await waitFor(() => expect(onFinished).toHaveBeenCalledWith(expect.objectContaining({
      attempted: 1,
      correct: 1,
    })))
  })
})

function answerRoot(value: string) {
  fireEvent.change(screen.getByRole('textbox', { name: /输入.*虎码编码/ }), { target: { value } })
}
