import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { JSDOM } from 'jsdom'

const projectRoot = resolve(import.meta.dir, '..')
const dataDirectory = resolve(projectRoot, 'src/data')
const sourceDictionary = resolve(
  process.env.HOME ?? '',
  '.local/share/fcitx5/tiger/table/tiger.main.dict',
)
const dumpedDictionary = resolve(tmpdir(), 'tiger-code-trainer-table.txt')

mkdirSync(dataDirectory, { recursive: true })

function serialize(value: unknown): string {
  return JSON.stringify(value, null, 2)
}

function serializedModule(typeName: string, exportName: string, value: unknown): string {
  const payload = JSON.stringify(serialize(value))
  return `import type { ${typeName} } from '../types'\n\nexport const ${exportName} = JSON.parse(${payload}) as ${typeName}[]\n`
}

async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  attempts = 4,
): Promise<Response> {
  let response: Response | undefined
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    response = await fetch(url, init)
    if (response.ok || (response.status < 500 && response.status !== 429)) return response
    await Bun.sleep(600 * 2 ** attempt)
  }
  return response as Response
}

async function generateRoots(): Promise<void> {
  const response = await fetchWithRetry('https://www.tiger-code.com/docs/comparisonTable')
  if (!response.ok) throw new Error(`字根表下载失败：${response.status}`)
  const document = new JSDOM(await response.text()).window.document
  const rows = Array.from(document.querySelectorAll('table tr'))
  const roots = rows.flatMap((row) => {
    const cells = Array.from(row.querySelectorAll('td')).map((cell) =>
      (cell.textContent ?? '').replace(/\s+/g, ' ').trim(),
    )
    if (cells.length < 4 || !/^[a-z]{2}$/i.test(cells[1])) return []
    const [rootAndVariants, code, pronunciation, exampleText] = cells
    const [root, ...variantParts] = rootAndVariants.split(' ')
    const examples = exampleText
      .replace(/[，、；]/g, ' ')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 5)
    return [{
      root,
      code: code.toLowerCase(),
      variants: variantParts.join(' ') || undefined,
      pronunciation,
      label: pronunciation.replace(/[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/gi, '').trim(),
      examples,
    }]
  })

  if (roots.length !== 241) {
    throw new Error(`预期 241 个字根，实际解析到 ${roots.length} 个。`)
  }

  writeFileSync(
    resolve(dataDirectory, 'roots.generated.ts'),
    serializedModule('RootEntry', 'roots', roots),
  )
  console.log(`Generated ${roots.length} roots.`)
}

function ensureDumpedDictionary(): void {
  if (existsSync('/tmp/tiger-table.txt')) return
  if (!existsSync(sourceDictionary)) {
    throw new Error(`找不到虎码词典：${sourceDictionary}`)
  }
  const result = Bun.spawnSync([
    'libime_tabledict',
    '-d',
    sourceDictionary,
    dumpedDictionary,
  ])
  if (result.exitCode !== 0) {
    throw new Error(result.stderr.toString() || '无法解包 Fcitx5 虎码词典。')
  }
}

function generateLocalCharacters(): void {
  ensureDumpedDictionary()
  const dictionaryPath = existsSync('/tmp/tiger-table.txt')
    ? '/tmp/tiger-table.txt'
    : dumpedDictionary
  const lines = readFileSync(dictionaryPath, 'utf8').split('\n')
  const start = lines.indexOf('[Data]') + 1
  const firstCode = new Map<string, string>()
  const codeOptions = new Map<string, string[]>()

  for (const line of lines.slice(start)) {
    const match = line.match(/^([a-z]{1,4}) (.+)$/)
    if (!match) continue
    const [, code, text] = match
    if (Array.from(text).length !== 1 || !/^\p{Script=Han}$/u.test(text)) continue
    if (!firstCode.has(text)) firstCode.set(text, code)
    const options = codeOptions.get(text) ?? []
    if (!options.includes(code)) options.push(code)
    codeOptions.set(text, options)
  }

  const characters = Array.from(firstCode.entries())
    .slice(0, 1500)
    .map(([char, first], index) => {
      const options = codeOptions.get(char) ?? [first]
      const code = [...options].sort((a, b) => b.length - a.length)[0]
      const rank = index + 1
      return {
        char,
        code,
        ...(first !== code ? { short: first } : {}),
        rank,
        band: rank <= 500 ? 1 : rank <= 1000 ? 2 : 3,
      }
    })

  writeFileSync(
    resolve(dataDirectory, 'characters.generated.ts'),
    serializedModule('CharacterEntry', 'characters', characters),
  )
  console.log(`Generated ${characters.length} common characters.`)
}

