import type { ArticleEntry, CourseStage, SplitEntry } from '../types'
import { roots } from './roots.generated'

const firstRootCodes = [
  'fi', 'gs', 'tp', 'id', 'ae',
  'jr', 'dk', 'em', 'gt', 'ns', 'us', 'ks', 'ub', 'or', 'qt', 'lc',
  'hx', 'ry', 'vb', 'pd', 'rj', 'si', 'ug', 'bn', 'vy', 'xh', 'ti',
  'sy', 'is', 'wg', 'ru', 'nw', 'pe', 'oj', 'qn', 'pm', 'ch', 'gy',
]

const rootPriority = new Map(firstRootCodes.map((code, index) => [code, index]))

export const orderedRoots = [...roots].sort((left, right) => {
  const leftPriority = rootPriority.get(left.code) ?? 999
  const rightPriority = rootPriority.get(right.code) ?? 999
  if (leftPriority !== rightPriority) return leftPriority - rightPriority
  return left.code.localeCompare(right.code)
})

const basicStrokeSpecs = [
  { name: '横', glyph: '一', code: 'fi' },
  { name: '竖', glyph: '丨', code: 'gs' },
  { name: '撇', glyph: '丿', code: 'tp' },
  { name: '点/捺', glyph: '丶', code: 'id' },
  { name: '折', glyph: '㇆', code: 'ae' },
]

export const basicStrokes = basicStrokeSpecs.map((stroke) => {
  const entry = orderedRoots.find((root) => root.root === stroke.glyph && root.code === stroke.code)
  if (!entry) throw new Error(`Missing basic stroke ${stroke.name}`)
  return { ...stroke, entry }
})

export const rootPacks = Array.from({ length: Math.ceil(orderedRoots.length / 15) }, (_, index) => ({
  id: `roots-${index + 1}`,
  title: index === 0 ? '起步字根' : `字根微包 ${String(index + 1).padStart(2, '0')}`,
  roots: orderedRoots.slice(index * 15, index * 15 + 15),
}))

export const courseStages: CourseStage[] = [
  {
    id: 'strokes',
    index: 1,
    title: '五个笔画，先会按',
    description: '只认识横、竖、撇、点/捺、折的编码，不讲笔画理论。',
    kind: 'roots',
    target: '5 个编码',
    minutes: 3,
  },
  {
    id: 'formula',
    index: 2,
    title: '一条取码公式',
    description: '通过拖放和选择理解 Aa、ABb、ABCc、ABCD、ABCZ。',
    kind: 'formula',
    target: '5 道题',
    minutes: 4,
  },
  {
    id: 'roots',
    index: 3,
    title: '字根微包',
    description: '每次学一小包完整字根，并立刻看它们怎样拆进真实汉字。',
    kind: 'roots',
    target: '241 个字根',
    minutes: 10,
  },
  {
    id: 'splits',
    index: 4,
    title: '看懂拆分',
    description: '先看完整拆字与取码过程，再从左右、上下结构开始练习。',
    kind: 'splits',
    target: '必拆案例',
    minutes: 8,
  },
  {
    id: 'first-500',
    index: 5,
    title: '常用前 500',
    description: '看字打全码，逐渐混入简码；优先准确，不追速度。',
    kind: 'characters',
    target: '前 500 字',
    minutes: 10,
  },
  {
    id: 'shortcuts',
    index: 6,
    title: '简码与选重',
    description: '从已经熟悉的高频字中自然学习一简、二简与候选选择。',
    kind: 'characters',
    target: '高频简码',
    minutes: 8,
  },
  {
    id: 'phrases',
    index: 7,
    title: '短句与真实输入',
    description: '切换到 Fcitx5 虎码，直接输入中文短句，分别记录准确率和字速。',
    kind: 'article',
    target: '8 组短句',
    minutes: 10,
  },
  {
    id: 'later-1000',
    index: 8,
    title: '中后 1000',
    description: '扩展到前 1500 常用字，错项自动进入间隔复习。',
    kind: 'characters',
    target: '1500 常用字',
    minutes: 12,
  },
  {
    id: 'fluency',
    index: 9,
    title: '流畅与维护',
    description: '真实段落、弱项复习和每周短测共同推动速度，不牺牲准确率。',
    kind: 'article',
    target: '准确率 95%+',
    minutes: 15,
  },
]

