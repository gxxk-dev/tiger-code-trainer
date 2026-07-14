import { describe, expect, it } from 'vitest'
import { buildRootRecallQueue, requiredRootRetryCount } from './rootDrill'

describe('root motor drill', () => {
  const items = ['a', 'b', 'c', 'd', 'e'].map((id) => ({ id }))

  it('schedules two recall passes for every root', () => {
    const queue = buildRootRecallQueue(items, () => 0.25)

    expect(queue).toHaveLength(items.length * 2)
    expect(queue.filter((item) => item.recallPass === 1).map((item) => item.id).toSorted()).toEqual(['a', 'b', 'c', 'd', 'e'])
    expect(queue.filter((item) => item.recallPass === 2).map((item) => item.id).toSorted()).toEqual(['a', 'b', 'c', 'd', 'e'])
  })

  it('does not repeat the same root at the pass boundary', () => {
    const queue = buildRootRecallQueue(items, () => 0)

    expect(queue[items.length - 1].id).not.toBe(queue[items.length].id)
    expect(queue.slice(0, items.length).map((item) => item.id)).not.toEqual(queue.slice(items.length).map((item) => item.id))
  })

  it('supports a one-root drill without inventing extra items', () => {
    expect(buildRootRecallQueue([{ id: 'only' }], () => 0)).toEqual([
      { id: 'only', recallPass: 1 },
      { id: 'only', recallPass: 2 },
    ])
  })

  it('prioritizes a clean pass boundary for a two-root pack', () => {
    const queue = buildRootRecallQueue(items.slice(0, 2), () => 0)

    expect(queue[1].id).not.toBe(queue[2].id)
  })

  it('adds enough future attempts to rebuild two cold recalls after an error', () => {
    expect(requiredRootRetryCount([{ id: 'a' }, { id: 'b' }, { id: 'a' }], 0, 'a')).toBe(1)
    expect(requiredRootRetryCount([{ id: 'a' }, { id: 'b' }], 0, 'a')).toBe(2)
    expect(requiredRootRetryCount([{ id: 'a' }, { id: 'a' }, { id: 'a' }], 0, 'a')).toBe(0)
  })
})