const frequencyKeys = [
  'hv500',
  'd500',
  'xf500',
  'nh500',
  'ziy500',
  'ge500',
  'fm500',
  'nw500',
  'unw500',
  'iwr500',
]

async function fetchFrequencyGroup(key: string): Promise<string> {
  const response = await fetchWithRetry('https://www.tiger-code.com/practice/health/type', {
    method: 'POST',
    headers: {
      Accept: 'text/x-component',
      'Content-Type': 'text/plain;charset=UTF-8',
      'Next-Action': '404e7c54dad494eaaf7dd406e3bc148edb5a1ba69a',
    },
    body: JSON.stringify([[key]]),
  })
  if (!response.ok) throw new Error(`高频字 ${key} 下载失败：${response.status}`)
  const line = (await response.text()).split('\n').find((item) => item.startsWith('1:'))
  if (!line) throw new Error(`高频字 ${key} 响应格式异常。`)
  return JSON.parse(line.slice(2)) as string
}

function extractBalancedArray(source: string, marker: string): unknown[] {
  const markerIndex = source.indexOf(marker)
  if (markerIndex < 0) throw new Error(`响应中缺少 ${marker}`)
  const start = source.indexOf('[', markerIndex + marker.length)
  if (start < 0) throw new Error(`${marker} 后缺少数组。`)
  let depth = 0
  let inString = false
  let escaped = false
  for (let index = start; index < source.length; index += 1) {
    const character = source[index]
    if (inString) {
      if (escaped) escaped = false
      else if (character === '\\') escaped = true
      else if (character === '"') inString = false
      continue
    }
    if (character === '"') inString = true
    else if (character === '[') depth += 1
    else if (character === ']') {
      depth -= 1
      if (depth === 0) return JSON.parse(source.slice(start, index + 1)) as unknown[]
    }
  }
  throw new Error(`${marker} 数组没有闭合。`)
}

interface OfficialSplit {
  character: string
  code: string[]
  radical: string[]
  phonetic: string
}

async function fetchSplitBatch(characters: string): Promise<OfficialSplit[]> {
  const response = await fetchWithRetry(
    `https://www.tiger-code.com/search?query=${encodeURIComponent(characters)}`,
    { headers: { RSC: '1' } },
  )
  if (!response.ok) throw new Error(`拆分查询失败：${response.status}`)
  return extractBalancedArray(await response.text(), '"wordSpliteInfo":')
    .filter((item): item is OfficialSplit => {
      if (!item || typeof item !== 'object') return false
      const candidate = item as Partial<OfficialSplit>
      return typeof candidate.character === 'string'
        && Array.isArray(candidate.code)
        && Array.isArray(candidate.radical)
    })
}

async function fetchRequiredSplitCharacters(): Promise<string[]> {
  const response = await fetchWithRetry('https://www.tiger-code.com/practice/split', {
    headers: { RSC: '1' },
  })
  if (!response.ok) throw new Error(`必拆字下载失败：${response.status}`)
  const source = await response.text()
  const marker = '"spliteText":'
  const markerIndex = source.indexOf(marker)
  if (markerIndex < 0) throw new Error('必拆字响应中缺少 spliteText。')
  const start = markerIndex + marker.length
  if (source[start] !== '"') throw new Error('spliteText 不是字符串。')
  let escaped = false
  for (let index = start + 1; index < source.length; index += 1) {
    const character = source[index]
    if (escaped) escaped = false
    else if (character === '\\') escaped = true
    else if (character === '"') {
      return Array.from(JSON.parse(source.slice(start, index + 1)) as string)
    }
  }
  throw new Error('spliteText 字符串没有闭合。')
}

