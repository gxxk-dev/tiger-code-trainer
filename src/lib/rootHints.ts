import { roots } from '../data/roots.generated'
import type { RootEntry } from '../types'

export interface RootMemoryHint {
  mnemonic: string
  compactCue: string
  primaryCue: string
  secondaryCue: string
}

const keyPositions: Record<string, string> = {
  q: '左手小指上排',
  w: '左手无名指上排',
  e: '左手中指上排',
  r: '左手食指上排',
  t: '左手食指上排',
  y: '右手食指上排',
  u: '右手食指上排',
  i: '右手中指上排',
  o: '右手无名指上排',
  p: '右手小指上排',
  a: '左手小指中排',
  s: '左手无名指中排',
  d: '左手中指中排',
  f: '左手食指基准键',
  g: '左手食指中排',
  h: '右手食指中排',
  j: '右手食指基准键',
  k: '右手中指中排',
  l: '右手无名指中排',
  z: '左手小指下排',
  x: '左手无名指下排',
  c: '左手中指下排',
  v: '左手食指下排',
  b: '左手食指下排',
  n: '右手食指下排',
  m: '右手食指下排',
}

export const ROOT_KEY_ANCHORS: Record<string, string> = {
  a: '㇆',
  b: '女',
  c: '不',
  d: '口',
  e: '木',
  f: '一',
  g: '丨',
  h: '心',
  i: '丶',
  j: '人',
  k: '水',
  l: '艹',
  m: '大',
  n: '十',
  o: '日',
  p: '刀',
  q: '田',
  r: '又',
  s: '言',
  t: '丿',
  u: '手',
  v: '月',
  w: '宀',
  x: '禾',
  y: '小',
  z: '金',
}

const customMnemonics: Record<string, string> = {
  '㇆:ae': 'A 键先绑定折；Angle 提醒折角，e 来自 zhé 的韵母。',
  '女:bn': 'B 键的锚点是“女”；n 来自 nǚ 的声母。',
  '不:cb': 'C 键的锚点是“不”；b 来自 bù 的声母。',
  '口:dk': 'D 键的锚点是“口”；大写 D 的圆肚提醒封闭轮廓，k 来自 kǒu。',
  '木:em': 'E 键的锚点是“木”；大写 E 像树干伸出三根枝条，m 来自 mù。',
  '一:fi': 'F 键先绑定平横“一”；Flat 帮你找 f，i 来自 yī 的韵母。',
  '丨:gs': 'G 键先绑定竖；想象一根“钢丝”竖直垂下，s 也来自 shù。',
  '士:gs': '把“士”并到竖的 gs 组；它和“丨”完全同码。',
  '心:hx': 'H 键的锚点是“心”；Heart 帮你找 h，x 来自 xīn。',
  '丶:id': 'I 键先绑定点/捺；小写 i 顶上就是一点，d 来自 diǎn。',
  '人:jr': 'J 键的锚点是“人”；小写 j 像站立的人，r 来自 rén。',
  '水:ks': 'K 键的锚点是“水”；K 的主干向两侧分流，s 来自 shuǐ。',
  '厶:ks': '“厶”和“水”完全同码，直接并入同一个 ks 组。',
  '艹:lc': 'L 键的锚点是“艹”；Lawn 帮你找 l，c 来自 cǎo。',
  '齿:lc': '“齿”和“艹”完全同码；c 也能从 chǐ 的声母首字母找回。',
  '大:md': 'M 键的锚点是“大”；d 来自 dà 的声母。',
  '十:ns': 'N 键的锚点是“十”；s 来自 shí 的声母首字母。',
  '日:or': 'O 键的锚点是“日”；O 像一轮圆日，r 来自 rì。',
  '刀:pd': 'P 键的锚点是“刀”；d 来自 dāo 的声母。',
  '田:qt': 'Q 键的锚点是“田”；Q 像带尾巴的田字框，t 来自 tián。',
  '又:ry': 'R 键的锚点是“又”；“又”本来像右手，Right 帮你找 r，y 来自 yòu。',
  '言:sy': 'S 键的锚点是“言”；Say 帮你找 s，y 来自 yán。',
  '丿:tp': 'T 键先绑定撇；从大写 T 顶端斜撇下来，p 来自 piě。',
  '手:us': 'U 键的锚点是“手”；U 像捧起的掌窝，s 来自 shǒu。',
  '匕:vb': 'V 像匕首的尖刃；b 取 bǐ 的声母。',
  '月:vy': 'V 键的锚点是“月”；y 来自 yuè 的声母。',
  '宀:wg': 'W 键的锚点是“宀”；把它念成“屋盖”，屋 w、盖 g。',
  '禾:xh': 'X 键的锚点是“禾”；X 像交叉的稻穗，h 来自 hé。',
  '小:yx': 'Y 键的锚点是“小”；x 来自 xiǎo 的声母。',
  '金:zj': 'Z 键的锚点是“金”；j 来自 jīn 的声母。',
  '止:si': 'Stop 的 s 就是“止”；zhǐ 属 z/zh 音，小码取韵母 i。',
  '衣:ti': 'T-shirt 的 t 是衣；“衣 yī”的尾音给 i。',
  '糸:is': 'I 像一束垂下的丝线；s 取 sī 的声母。',
  '龟:wg': '直接念“乌龟”：乌 w、龟 g，正好是 wg。',
  ':bk': '在“印”的左边认出“𠂎”；它和“女”同在 B 键，k 来自 kuàng。',
  '囗(框):rk': '四面外框显示为“囗”；它和“又”同在 R 键，k 来自 kuàng。',
  '牛:qn': '念“牵牛 qiān-niú”，两个声母正好提示 qn。',
  '米:pm': '“一捧米”里取“捧米”的 p、m，正好提示 pm。',
  '火:ch': 'Campfire 的 c 是火；h 取 huǒ 的声母。',
  '羊:gy': 'Goat 的 g 是羊；y 取 yáng 的声母。',
}

