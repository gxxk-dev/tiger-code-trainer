export interface FormulaPracticeQuestion {
  count: number
  answer: string
  roots: string[]
  choices: string[]
}

type RandomSource = () => number

const formulaQuestions = [
  { count: 1, answer: 'Aa', roots: ['A'] },
  { count: 2, answer: 'ABb', roots: ['A', 'B'] },
  { count: 3, answer: 'ABCc', roots: ['A', 'B', 'C'] },
  { count: 4, answer: 'ABCD', roots: ['A', 'B', 'C', 'D'] },
  { count: 6, answer: 'ABCZ', roots: ['A', 'B', 'C', 'D', 'E', 'Z'] },
] as const

const formulaChoices = formulaQuestions.map((question) => question.answer)

export function buildFormulaPracticeRound(random: RandomSource = Math.random): FormulaPracticeQuestion[] {
  const answerSlots = shuffledAnswerSlots(formulaQuestions.length, random)

  return formulaQuestions.map((question, index) => {
    const choices = shuffle(
      formulaChoices.filter((choice) => choice !== question.answer),
      random,
    )
    choices.splice(answerSlots[index], 0, question.answer)

    return {
      count: question.count,
      answer: question.answer,
      roots: [...question.roots],
      choices,
    }
  })
}

function shuffledAnswerSlots(length: number, random: RandomSource): number[] {
  const slots = shuffle(Array.from({ length }, (_, index) => index), random)
  const forward = slots.every((slot, index) => slot === index)
  const backward = slots.every((slot, index) => slot === length - index - 1)

  if ((forward || backward) && length === 5) {
    return [slots[2], slots[0], slots[4], slots[1], slots[3]]
  }

  return slots
}

function shuffle<T>(items: readonly T[], random: RandomSource): T[] {
  const shuffled = [...items]

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const value = random()
    const unit = Number.isFinite(value)
      ? Math.min(Math.max(value, 0), 1 - Number.EPSILON)
      : 0
    const swapIndex = Math.floor(unit * (index + 1))
    ;[shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]]
  }

  return shuffled
}
