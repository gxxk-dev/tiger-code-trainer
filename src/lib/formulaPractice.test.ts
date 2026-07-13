import { describe, expect, it } from 'vitest'
import { buildFormulaPracticeRound } from './formulaPractice'

describe('buildFormulaPracticeRound', () => {
  it('keeps the teaching progression while breaking the answer-position pattern', () => {
    for (let seed = 1; seed <= 50; seed += 1) {
      const round = buildFormulaPracticeRound(seededRandom(seed))
      const answerSlots = round.map((question) => question.choices.indexOf(question.answer))

      expect(round.map((question) => question.count)).toEqual([1, 2, 3, 4, 6])
      expect(answerSlots.toSorted()).toEqual([0, 1, 2, 3, 4])
      expect(answerSlots).not.toEqual([0, 1, 2, 3, 4])
      expect(answerSlots).not.toEqual([4, 3, 2, 1, 0])

      for (const question of round) {
        expect(question.choices).toHaveLength(5)
        expect(new Set(question.choices).size).toBe(5)
        expect(question.choices.filter((choice) => choice === question.answer)).toHaveLength(1)
      }
    }
  })

  it('also breaks a random source that would leave every slot untouched', () => {
    const round = buildFormulaPracticeRound(() => 1)

    expect(round.map((question) => question.choices.indexOf(question.answer))).toEqual([2, 0, 4, 1, 3])
  })
})

function seededRandom(seed: number): () => number {
  let state = seed >>> 0

  return () => {
    state = (Math.imul(1_664_525, state) + 1_013_904_223) >>> 0
    return state / 2 ** 32
  }
}
