export interface RootRecallItem {
  id: string
}

export type RootRecallQuestion<T extends RootRecallItem> = T & {
  recallPass: 1 | 2
}

export function buildRootRecallQueue<T extends RootRecallItem>(
  items: T[],
  random: () => number = Math.random,
): Array<RootRecallQuestion<T>> {
  if (!items.length) return []
  const first = shuffle(items, random)
  const second = shuffle(items, random)

  if (items.length > 1 && second[0].id === first.at(-1)?.id) {
    second.push(second.shift()!)
  }
  if (items.length > 2 && sameOrder(first, second)) {
    second.push(second.shift()!)
  }

  return [
    ...first.map((item) => ({ ...item, recallPass: 1 as const })),
    ...second.map((item) => ({ ...item, recallPass: 2 as const })),
  ]
}

export function requiredRootRetryCount(
  queue: RootRecallItem[],
  currentIndex: number,
  itemId: string,
): number {
  const pending = queue.slice(currentIndex + 1).filter((item) => item.id === itemId).length
  return Math.max(0, 2 - pending)
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1))
    ;[result[index], result[target]] = [result[target], result[index]]
  }
  return result
}

function sameOrder(left: RootRecallItem[], right: RootRecallItem[]): boolean {
  return left.every((item, index) => item.id === right[index]?.id)
}