const rootsByCode = new Map<string, RootEntry[]>()
for (const root of roots) {
  const entries = rootsByCode.get(root.code) ?? []
  entries.push(root)
  rootsByCode.set(root.code, entries)
}

function soundCue(root: RootEntry): string {
  const smallCode = root.code[1]
  return `小码 ${smallCode}，${soundReason(root)}`
}

export type RootPhoneticRule = 'initial' | 'final' | 'umlaut-v'

export function getRootPhoneticRule(root: RootEntry): RootPhoneticRule {
  const smallCode = root.code[1]
  const pronunciation = rootPinyin(root)
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')

  if (pronunciation.startsWith(smallCode) && !/^[aeiou]/.test(smallCode)) return 'initial'
  if (smallCode === 'v' && pronunciation.startsWith('yu')) return 'umlaut-v'
  return 'final'
}

function rootPinyin(root: RootEntry): string {
  return root.pronunciation.match(/\p{Script=Latin}+/u)?.[0] ?? root.pronunciation
}

function soundReason(root: RootEntry): string {
  const pronunciation = rootPinyin(root)
  const rule = getRootPhoneticRule(root)
  if (rule === 'initial') return `取 ${pronunciation} 声母的首字母`
  if (rule === 'umlaut-v') return `${pronunciation} 的 ü 音用 v 表示`
  return `取 ${pronunciation} 的韵母字母`
}

function contextExample(root: RootEntry): string | undefined {
  const rootGlyphs = new Set([
    ...Array.from(root.root),
    ...Array.from(root.variants ?? '').filter((glyph) => glyph.trim()),
  ])
  return Array.from(root.examples.join('')).find((glyph) => glyph.trim() && !rootGlyphs.has(glyph))
}

export function getRootMemoryHint(root: RootEntry): RootMemoryHint {
  const mainCode = root.code[0]
  const anchor = ROOT_KEY_ANCHORS[mainCode]
  const sameCodeGroup = rootsByCode.get(root.code) ?? []
  const rootPosition = sameCodeGroup.findIndex((candidate) => candidate.root === root.root)
  const sameCodeRoots = sameCodeGroup
    .slice(0, Math.max(0, rootPosition))
    .map((candidate) => `“${candidate.root}”`)
  const sameCodeCue = sameCodeRoots.length
    ? `；它和${sameCodeRoots.join('、')}完全同码`
    : ''
  const secondaryCue = soundCue(root)
  const pronunciation = rootPinyin(root)
  const example = contextExample(root)
  const mnemonic = customMnemonics[`${root.root}:${root.code}`]
    ?? `${example ? `先在例字“${example}”里认出“${root.root}”，` : ''}它和“${anchor}”同在 ${mainCode.toUpperCase()} 键；小码 ${root.code[1]} ${soundReason(root)}${sameCodeCue}。`
  const anchorCue = root.root === anchor ? '本键锚点' : `和“${anchor}”同键`
  const compactAnchorCue = root.root === anchor ? `${mainCode.toUpperCase()} 键锚点` : `${mainCode.toUpperCase()} 键，同“${anchor}”`
  const compactSoundCue = getRootPhoneticRule(root) === 'umlaut-v'
    ? `${root.code[1]} ← ${pronunciation}（ü）`
    : `${root.code[1]} ← ${pronunciation}`

  return {
    mnemonic,
    compactCue: `${compactAnchorCue}；${compactSoundCue}`,
    primaryCue: `大码 ${mainCode.toUpperCase()}，${anchorCue}，${keyPositions[mainCode]}`,
    secondaryCue,
  }
}
