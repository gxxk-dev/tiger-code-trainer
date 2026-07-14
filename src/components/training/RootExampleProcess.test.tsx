// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { orderedRoots } from '../../data/curriculum'
import { RootExampleProcess } from './RootExampleProcess'

afterEach(cleanup)

describe('root example process', () => {
  it('explains when the example character is the complete root', () => {
    const root = orderedRoots.find((entry) => entry.root === '飞')!
    render(<RootExampleProcess root={root} />)

    const example = screen.getByRole('region', { name: '字根“飞”的例字' })
    expect(within(example).getAllByText('飞')).toHaveLength(2)
    expect(within(example).getByText('当前根')).toBeVisible()
    expect(within(example).getByRole('group')).toHaveAccessibleName('飞拆成飞，当前字根是飞')
    expect(screen.getByText(/整字本身就是当前字根/)).toBeVisible()
  })

  it('keeps real examples visible when a target variant cannot be rendered', () => {
    const root = orderedRoots.find((entry) => entry.root === '')!
    render(<RootExampleProcess root={root} />)

    expect(screen.getByText('例字：印、迎、乐')).toBeVisible()
    expect(screen.getByText(/系统字体无法可靠显示目标字形/)).toBeVisible()
  })
})