function canonicalCode(rootCodes: string[]): string {
  const codes = rootCodes.map((code) => code.toLowerCase())
  if (codes.length === 0) return ''
  if (codes.length === 1) return codes[0]
  if (codes.length === 2) return `${codes[0][0]}${codes[1]}`
  if (codes.length === 3) return `${codes[0][0]}${codes[1][0]}${codes[2]}`
  if (codes.length === 4) return codes.map((code) => code[0]).join('')
  return `${codes[0][0]}${codes[1][0]}${codes[2][0]}${codes.at(-1)?.[0] ?? ''}`
}

async function generateOfficialCharacters(): Promise<void> {
  const [groups, requiredSplitCharacters] = await Promise.all([
    Promise.all(frequencyKeys.map(fetchFrequencyGroup)),
    fetchRequiredSplitCharacters(),
  ])
  const frequencyOrder = Array.from(new Set(Array.from(groups.join(''))))
  const queryCharacters = Array.from(new Set([...frequencyOrder, ...requiredSplitCharacters]))
  const batches = Array.from(
    { length: Math.ceil(queryCharacters.length / 200) },
    (_, index) => queryCharacters.slice(index * 200, index * 200 + 200).join(''),
  )
  const splits: OfficialSplit[] = []
  for (let index = 0; index < batches.length; index += 2) {
    const result = await Promise.all(batches.slice(index, index + 2).map(fetchSplitBatch))
    splits.push(...result.flat())
    await Bun.sleep(120)
  }
  const splitByCharacter = new Map(splits.map((item) => [item.character, item]))
  const lookup = frequencyOrder.flatMap((char, index) => {
    const split = splitByCharacter.get(char)
    if (!split) return []
    const rootCodes = split.radical.slice(1)
    const code = canonicalCode(rootCodes)
    if (!code) return []
    const short = [...split.code]
      .filter((candidate) => candidate.length < code.length)
      .sort((left, right) => left.length - right.length)[0]
    const rank = index + 1
    return [{
      char,
      code,
      ...(short ? { short } : {}),
      rank,
      band: rank <= 500 ? 1 : rank <= 1000 ? 2 : 3,
      codes: split.code,
      decomposition: split.radical[0] ?? '',
      rootCodes,
      pinyin: split.phonetic,
    }]
  })

  const training = lookup.slice(0, 1500).map((entry) => ({
    char: entry.char,
    code: entry.code,
    ...(entry.short ? { short: entry.short } : {}),
    rank: entry.rank,
    band: entry.band,
  }))
  writeFileSync(
    resolve(dataDirectory, 'characters.generated.ts'),
    serializedModule('CharacterEntry', 'characters', training),
  )
  writeFileSync(
    resolve(dataDirectory, 'lookup.generated.ts'),
    serializedModule('CharacterLookupEntry', 'lookupCharacters', lookup),
  )
  const requiredSplits = requiredSplitCharacters.flatMap((char) => {
    const split = splitByCharacter.get(char)
    if (!split) return []
    const rootCodes = split.radical.slice(1)
    return [{
      char,
      roots: Array.from(split.radical[0] ?? ''),
      rootCodes: rootCodes.map((code) => code.toLowerCase()),
      code: canonicalCode(rootCodes),
      note: `字根码：${rootCodes.join(' · ')}`,
    }]
  })
  writeFileSync(
    resolve(dataDirectory, 'splits.generated.ts'),
    serializedModule('SplitEntry', 'requiredSplits', requiredSplits),
  )
  console.log(`Generated ${training.length} training characters, ${lookup.length} lookup entries, and ${requiredSplits.length} required splits.`)
}

await generateRoots()
try {
  await generateOfficialCharacters()
} catch (error) {
  console.warn(error)
  console.warn('Official data unavailable; falling back to the local Fcitx5 table.')
  generateLocalCharacters()
}
