// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { STORAGE_KEY } from '../lib/storage'
import { useProgress } from './useProgress'

describe('progress lesson history', () => {
  beforeEach(() => {
    const values = new Map<string, string>()
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        get length() { return values.size },
        clear: () => values.clear(),
        getItem: (key: string) => values.get(key) ?? null,
        key: (index: number) => [...values.keys()][index] ?? null,
        removeItem: (key: string) => values.delete(key),
        setItem: (key: string, value: string) => values.set(key, value),
      } satisfies Storage,
    })
    vi.spyOn(Date, 'now').mockReturnValue(1_000)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('keeps the first learned time when a lesson is reopened', () => {
    const { result } = renderHook(() => useProgress())

    act(() => result.current.markLearned(['root:test']))
    expect(result.current.progress.learned['root:test']).toBe(1_000)

    vi.mocked(Date.now).mockReturnValue(9_000)
    act(() => result.current.markLearned(['root:test']))

    expect(result.current.progress.learned['root:test']).toBe(1_000)
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}').learned['root:test']).toBe(1_000)
  })
})