export const splitExamples: SplitEntry[] = [
  { char: '秃', roots: ['禾', '几'], code: 'xoj', note: '两根字取两个大码，再补末根小码。', rule: 'order' },
  { char: '难', roots: ['又', '隹'], code: 'rui', note: '从左到右，末根“隹”补小码 i。', rule: 'order' },
  { char: '华', roots: ['亻', '匕', '十'], code: 'jvns', note: '三根字取三个大码，再补末根小码。', rule: 'order' },
  { char: '博', roots: ['十', '甫', '寸'], code: 'nnkc', note: '三根字的第四码来自末根小码。', rule: 'order' },
  { char: '叕', roots: ['又', '又', '又', '又'], code: 'rrrr', note: '四根字直接取四个大码。', rule: 'order' },
  { char: '赝', roots: ['厂', '亻', '隹', '贝'], code: 'xjuo', note: '按书写顺序取四根大码。', rule: 'order' },
  { char: '颦', roots: ['止', '𣥂', '页', '白', '丿', '十'], rootCodes: ['si', 'si', 'wy', 'ub', 'tp', 'ns'], code: 'sswn', note: '五根以上只取前三根与末根。', rule: 'order' },
  { char: '章', roots: ['音', '十'], code: 'xns', note: '优先认完整大字根“音”。', rule: 'shape' },
  { char: '寡', roots: ['宀', '页', '刀'], code: 'wwpd', note: '从上到下，认完整字根，不拆成细笔画。', rule: 'order' },
  { char: '魔', roots: ['麻', '鬼'], code: 'zag', note: '两个完整大根即可，不拆“麻”。', rule: 'shape' },
  { char: '空', roots: ['穴', '工'], code: 'eug', note: '从上到下的两根字。', rule: 'order' },
  { char: '柯', roots: ['木', '可'], code: 'ezk', note: '从左到右，末根“可”补小码 k。', rule: 'order' },
  { char: '画', roots: ['一', '田', '凵'], code: 'fqmk', note: '按书写顺序从外到内，末根补小码。', rule: 'order' },
  { char: '匡', roots: ['匚', '王'], code: 'nnw', note: '左开口框是匚，放在 N 键。', rule: 'frame' },
  { char: '鬯', roots: ['𠂭', '凵', '匕'], rootCodes: ['pm', 'mk', 'vb'], code: 'pmvb', note: '框的开口方向决定使用哪个字根。', rule: 'frame' },
  { char: '过', roots: ['寸', '辶'], code: 'kuc', note: '走之底按笔顺最后取。', rule: 'walk' },
  { char: '廷', roots: ['丿', '士', '廴'], code: 'tguy', note: '建之底和走之底一样最后取。', rule: 'walk' },
  { char: '果', roots: ['田', '木'], code: 'qem', note: '必要时允许一次切字，优先得到更大的根。', rule: 'cut' },
  { char: '丝', roots: ['纟', '纟'], code: 'iis', note: '中间横画被切开，得到两个纟。', rule: 'cut' },
  { char: '惠', roots: ['十', '田', '厶', '心'], code: 'nqkh', note: '这是少数需要两次切字的特殊例子，直接记住。', rule: 'cut' },
  { char: '胤', roots: ['儿', '幺', '月'], code: 'pivy', note: '字架“儿”优先，内部内容随后取。', rule: 'frame' },
  { char: '齑', roots: ['齐', '非', '一'], code: 'qrfi', note: '字架“齐”整体优先。', rule: 'frame' },
  { char: '哀', roots: ['衣', '口'], code: 'tdk', note: '字架“衣”包住“口”，衣先取。', rule: 'frame' },
  { char: '街', roots: ['行', '土', '土'], code: 'pggt', note: '字架“行”优先，再取中间的圭。', rule: 'frame' },
  { char: '国', roots: ['囗', '王', '丶'], rootCodes: ['rk', 'nw', 'id'], code: 'rnid', note: '里面有内容的四面框使用囗。', rule: 'frame' },
  { char: '回', roots: ['囗', '口'], rootCodes: ['rk', 'dk'], code: 'rdk', note: '外面是框囗，里面是口。', rule: 'frame' },
  { char: '冬', roots: ['夂', '冫'], code: 'hwb', note: '夂通常出现在上部或下部，右边不出头。', rule: 'shape' },
  { char: '效', roots: ['六', '乂', '攵'], code: 'abhp', note: '攵通常位于右侧，右边出头。', rule: 'shape' },
  { char: '祟', roots: ['屮', '凵', '示'], code: 'smfs', note: '“出”继续拆成屮与凵，再取示。', rule: 'shape' },
  { char: '幕', roots: ['艹', '日', '大', '巾'], code: 'lomr', note: '四根字只取四个大码。', rule: 'order' },
]

export const articles: ArticleEntry[] = [
  { id: 'message', title: '日常消息', level: '短句', text: '今天下午三点开会，请把修改后的文档发给我。' },
  { id: 'search', title: '搜索与记录', level: '短句', text: '先查拆分，再把这个字加入今天的错题复习。' },
  { id: 'arch', title: '终端操作', level: '短句', text: '更新完成后重启输入法，确认配置已经生效。' },
  { id: 'rain', title: '雨后', level: '短文', text: '窗外刚下过雨，路面映着商店的灯光。行人收起雨伞，晚风从半开的窗边吹进来。' },
  { id: 'focus', title: '专注练习', level: '短文', text: '练习时不必追求一次全对。看清错误发生在哪个字根，稍后再遇到它时重新回忆，记忆才会稳定。' },
  { id: 'routine', title: '稳定节奏', level: '短文', text: '每天抽出十分钟，先复习到期内容，再学习少量新字。准确率稳定以后，速度自然会逐步提高。' },
  { id: 'workflow', title: '真实工作流', level: '进阶', text: '打开终端后，我先检查项目状态，再运行测试和构建。确认结果没有问题，就整理变更说明并提交代码。这个过程并不复杂，关键是让每一步都能得到清楚的反馈。' },
  { id: 'fluency', title: '流畅输入', level: '进阶', text: '流畅并不意味着盲目追求速度。真正可靠的输入习惯，是在大多数时候无需停顿地找到字根，遇到生字也能迅速查询，然后继续完成原来的表达。' },
]

export const ruleLabels: Record<NonNullable<SplitEntry['rule']>, string> = {
  order: '书写顺序',
  frame: '字架优先',
  cut: '切字',
  walk: '走底后写',
  shape: '形近辨认',
}
