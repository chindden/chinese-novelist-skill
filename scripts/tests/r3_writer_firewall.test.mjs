import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

import {
  BRIEF_STYLE_HEADING,
  BRIEF_PREV_TAIL_HEADING,
  scanWriterContextPurity,
  assertWriterContextPurity,
  assertWriterBriefTailOrder,
  extractPreviousChapterTail,
  sanitizeNarrativeText,
  compileRevisionCard,
} from '../r3_writer_firewall.mjs';
import {buildWriterBrief} from '../build_writer_brief.mjs';
import {buildRevisionCard} from '../build_revision_card.mjs';

const resolveScript = name => fileURLToPath(new URL(`../${name}.mjs`, import.meta.url));
const runCli = (name, ...args) => {
  const res = spawnSync(process.execPath, [resolveScript(name), ...args], {encoding: 'utf8'});
  let out = res.stdout;
  try { out = JSON.parse(res.stdout); } catch {}
  return {code: res.status, out, stdout: res.stdout, stderr: res.stderr};
};

// Realistic 1,100+ char Chinese chapter 1 prose so tail slicing strictly falls within 500-900 chars.
const CHAPTER_1_PROSE = [
  '# 第1章 秤盘听风',
  '',
  '三月初七寅时，天还未亮透，青石巷尽头的米铺门板便被一阵湿冷的江风拍得吱呀作响。沈青河提着半盏油灯从后院转出来，鞋底踩过门槛前积着的一层细沙，先弯腰把门栓抽开半寸，侧耳听外头巷口没有杂乱脚步，才把两扇榆木门依次卸下靠在墙根。',
  '',
  '柜台后的青铜秤盘还留着昨晚盘账时擦过的油光。他摸出腰袋里那三十六两碎银，在掌心掂了掂，又把竹筒里记着余粮的筹签倒出来重新码齐。库房东墙根下码着四百二十斤新收的灵米，麻袋口都用麻绳勒着死结，唯独靠窗那一摞昨日沾了点潮气，得赶在巳时开市前先翻晒一遍。',
  '',
  '门外忽然传来两声极轻的叩门声。沈青河手指一顿，没有急着抬头，先把油灯往柜台内侧推了半尺，借着昏黄的火苗去照门缝底下的影子。来人穿着沾满泥点的草鞋，脚尖微微朝外撇着，像是从渡口一路快步跑过来的。他认得这步态，是城西盐帮给各家铺子送信的脚夫老赵。',
  '',
  '“沈掌柜，门开了没？”老赵压着嗓子，把一张叠成方胜的粗纸从门缝里塞进来，“东家让我捎句话，码头那批青铜令牌三枚已到岸，明晚子时前要对上暗记，若是迟了半刻，下月的米引子就得另换旁家。”话音刚落，巷口远处响起打更人最后一声梆子，老赵缩回手，转身便扎进未散的晨雾里。',
  '',
  '沈青河弯腰拾起那张粗纸，指腹捻过纸背一道微不可察的焦痕，眉头缓缓收紧。纸上只画着半枚残缺的秤星纹，正是三年前师父失踪前留在旧账册夹页里的记号。那时他以为师父只是避祸远走，如今这记号竟顺着盐帮的线重新浮出水面，显然有人早就在暗中盯着米铺里的存粮与旧账。',
  '',
  '他把粗纸凑到灯芯旁仔细端详片刻，终究没有烧掉，而是折回原样压进袖袋最里层。外头天色渐白，早起挑水的街坊已经推开木门，水桶撞在石阶上发出清脆的磕碰声。沈青河吹熄油灯，转身掀开后院棉帘，目光落在墙角那口尘封已久的黑漆木箱上。箱锁虽已生锈，锁孔边却有一道极新鲜的划痕，分明是昨夜有人趁雨翻墙进院试过钥匙。',
  '',
  '风从半开的窗缝灌进来，吹得账簿纸页哗啦翻动。沈青河伸手按住书页，心里已把今早的去处定下：开市前先去西市找周铁匠重配箱锁，再绕道渡口摸清那三枚青铜令牌究竟经了谁的手。他提起铜壶往炉上添了半瓢冷水，听着炭火嘶嘶作响，抬眼望向门外渐散的薄雾。',
].join('\n');

const CONTAMINATED_CHARACTERS = `# 人物档案

## 核心人设
- 沈青河：城南米铺掌柜，心思缜密，账目极清。 [F-001 | ch1 | established]
- 周铁匠：西市老匠人，曾与沈青河师父有旧。 (R-02 | ch1)
- 老赵：盐帮脚夫，惯常黎明前送信。 schemaVersion: 1, SHA-256: aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa

### 第3章核心身份反转
- 核心身份反转剧透：老赵实为官府暗桩。

### 第三章密道揭秘
- 密道机关暗语藏于北渡口砖缝。

## 动态状态与远期弧线
- 沈青河已察觉有人夜探后院黑漆木箱，表面仍不动声色维持米铺开市。 R3_P1_HARD_CAUSAL_FLOOR pass_candidate

### 第3章状态变化
- 沈青河在第三章意外得知周铁匠真实身份为前朝密探，并拿到玄铁秘钥一枚。

### 第十二章终极对决
- 第十二章焚仓终战揭露主谋。

### 远期弧线
- 卷末揭晓盐帮幕后东家实为城守暗线，终局焚毁假米引。
`;

const CONTAMINATED_OUTLINE = `# 故事大纲

## 核心契约
经营米铺与追查师父旧案双线并行，严守限知视角与真实账目。

### 全书稳定经济基线
- 城南官定灵米市价每百斤折银八两，盐帮米引按月核验签押。

## 滚动卷纲
### 第1卷
#### 第1章 秤盘听风
沈青河清晨盘账收到盐帮暗信，发现后院木箱锁孔有新划痕。

#### 第2章 铁铺旧锁
- [F-012 | ch2 | established] 沈青河带黑漆木箱旧锁芯赴西市找周铁匠，顺势打听三年前师父旧账与三枚青铜令牌来历。
- 途中遭遇税吏盘查，需在不动声色间保住袖袋粗纸与余银三十六两。
- 工程备注勿入正文：R2_UNRESOLVED_ISSUES BLOCKER reverseDefense: "测试防杠词" 02-写作计划.json story-ledger.json reviews/r3/pack.json M1–M4 OR1–OR7 HL-2

#### 第3章 渡口暗钥
- 沈青河夜探北渡口旧仓，夺得玄铁秘钥一枚，当场撞破周铁匠前朝密探身份。

##### 第3章物品与经济底账
- 沈青河余银暴涨至五百两，怀中新增玄铁秘钥一枚与盐帮红漆密信一封。
`;

const STYLE_BENCHMARK = `# 文风基准

## 文风指纹
整体冷峻克制，以动作、器物、声响承载情绪，不写空洞心理说明。

### 紧张段落示范
檐下滴水一粒粒砸在青石板上，他没有回头，只把手指慢慢按上腰间铜扣，等身后那半步迟疑彻底落定，才反手掀翻了案上的茶盏。

### 舒缓段落示范
日头刚爬过瓦脊，灶膛里余炭还透着一点暗红，满屋子都是新焙陈米混着松烟的微苦香气。

## 本书校准段落
柜台角那把算盘磨得发亮，拨珠声一顿，屋里便静得能听见窗纸外麻雀落枝的轻响。
`;

function makeExactCharsProse(n) {
  const unit = '沈青河推开米铺木门，青石巷晨雾微凉，柜台铜秤静立，账簿纸页随江风轻翻。';
  let body = '';
  while (body.length < n) body += unit;
  return `# 第1章 边界测试\n\n${body.slice(0, n)}\n`;
}

function createContaminatedProject(t, {prevChapterContent = CHAPTER_1_PROSE} = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'r3-writer-fw-'));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  fs.mkdirSync(path.join(root, 'chapters'), {recursive: true});
  fs.writeFileSync(path.join(root, '00-人物档案.md'), CONTAMINATED_CHARACTERS);
  fs.writeFileSync(path.join(root, '01-大纲.md'), CONTAMINATED_OUTLINE);
  fs.writeFileSync(path.join(root, '03-文风基准.md'), STYLE_BENCHMARK);
  fs.writeFileSync(path.join(root, 'chapters/1.md'), prevChapterContent);
  fs.writeFileSync(path.join(root, '02-写作计划.json'), JSON.stringify({
    novelName: '秤星旧账',
    minWordsPerChapter: 3000,
    chapters: [
      {chapterNumber: 1, title: '秤盘听风', filePath: 'chapters/1.md', status: 'completed', wordCountPass: true},
      {chapterNumber: 2, title: '铁铺旧锁', filePath: 'chapters/2.md', status: 'pending'},
      {chapterNumber: 3, title: '渡口暗钥', filePath: 'chapters/3.md', status: 'pending'},
    ],
  }, null, 2));
  fs.writeFileSync(path.join(root, 'story-ledger.json'), JSON.stringify({
    schemaVersion: 1,
    facts: [
      {
        id: 'F-010', chapter: 1, kind: 'established', subject: '沈青河', key: '腰袋余银',
        value: '旧值二十两（已过时）', evidence: '初盘', supersededBy: 'F-012',
      },
      {
        id: 'F-012', chapter: 1, kind: 'established', subject: '沈青河', key: '腰袋余银',
        value: '[F-012 | ch1 | established] 白银三十六两，准备用于重配箱锁与周转', evidence: '秤盘盘点',
      },
      {
        id: 'F-013', chapter: 1, kind: 'established', subject: '米铺库房', key: '灵米存量',
        value: '灵米四百二十斤，其中靠窗一摞受潮需巳时前翻晒', evidence: '库房清点',
      },
      {
        id: 'F-014', chapter: 1, kind: 'established', subject: '码头暗信', key: '青铜令牌与时限',
        value: '三月初七寅时收到粗纸，青铜令牌三枚已到岸，明晚子时前对暗记', evidence: '老赵送信',
      },
      {
        id: 'F-015', chapter: 1, kind: 'character-belief', subject: '沈青河', key: '夜探者身份',
        value: '怀疑与盐帮及师父三年前失踪旧案有关，但尚未确认具体来人', evidence: '锁孔新划痕',
      },
      {
        id: 'F-016', chapter: 1, kind: 'provisional', subject: '临时草稿', key: '未定稿数字',
        value: '九千九百九十九两', evidence: '草稿不应入简报',
      },
      {
        id: 'F-030', chapter: 3, kind: 'established', subject: '沈青河', key: '第三章新增密物',
        value: '玄铁秘钥一枚与盐帮红漆密信一封，余银增至五百两', evidence: '第3章北渡口',
      },
    ],
    foreshadowing: [
      {id: 'P-003', chapter: 1, status: 'open', description: '[P-003 | ch1 | open] 黑漆木箱锁孔边的新鲜划痕与半枚秤星纹粗纸'},
      {id: 'P-004', chapter: 1, status: 'paid', description: '已回收旧伏笔不应再提醒'},
      {id: 'P-030', chapter: 3, status: 'open', description: '第三章北渡口暗仓红漆密信伏笔'},
    ],
    relationships: [
      {id: 'REL-1', chapter: 1, characters: ['沈青河', '老赵'], change: '老赵暗中代传盐帮秤星纹粗纸', consequence: '沈青河决定绕道渡口查明令牌经手人'},
      {id: 'REL-3', chapter: 3, characters: ['沈青河', '周铁匠'], change: '周铁匠暴露前朝密探身份', consequence: '两人结成密盟'},
    ],
    mechanisms: [],
    handoffs: [
      {
        chapter: 1,
        asOf: '三月初七辰初',
        events: [{when: '三月初七寅时', event: '[F-012 | ch1 | established] 收到老赵递来的秤星纹粗纸并发现木箱锁孔新划痕'}],
        knowledge: [{character: '沈青河', change: '得知三枚青铜令牌已到岸且有人昨夜翻墙试锁'}],
      },
      {
        chapter: 3,
        asOf: '三月初八子时',
        events: [{when: '三月初八亥时', event: '北渡口夺得玄铁秘钥'}],
        knowledge: [{character: '沈青河', change: '确认周铁匠真实身份为前朝密探'}],
      },
    ],
  }, null, 2));

  return root;
}

function makeContaminatedReviewReport() {
  return {
    schemaVersion: 1,
    kind: 'chapter',
    end: 2,
    revision: 1,
    reviewFingerprint: 'deadbeef'.repeat(8),
    manuscriptHashes: {'2': 'b'.repeat(64)},
    decision: 'revise',
    summary: '存在两处客观阻断缺陷，R2_UNRESOLVED_ISSUES 需返工。',
    p1: {
      schemaVersion: 1,
      literaryStatus: 'UNVERIFIED',
      preserveStrengths: [
        {
          id: 'STR-1', status: 'observed', chapter: 2,
          quote: '风箱拉到第三下，炭火猛地蹿起半尺青焰，映得周铁匠眼角一道旧疤发亮。',
          reason: 'REVIEWER_STRENGTH_REASON_ALPHA_不得透传给写手的亮点评语',
        },
        {
          id: 'STR-2', status: 'observed', chapter: 2,
          quote: '沈青河没接茶碗，只把生锈的铜锁芯往铁砧边轻轻一放。',
          reason: 'REVIEWER_STRENGTH_REASON_BETA_潜台词评语',
        },
        {
          id: 'STR-3', status: 'observed', chapter: 2,
          quote: '街口铜锣刚响过两声，税吏的青布靴已停在铁铺门槛外半步。',
          reason: 'REVIEWER_STRENGTH_REASON_GAMMA_节奏评语',
        },
      ],
      signals: [],
      followUps: [],
      revisionProtection: [],
    },
    issues: [
      {
        id: 'ISS-001',
        issueIdentityKey: 'ch2:iron-lock:silver-math',
        severity: 'BLOCKER',
        status: 'open',
        chapter: 2,
        classification: 'A',
        evidenceLevel: 'causal_break',
        evidenceBasis: 'explicit_text',
        disposition: 'fix_now',
        blocking: true,
        mustCloseInReReview: true,
        quote: 'ISSUE_QUOTE_ONE_沈青河随手数出五十两银子拍在铁砧上。',
        reason: 'REVIEWER_REASON_ONE_[F-012 | ch1 | established] 账目硬矛盾评语。',
        suggestion: 'REVIEWER_SUGGESTION_ONE_改定金建议。',
        narrativeGuidance: '沈青河腰袋里只有三十六两碎银，付给周铁匠配锁时金额不能超过余银，请改为先付二两定银。',
        reverseDefense: {
          chapter: 2,
          quote: '沈青河随手数出五十两银子拍在铁砧上。',
          reason: 'SENTINEL_REVERSE_DEFENSE_ALPHA_绝不可泄露给写手的反方辩护论证文本',
        },
      },
      {
        id: 'ISS-002',
        issueIdentityKey: 'ch2:pov-leak',
        severity: 'MAJOR',
        status: 'open',
        chapter: 2,
        classification: 'A',
        evidenceLevel: 'explicit_conflict',
        evidenceBasis: 'explicit_text',
        disposition: 'fix_now',
        quote: 'ISSUE_QUOTE_TWO_门外税吏心里暗笑，早已知道粗纸藏在沈青河左袖。',
        reason: 'REVIEWER_REASON_TWO_越出限知视角。 R3_POV_VIOLATION',
        suggestion: 'REVIEWER_SUGGESTION_TWO_改为侧面描写。',
        narrativeGuidance: '本章始终维持沈青河限知视角，不要直接写门外税吏的内心想法，改为通过沈青河观察到的眼神停顿与手势细节表现警觉。',
        reverseDefense: 'SENTINEL_REVERSE_DEFENSE_BETA_另一段反方自证原话',
      },
      {
        id: 'ISS-003',
        severity: 'MINOR',
        status: 'open',
        chapter: 2,
        classification: 'C',
        disposition: 'defer_to_final',
        quote: '炉火忽明忽暗。',
        reason: '局部修辞略平，非阻断项。',
        suggestion: '终稿润色时可微调。',
      },
      {
        id: 'ISS-004',
        severity: 'SUGGESTION',
        status: 'open',
        chapter: 2,
        disposition: 'advisory',
        blocking: false,
        mustCloseInReReview: false,
        quote: '铁铺外飘来一阵雨丝。',
        reason: '可选氛围润色建议，绝不进入返工必改指令。',
        suggestion: '可酌情加一句炭味描写。',
      },
      {
        id: 'ISS-005',
        severity: 'MAJOR',
        status: 'open',
        chapter: 2,
        classification: 'B',
        disposition: 'fix_in_arc',
        quote: '远期卷内伏笔。',
        reason: '弧内修复项不应进入单章必改。',
        suggestion: '后续章节收束。',
      },
      {
        id: 'ISS-006',
        severity: 'BLOCKER',
        status: 'resolved',
        chapter: 2,
        classification: 'A',
        disposition: 'fix_now',
        narrativeGuidance: '已解决的阻断项不应再次进入修订卡。',
      },
    ],
  };
}

// ============================================================================
// TC-P0-2-1: Zero governance metadata leakage + Fail-Closed purity assertion
// ============================================================================
test('TC-P0-2-1: Writer Brief and Revision Card have strictly 0 governance token hits; assertWriterContextPurity fails closed', t => {
  const root = createContaminatedProject(t);
  const brief = buildWriterBrief(root, 2);

  const briefScan = scanWriterContextPurity(brief.markdown);
  assert.equal(briefScan.governanceCount, 0, JSON.stringify(briefScan.governanceHits));
  assert.equal(briefScan.timePressureCount, 0, JSON.stringify(briefScan.timePressureHits));
  assert.equal(briefScan.pure, true);
  assert.doesNotThrow(() => assertWriterContextPurity(brief.markdown));

  for (const banned of ['SHA-256', 'schemaVersion', 'reverseDefense', 'R2_', 'R3_', 'BLOCKER', 'pass_candidate', '[F-012', '02-写作计划.json', 'story-ledger.json', 'M1–M4', 'OR1–OR7', 'HL-2']) {
    assert.equal(brief.markdown.includes(banned), false, `Writer Brief leaked: ${banned}`);
  }

  const report = makeContaminatedReviewReport();
  const card = compileRevisionCard(report, {chapterNumber: 2});
  const cardScan = scanWriterContextPurity(card.markdown);
  assert.equal(cardScan.governanceCount, 0, JSON.stringify(cardScan.governanceHits));
  assert.equal(cardScan.timePressureCount, 0, JSON.stringify(cardScan.timePressureHits));
  assert.equal(cardScan.pure, true);
  assert.doesNotThrow(() => assertWriterContextPurity(card.markdown));

  for (const banned of ['SHA-256', 'schemaVersion', 'reverseDefense', 'R2_', 'R3_', 'BLOCKER', 'MAJOR', 'MINOR', 'SUGGESTION', 'pass_candidate', 'issueIdentityKey', 'reviewFingerprint', '[F-012']) {
    assert.equal(card.markdown.includes(banned), false, `Revision Card leaked: ${banned}`);
  }

  const leakSamples = [
    '正文含 SHA-256 校验值',
    '这里混入了 schemaVersion 字段',
    '请附带 reverseDefense 说明',
    '触发了 R2_UNRESOLVED_ISSUES 门禁',
    '触发了 R3_P1_HARD_CAUSAL_FLOOR 错误',
    '这是一个 BLOCKER 级别问题',
    '当前结论为 pass_candidate',
    '[F-012 | ch2 | established] 主角余银三十六两',
    '摘要哈希 ' + 'a'.repeat(64),
    '包含 issueIdentityKey 与 reviewFingerprint',
  ];
  for (const sample of leakSamples) {
    assert.throws(() => assertWriterContextPurity(sample), /WRITER_FIREWALL_GOVERNANCE_LEAK/, `Expected throw for: ${sample}`);
  }
});

// ============================================================================
// TC-P0-2-2: Zero time-pressure words (CN & EN variants) + positive/negative tests
// ============================================================================
test('TC-P0-2-2: Zero time-pressure phrases in outputs; expanded CN/EN variants rejected while safe literary prose passes', t => {
  const root = createContaminatedProject(t);
  const brief = buildWriterBrief(root, 2);
  const card = compileRevisionCard(makeContaminatedReviewReport(), {chapterNumber: 2});

  assert.equal(scanWriterContextPurity(brief.markdown).timePressureCount, 0);
  assert.equal(scanWriterContextPurity(card.markdown).timePressureCount, 0);

  // Positive (must reject) across all categories and CN/EN variants
  const pressureSamples = [
    '请在5分钟内完成本章正文。',
    '五分钟目标要求写手提速。',
    'Target 5 min per chapter.',
    '限时完成本章，不要拖延。',
    '切勿超时，严格遵守 deadline。',
    'This draft has a strict time limit and is timeboxed.',
    '为了赶工请简写过渡段。',
    '今晚赶稿，压缩写稿时间。',
    'Please rush writing and hurry up.',
    '倒计时开始，掐表写作。',
    'The countdown has started and the clock is ticking.',
    '请尽快写完本章。',
    '请尽快完成本章，不要细雕。',
    '马上完成这一章并火速交稿。',
    '立即完成并抓紧时间完成收尾。',
    '十分钟内写完本章正文。',
    'Finish ASAP and complete within 5 minutes.',
  ];
  for (const sample of pressureSamples) {
    assert.throws(() => assertWriterContextPurity(sample), /WRITER_FIREWALL_TIME_PRESSURE_DETECTED/, `Expected throw for: ${sample}`);
  }

  // Negative (safe normal literary prose must NOT false-positive)
  const safeLiteraryProse = [
    '他匆匆赶路穿过青石雨巷，推门进屋。',
    '她立刻推开窗扉，望见巷口灯火未熄。',
    '更夫敲过三更梆子，茶水很快凉透。',
    '天亮前须赶回城南米铺清点新粮。',
  ];
  for (const prose of safeLiteraryProse) {
    assert.doesNotThrow(() => assertWriterContextPurity(prose), `Unexpected false positive on: ${prose}`);
  }

  // Injection into buildWriterBrief / compileRevisionCard / CLI must Fail-Closed
  assert.throws(
    () => buildWriterBrief(root, 2, {extraDirectives: '请尽快完成本章，马上完成不要拖延'}),
    /WRITER_FIREWALL_TIME_PRESSURE_DETECTED/,
  );

  const pressuredReport = makeContaminatedReviewReport();
  pressuredReport.issues[0].narrativeGuidance = '请立即完成修改，finish ASAP。';
  assert.throws(
    () => compileRevisionCard(pressuredReport, {chapterNumber: 2}),
    /WRITER_FIREWALL_TIME_PRESSURE_DETECTED/,
  );

  const cliBad = runCli('build_writer_brief', root, '--chapter', '2', '--extra', '请尽快完成本章，别超时', '--json');
  assert.equal(cliBad.code, 2);
  assert.match(cliBad.out.error, /WRITER_FIREWALL_TIME_PRESSURE_DETECTED/);
});

// ============================================================================
// TC-P0-2-3: Mandatory tail section ordering + strict 500-900 Fail-Closed floor
// ============================================================================
test('TC-P0-2-3: Strict tail order (style anchor -> prev chapter tail) and Fail-Closed 500/900 length boundaries', t => {
  const root = createContaminatedProject(t);
  const brief = buildWriterBrief(root, 2);

  const headings = brief.tailCheck.headings;
  assert.equal(headings[headings.length - 2], BRIEF_STYLE_HEADING);
  assert.equal(headings[headings.length - 1], BRIEF_PREV_TAIL_HEADING);
  assert.ok(brief.tailCheck.prevTailChars >= 500 && brief.tailCheck.prevTailChars <= 900,
    `Expected prevTailChars in [500, 900], got ${brief.tailCheck.prevTailChars}`);
  assert.ok(brief.markdown.trimEnd().endsWith('抬眼望向门外渐散的薄雾。'));

  const styleIdx = brief.markdown.indexOf(BRIEF_STYLE_HEADING);
  const prevIdx = brief.markdown.indexOf(BRIEF_PREV_TAIL_HEADING);
  assert.ok(styleIdx > 0 && prevIdx > styleIdx);
  const styleSlice = brief.markdown.slice(styleIdx, prevIdx);
  assert.ok(styleSlice.includes('檐下滴水一粒粒砸在青石板上'));
  assert.ok(styleSlice.includes('柜台角那把算盘磨得发亮'));

  // Chapter 1 (no previous chapter) ends cleanly with style anchor
  const ch1Brief = buildWriterBrief(root, 1);
  assert.equal(ch1Brief.tailCheck.last, BRIEF_STYLE_HEADING);

  // Short previous chapter (< 500 chars: 40 chars and exact 499 chars) MUST Fail-Closed
  const short40Root = createContaminatedProject(t, {prevChapterContent: makeExactCharsProse(40)});
  assert.throws(() => buildWriterBrief(short40Root, 2), /WRITER_BRIEF_PREV_TAIL_TOO_SHORT/);
  const shortCli = runCli('build_writer_brief', short40Root, '--chapter', '2', '--json');
  assert.equal(shortCli.code, 2);
  assert.match(shortCli.out.error, /WRITER_BRIEF_PREV_TAIL_TOO_SHORT/);

  const short499Root = createContaminatedProject(t, {prevChapterContent: makeExactCharsProse(499)});
  assert.throws(() => buildWriterBrief(short499Root, 2), /WRITER_BRIEF_PREV_TAIL_TOO_SHORT/);

  // Exact 500-char boundary passes
  const exact500Root = createContaminatedProject(t, {prevChapterContent: makeExactCharsProse(500)});
  const brief500 = buildWriterBrief(exact500Root, 2);
  assert.equal(brief500.tailCheck.prevTailChars, 500);

  // Exact 900-char boundary passes
  const exact900Root = createContaminatedProject(t, {prevChapterContent: makeExactCharsProse(900)});
  const brief900 = buildWriterBrief(exact900Root, 2);
  assert.equal(brief900.tailCheck.prevTailChars, 900);

  // Over-long 901-char and 1500-char previous chapters slice cleanly into [500, 900]
  for (const len of [901, 1500]) {
    const overRoot = createContaminatedProject(t, {prevChapterContent: makeExactCharsProse(len)});
    const briefOver = buildWriterBrief(overRoot, 2);
    assert.ok(briefOver.tailCheck.prevTailChars >= 500 && briefOver.tailCheck.prevTailChars <= 900,
      `Expected sliced len in [500, 900] for source ${len}, got ${briefOver.tailCheck.prevTailChars}`);
  }

  // Negative Fail-Closed tests for assertWriterBriefTailOrder
  const swapped = `# 标题\n\n## 本章故事脉络与细纲\n内容\n\n${BRIEF_PREV_TAIL_HEADING}\n\n上章结尾\n\n${BRIEF_STYLE_HEADING}\n\n文风示范\n`;
  assert.throws(() => assertWriterBriefTailOrder(swapped, {hasPrevChapter: true}), /WRITER_BRIEF_TAIL_ORDER_INVALID/);
  const trailing = `${brief.markdown}\n## 补充说明\n不该放在最末位的内容\n`;
  assert.throws(() => assertWriterBriefTailOrder(trailing, {hasPrevChapter: true}), /WRITER_BRIEF_TAIL_ORDER_INVALID/);

  // Direct extractPreviousChapterTail check + TRUE byte-for-byte VERBATIM fidelity (B2)
  assert.throws(() => extractPreviousChapterTail(makeExactCharsProse(120)), /WRITER_BRIEF_PREV_TAIL_TOO_SHORT/);
  const tail = extractPreviousChapterTail(CHAPTER_1_PROSE, {minChars: 500, maxChars: 900});
  const tailNonWs = tail.replace(/\s+/g, '').length;
  assert.ok(tailNonWs >= 500 && tailNonWs <= 900, `Expected 500-900 chars, got ${tailNonWs}`);

  // Exact slice after "## 上一章结尾原文\n\n" (no .trim() masking!)
  const briefTailExact = brief.markdown.slice(prevIdx + BRIEF_PREV_TAIL_HEADING.length + 2);
  assert.equal(briefTailExact, tail, 'Previous chapter tail in Writer Brief must match raw slice byte-for-byte');
  assert.ok(CHAPTER_1_PROSE.endsWith(briefTailExact), 'Previous chapter tail must be an unmodified contiguous suffix of source chapter');

  // CRLF (\r\n), multiple blank lines (\r\n\r\n\r\n), trailing spaces ("   ") MUST survive byte-for-byte
  const crlfChapter = [
    '# 第1章 特殊空白保真测试',
    '',
    '前文铺垫段。'.repeat(70) + '  ',
    '',
    '',
    '中段过渡保留行尾双空格与多空行。'.repeat(22) + '   ',
    '',
    '',
    '末段收尾保留原始换行与尾随空格。'.repeat(18) + '  ',
    '',
  ].join('\r\n');
  const crlfRoot = createContaminatedProject(t, {prevChapterContent: crlfChapter});
  const crlfBrief = buildWriterBrief(crlfRoot, 2);
  const crlfPrevIdx = crlfBrief.markdown.indexOf(BRIEF_PREV_TAIL_HEADING);
  const crlfTailExact = crlfBrief.markdown.slice(crlfPrevIdx + BRIEF_PREV_TAIL_HEADING.length + 2);
  assert.ok(crlfChapter.endsWith(crlfTailExact), 'CRLF Writer Brief tail must be exact contiguous suffix of raw CRLF file');
  assert.ok(crlfTailExact.includes('\r\n\r\n\r\n'), 'Multiple CRLF blank lines must be preserved verbatim');
  assert.ok(crlfTailExact.includes('   \r\n'), 'Trailing line spaces must be preserved verbatim');

  // Exact paragraph-start alignment at maxChars (450 + 450 = 900 non-ws chars) keeps the full paragraph start cleanly
  const exactBoundaryParaChapter = '# 第1章\n\n' + '甲'.repeat(300) + '。\n\n  ' + '乙'.repeat(449) + '。\n\n' + '丙'.repeat(449) + '。';
  const exactBoundaryTail = extractPreviousChapterTail(exactBoundaryParaChapter, {minChars: 500, maxChars: 900});
  assert.equal(exactBoundaryTail, '  ' + '乙'.repeat(449) + '。\n\n' + '丙'.repeat(449) + '。');
  assert.ok(exactBoundaryParaChapter.endsWith(exactBoundaryTail));

  // Over-long single paragraph (no blank lines, >1200 chars) slices a true contiguous suffix with CRLF preserved
  const singleLongPara = '# 第1章 超长单段\r\n\r\n' + '青石巷湿冷江风拍打木门，沈青河低头拨动算珠清点灵米与碎银。'.repeat(45) + '  \r\n';
  const singleParaRoot = createContaminatedProject(t, {prevChapterContent: singleLongPara});
  const singleParaBrief = buildWriterBrief(singleParaRoot, 2);
  const spIdx = singleParaBrief.markdown.indexOf(BRIEF_PREV_TAIL_HEADING);
  const spTailExact = singleParaBrief.markdown.slice(spIdx + BRIEF_PREV_TAIL_HEADING.length + 2);
  assert.ok(singleLongPara.endsWith(spTailExact), 'Over-long single-paragraph slice must be exact contiguous suffix of raw chapter');
  assert.ok(singleParaBrief.tailCheck.prevTailChars >= 500 && singleParaBrief.tailCheck.prevTailChars <= 900);

  // Contaminated previous chapter manuscript MUST Fail-Closed (reject rather than silently rewriting novel text)
  const pollutedPrevRoot = createContaminatedProject(t, {
    prevChapterContent: CHAPTER_1_PROSE + '\n[F-012 | ch1 | established] SHA-256 污染测试。',
  });
  assert.throws(() => buildWriterBrief(pollutedPrevRoot, 2), /WRITER_FIREWALL_GOVERNANCE_LEAK/);
});

// ============================================================================
// TC-P0-2-4: Zero hard-fact loss (incl. CN comma/colon precision) + temporal isolation
// ============================================================================
test('TC-P0-2-4: Cleaning never swallows Chinese hard facts across commas/colons and isolates future chapters (3-chapter fixture)', t => {
  // 1. Metadata key-value sanitizer precision regressions (Chinese comma, Chinese colon, same-sentence, cross-sentence)
  const cases = [
    {input: '沈青河的 schemaVersion: 1，腰袋余银三十六两。', keep: ['沈青河', '腰袋余银三十六两']},
    {input: 'schemaVersion：1，灵米四百二十斤。', keep: ['灵米四百二十斤']},
    {input: 'reverseDefense: "内部反证说明"，三月初七寅时开市。', keep: ['三月初七寅时开市'], drop: ['内部反证说明', 'reverseDefense']},
    {input: '本段标记 schemaVersion: 1。\n沈青河带走青铜令牌三枚。', keep: ['沈青河带走青铜令牌三枚']},
    {input: '{"schemaVersion": 1, "reverseDefense": "不应透传"} 沈青河手握三十六两碎银。', keep: ['沈青河手握三十六两碎银'], drop: ['不应透传']},
  ];
  for (const c of cases) {
    const cleaned = sanitizeNarrativeText(c.input);
    assert.equal(scanWriterContextPurity(cleaned).pure, true, `Not pure: ${cleaned}`);
    for (const k of c.keep) {
      assert.ok(cleaned.includes(k), `Lost hard fact "${k}" from "${c.input}" -> "${cleaned}"`);
    }
    for (const d of c.drop || []) {
      assert.equal(cleaned.includes(d), false, `Failed to strip "${d}" from "${cleaned}"`);
    }
  }

  // 2. Hard facts preserved & future Chapter 3 spoilers strictly excluded from Chapter 2 brief
  const root = createContaminatedProject(t);
  const brief = buildWriterBrief(root, 2);
  const md = brief.markdown;

  const requiredHardFacts = [
    '沈青河',
    '周铁匠',
    '老赵',
    '城南官定灵米市价每百斤折银八两', // book-level stable baseline in ## 核心契约
    '三月初七寅时',
    '三月初七辰初',
    '三十六两',
    '灵米四百二十斤',
    '青铜令牌三枚',
    '黑漆木箱锁孔边的新鲜划痕',
    '半枚秤星纹粗纸',
    '怀疑与盐帮及师父三年前失踪旧案有关',
    '得知三枚青铜令牌已到岸且有人昨夜翻墙试锁',
  ];
  for (const fact of requiredHardFacts) {
    assert.ok(md.includes(fact), `Hard fact lost during cleaning: ${fact}`);
  }

  // Superseded, provisional, paid foreshadowing, AND all Chapter 3+ (Arabic & Chinese numeral, core & rolling) future info MUST be absent
  const forbiddenFutureOrStale = [
    '旧值二十两',
    '九千九百九十九两',
    '已回收旧伏笔不应再提醒',
    '玄铁秘钥',
    '五百两',
    '红漆密信',
    '前朝密探',
    '北渡口',
    '城守暗线',
    '焚毁假米引',
    '核心身份反转剧透',
    '官府暗桩',
    '密道机关暗语',
    '第十二章焚仓终战',
  ];
  for (const item of forbiddenFutureOrStale) {
    assert.equal(md.includes(item), false, `Stale or future-chapter info leaked into Ch 2 brief: ${item}`);
  }
});

// ============================================================================
// TC-P0-2-5: Strict Revision Card whitelist (preserveStrengths quotes + narrativeGuidance ONLY)
// ============================================================================
test('TC-P0-2-5: Revision Card enforces strict writer-safe whitelist, retains 100% preserveStrengths quotes, leaks 0 reverseDefense/reason/quote', t => {
  const root = createContaminatedProject(t);
  const report = makeContaminatedReviewReport();
  const reportRel = 'reviews/ch2-review-v1.json';
  fs.mkdirSync(path.join(root, 'reviews'), {recursive: true});
  fs.writeFileSync(path.join(root, reportRel), JSON.stringify(report, null, 2));

  const card = buildRevisionCard(root, reportRel, {chapterNumber: 2});

  // 100% of all 3 preserveStrengths original quotes retained verbatim
  assert.equal(card.preservedStrengthsCount, 3);
  for (const s of report.p1.preserveStrengths) {
    assert.ok(card.markdown.includes(s.quote), `Missing preserveStrengths quote: ${s.quote}`);
  }

  // ONLY the 2 open mandatory blocking issues appear (MINOR, SUGGESTION, legal MAJOR/B/fix_in_arc, resolved all excluded)
  assert.equal(card.blockingGuidanceCount, 2);
  assert.ok(card.markdown.includes('沈青河腰袋里只有三十六两碎银'));
  assert.ok(card.markdown.includes('本章始终维持沈青河限知视角'));

  // Strict whitelist: 0 leak of reverseDefense, preserveStrengths.reason, issue.quote, issue.reason, issue.suggestion, or non-blocking items
  const mustNotLeak = [
    'SENTINEL_REVERSE_DEFENSE_ALPHA',
    '绝不可泄露给写手的反方辩护论证文本',
    'SENTINEL_REVERSE_DEFENSE_BETA',
    '另一段反方自证原话',
    'reverseDefense',
    'REVIEWER_STRENGTH_REASON_ALPHA',
    'REVIEWER_STRENGTH_REASON_BETA',
    'REVIEWER_STRENGTH_REASON_GAMMA',
    'ISSUE_QUOTE_ONE',
    'ISSUE_QUOTE_TWO',
    'REVIEWER_REASON_ONE',
    'REVIEWER_REASON_TWO',
    'REVIEWER_SUGGESTION_ONE',
    'REVIEWER_SUGGESTION_TWO',
    '炉火忽明忽暗',
    '铁铺外飘来一阵雨丝',
    '远期卷内伏笔',
    '已解决的阻断项',
  ];
  for (const forbidden of mustNotLeak) {
    assert.equal(card.markdown.includes(forbidden), false, `Revision Card leaked non-whitelisted field: ${forbidden}`);
  }

  // Negative Fail-Closed tests (B1 & B3):
  // 1. Open blocking issue missing narrativeGuidance MUST fail closed (NO fallback to reason/suggestion)
  assert.throws(() => compileRevisionCard({
    decision: 'revise',
    strengths: ['开篇三句落笔极稳。'],
    issues: [{
      severity: 'MAJOR', status: 'open', chapter: 2, classification: 'A', disposition: 'fix_now',
      quote: '他转身走出门外。', reason: '不应回退透传的理由', suggestion: '不应回退透传的建议',
    }],
  }, {chapterNumber: 2}), /REVISION_CARD_NARRATIVE_GUIDANCE_REQUIRED/);

  // 2. Issue missing status MUST fail closed (NO fail-open)
  assert.throws(() => compileRevisionCard({
    decision: 'revise',
    issues: [{severity: 'BLOCKER', chapter: 2, narrativeGuidance: '说明'}],
  }, {chapterNumber: 2}), /REVISION_CARD_ISSUE_STATUS_MISSING_OR_INVALID/);

  // 3. Issue with invalid severity MUST fail closed
  assert.throws(() => compileRevisionCard({
    decision: 'revise',
    issues: [{severity: 'CRITICAL', status: 'open', chapter: 2, narrativeGuidance: '说明'}],
  }, {chapterNumber: 2}), /REVISION_CARD_ISSUE_SEVERITY_INVALID/);

  // 4. Full P0-1 S1 severity x classification x disposition contract (B1) — ALL contradictory/incomplete R3 combinations MUST Fail-Closed
  const illegalR3Issues = [
    // BLOCKER illegal downgrades / invalid classification or disposition
    {
      issue: {severity: 'BLOCKER', status: 'open', classification: 'A', disposition: 'fix_in_arc', blocking: true},
      err: /REVISION_CARD_ILLEGAL_BLOCKER_DOWNGRADE/,
    },
    {
      issue: {severity: 'BLOCKER', status: 'open', classification: 'A', disposition: 'fix_now', blocking: false, mustCloseInReReview: false},
      err: /REVISION_CARD_ILLEGAL_BLOCKER_DOWNGRADE/,
    },
    {
      issue: {severity: 'BLOCKER', status: 'accepted', classification: 'A', disposition: 'fix_now'},
      err: /REVISION_CARD_ILLEGAL_BLOCKER_DOWNGRADE/,
    },
    {
      issue: {severity: 'BLOCKER', status: 'open', classification: 'B', disposition: 'fix_now'},
      err: /REVISION_CARD_ILLEGAL_BLOCKER_DOWNGRADE/,
    },
    // MAJOR illegal classifications (C / blank) & illegal deferrals / downgrades
    {
      issue: {severity: 'MAJOR', status: 'open', classification: 'C', disposition: 'fix_now', narrativeGuidance: '说明'},
      err: /REVISION_CARD_ILLEGAL_MAJOR_CLASSIFICATION/,
    },
    {
      issue: {severity: 'MAJOR', status: 'open', classification: 'blank', disposition: 'keep_as_blank'},
      err: /REVISION_CARD_ILLEGAL_MAJOR_CLASSIFICATION/,
    },
    {
      issue: {severity: 'MAJOR', status: 'open', classification: 'A', disposition: 'fix_in_arc'},
      err: /REVISION_CARD_ILLEGAL_MAJOR_DOWNGRADE/,
    },
    {
      issue: {severity: 'MAJOR', status: 'open', classification: 'A', disposition: 'fix_now', blocking: false},
      err: /REVISION_CARD_ILLEGAL_MAJOR_DOWNGRADE/,
    },
    {
      issue: {severity: 'MAJOR', status: 'open', classification: 'A', disposition: 'fix_now', mustCloseInReReview: false},
      err: /REVISION_CARD_ILLEGAL_MAJOR_DOWNGRADE/,
    },
    {
      issue: {severity: 'MAJOR', status: 'open', classification: 'B', disposition: 'defer_to_final'},
      err: /REVISION_CARD_ILLEGAL_MAJOR_DOWNGRADE/,
    },
    {
      issue: {severity: 'MAJOR', status: 'accepted', classification: 'A', disposition: 'fix_now'},
      err: /REVISION_CARD_ILLEGAL_MAJOR_DOWNGRADE/,
    },
    // MINOR illegal downgrades of classification A / B or illegal blocking override
    {
      issue: {severity: 'MINOR', status: 'open', classification: 'A', disposition: 'defer_to_final', blocking: false, mustCloseInReReview: false},
      err: /REVISION_CARD_ILLEGAL_MINOR_CLASSIFICATION/,
    },
    {
      issue: {severity: 'MINOR', status: 'open', classification: 'B', disposition: 'defer_to_final'},
      err: /REVISION_CARD_ILLEGAL_MINOR_CLASSIFICATION/,
    },
    {
      issue: {severity: 'MINOR', status: 'open', classification: 'C', disposition: 'fix_in_arc'},
      err: /REVISION_CARD_ILLEGAL_MINOR_DISPOSITION/,
    },
    {
      issue: {severity: 'MINOR', status: 'open', classification: 'C', disposition: 'defer_to_final', mustCloseInReReview: true},
      err: /REVISION_CARD_ILLEGAL_NONBLOCKING_OVERRIDE/,
    },
    // SUGGESTION illegal classification A / B or illegal blocking/fix_now override
    {
      issue: {severity: 'SUGGESTION', status: 'open', classification: 'A', disposition: 'advisory'},
      err: /REVISION_CARD_ILLEGAL_SUGGESTION_CLASSIFICATION/,
    },
    {
      issue: {severity: 'SUGGESTION', status: 'open', classification: 'B', disposition: 'advisory'},
      err: /REVISION_CARD_ILLEGAL_SUGGESTION_CLASSIFICATION/,
    },
    {
      issue: {severity: 'SUGGESTION', status: 'open', classification: 'C', disposition: 'fix_now'},
      err: /REVISION_CARD_ILLEGAL_NONBLOCKING_OVERRIDE/,
    },
    {
      issue: {severity: 'SUGGESTION', status: 'open', blocking: true},
      err: /REVISION_CARD_ILLEGAL_NONBLOCKING_OVERRIDE/,
    },
    // Incomplete R3/P1 issues (missing required classification or disposition in R3 report MUST NOT silently fall back to legacy!)
    {
      issue: {severity: 'MAJOR', status: 'open', disposition: 'fix_in_arc'},
      err: /REVISION_CARD_R3_CLASSIFICATION_REQUIRED_OR_INVALID/,
    },
    {
      issue: {severity: 'MAJOR', status: 'open', classification: 'A', narrativeGuidance: '缺 disposition'},
      err: /REVISION_CARD_R3_DISPOSITION_REQUIRED_OR_INVALID/,
    },
    {
      issue: {severity: 'MINOR', status: 'open', disposition: 'defer_to_final'},
      err: /REVISION_CARD_R3_CLASSIFICATION_REQUIRED_OR_INVALID/,
    },
    // causal_break MUST be classification A (matches r3_p1_common.mjs)
    {
      issue: {severity: 'MINOR', status: 'open', classification: 'C', disposition: 'defer_to_final', evidenceLevel: 'causal_break'},
      err: /REVISION_CARD_ILLEGAL_CAUSAL_BREAK/,
    },
    {
      issue: {severity: 'SUGGESTION', status: 'open', classification: 'advisory', disposition: 'advisory', evidenceLevel: 'causal_break'},
      err: /REVISION_CARD_ILLEGAL_CAUSAL_BREAK/,
    },
  ];
  for (const {issue, err} of illegalR3Issues) {
    assert.throws(
      () => compileRevisionCard({decision: 'revise', issues: [issue]}, {chapterNumber: 2}),
      err,
      `Expected Fail-Closed throw for illegal issue: ${JSON.stringify(issue)}`,
    );
  }
  // Incomplete R3 report carrying report.p1 MUST also reject an issue missing classification/disposition
  assert.throws(() => compileRevisionCard({
    decision: 'revise',
    p1: {schemaVersion: 1, preserveStrengths: []},
    issues: [{severity: 'MINOR', status: 'open'}],
  }, {chapterNumber: 2}), /REVISION_CARD_R3_CLASSIFICATION_REQUIRED_OR_INVALID/);

  // B1-a: non-boolean blocking / mustCloseInReReview MUST Fail-Closed (both R3/P1 and legacy_r2)
  const nonBoolBlockingCases = [
    {
      report: {p1: {preserveStrengths: []}, issues: [{severity: 'SUGGESTION', status: 'open', blocking: 'true'}]},
      err: /REVISION_CARD_ISSUE_BLOCKING_TYPE_INVALID/,
    },
    {
      report: {p1: {preserveStrengths: []}, issues: [{severity: 'MINOR', status: 'open', classification: 'C', disposition: 'defer_to_final', mustCloseInReReview: 1}]},
      err: /REVISION_CARD_ISSUE_MUST_CLOSE_TYPE_INVALID/,
    },
    {
      report: {p1: {preserveStrengths: []}, issues: [{severity: 'MINOR', status: 'open', classification: 'C', disposition: 'defer_to_final', blocking: null}]},
      err: /REVISION_CARD_ISSUE_BLOCKING_TYPE_INVALID/,
    },
    {
      report: {p1: {preserveStrengths: []}, issues: [{severity: 'SUGGESTION', status: 'open', blocking: 0}]},
      err: /REVISION_CARD_ISSUE_BLOCKING_TYPE_INVALID/,
    },
    {
      report: {p1: {preserveStrengths: []}, issues: [{severity: 'BLOCKER', status: 'open', classification: 'A', disposition: 'fix_now', blocking: 'false', narrativeGuidance: '说明'}]},
      err: /REVISION_CARD_ISSUE_BLOCKING_TYPE_INVALID/,
    },
    {
      report: {decision: 'revise', issues: [{severity: 'MINOR', status: 'open', mustCloseInReReview: 'no'}]},
      err: /REVISION_CARD_ISSUE_MUST_CLOSE_TYPE_INVALID/,
    },
  ];
  for (const {report: badBoolReport, err} of nonBoolBlockingCases) {
    assert.throws(
      () => compileRevisionCard(badBoolReport, {chapterNumber: 2}),
      err,
      `Expected Fail-Closed throw for non-boolean flag: ${JSON.stringify(badBoolReport)}`,
    );
  }

  // B1-b: explicit malformed p1 property (null / false / 0 / '' / string / array / undefined / bad preserveStrengths) MUST Fail-Closed
  const malformedP1Values = [null, false, true, 0, 123, '', 'v1', [], undefined];
  for (const badP1 of malformedP1Values) {
    assert.throws(
      () => compileRevisionCard({
        schemaVersion: 1,
        p1: badP1,
        decision: 'revise',
        issues: [{severity: 'MAJOR', status: 'accepted', acceptanceReason: '暂不处理'}],
      }, {chapterNumber: 2}),
      /REVISION_CARD_P1_INVALID/,
      `Expected REVISION_CARD_P1_INVALID for explicit p1=${String(badP1)}`,
    );
  }
  assert.throws(() => compileRevisionCard({
    p1: {preserveStrengths: 'not-an-array'},
    decision: 'pass_candidate',
    issues: [],
  }, {chapterNumber: 2}), /REVISION_CARD_P1_STRENGTHS_NOT_ARRAY/);

  // 5. Explicit R3/P1 legal non-blocking / resolved / arc-deferred (with legal boolean false flags) are cleanly skipped
  const nonBlockingCard = compileRevisionCard({
    decision: 'pass_candidate',
    p1: {schemaVersion: 1, preserveStrengths: [{id: 'STR-NB', status: 'observed', chapter: 2, quote: '开篇三句落笔极稳，人物气口准确。'}]},
    issues: [
      {severity: 'BLOCKER', status: 'resolved', classification: 'A', disposition: 'fix_now', blocking: true, mustCloseInReReview: true},
      {severity: 'MAJOR', status: 'resolved', classification: 'A', disposition: 'fix_now', blocking: true, mustCloseInReReview: true},
      {severity: 'MAJOR', status: 'open', classification: 'B', disposition: 'fix_in_arc', blocking: false, mustCloseInReReview: false},
      {severity: 'MINOR', status: 'open', chapter: 2, classification: 'C', disposition: 'defer_to_final', blocking: false, mustCloseInReReview: false},
      {severity: 'SUGGESTION', status: 'open', chapter: 2, classification: 'advisory', disposition: 'advisory', blocking: false, mustCloseInReReview: false},
    ],
  }, {chapterNumber: 2});
  assert.equal(nonBlockingCard.reportMode, 'r3_p1');
  assert.equal(nonBlockingCard.preservedStrengthsCount, 1);
  assert.equal(nonBlockingCard.blockingGuidanceCount, 0);
  assert.ok(nonBlockingCard.markdown.includes('开篇三句落笔极稳，人物气口准确。'));

  // 6. Explicit Legacy R2 compatibility path (absent p1 and no P1 fields on any issue; legal boolean flags still supported)
  const legacyR2Card = compileRevisionCard({
    schemaVersion: 1,
    decision: 'revise',
    strengths: ['旧版R2亮点原句——  保留原始双空格与破折号。'],
    issues: [
      {severity: 'MAJOR', status: 'open', chapter: 2, blocking: true, narrativeGuidance: '旧版兼容路径下请修正人物入场顺序。'},
      {severity: 'MAJOR', status: 'accepted', chapter: 2},
      {severity: 'MINOR', status: 'open', chapter: 2, blocking: false, mustCloseInReReview: false},
    ],
  }, {chapterNumber: 2});
  assert.equal(legacyR2Card.reportMode, 'legacy_r2');
  assert.equal(legacyR2Card.blockingGuidanceCount, 1);
  assert.ok(legacyR2Card.markdown.includes('旧版R2亮点原句——  保留原始双空格与破折号。'));

  // 7. preserveStrengths verbatim fidelity & Fail-Closed rejection of contaminated quotes (B3)
  const exactQuote = '风箱拉到第三下——  炭火猛地蹿起半尺青焰。';
  const verbatimStrengthCard = compileRevisionCard({
    decision: 'pass_candidate',
    p1: {
      schemaVersion: 1,
      preserveStrengths: [{id: 'STR-V', status: 'observed', chapter: 2, quote: exactQuote, reason: '不应输出'}],
    },
    issues: [],
  }, {chapterNumber: 2});
  assert.equal(verbatimStrengthCard.preservedQuotes[0], exactQuote);
  assert.ok(verbatimStrengthCard.markdown.includes(`原句：“${exactQuote}”`), 'Clean preserveStrengths quote must survive 100% verbatim without whitespace normalization');

  // Contaminated preserveStrengths quote (object & legacy string) MUST Fail-Closed rather than being silently mutated
  assert.throws(() => compileRevisionCard({
    decision: 'pass_candidate',
    p1: {
      schemaVersion: 1,
      preserveStrengths: [{id: 'STR-BAD', status: 'observed', chapter: 2, quote: '[F-012 | ch2 | established] 炭火猛地蹿起。'}],
    },
    issues: [],
  }, {chapterNumber: 2}), /WRITER_FIREWALL_GOVERNANCE_LEAK/);

  assert.throws(() => compileRevisionCard({
    decision: 'pass_candidate',
    strengths: ['包含 SHA-256 的污染亮点原句'],
    issues: [],
  }, {chapterNumber: 2}), /WRITER_FIREWALL_GOVERNANCE_LEAK/);
});

// ============================================================================
// Performance (< 200ms), read-only safety & CLI end-to-end integration checks
// ============================================================================
test('P0-2 Performance & CLI: single-chapter brief + revision card compile in < 200ms with clean CLI JSON & --out support', t => {
  const root = createContaminatedProject(t);
  const reportRel = 'reviews/ch2-review-v1.json';
  fs.mkdirSync(path.join(root, 'reviews'), {recursive: true});
  fs.writeFileSync(path.join(root, reportRel), JSON.stringify(makeContaminatedReviewReport(), null, 2));

  const t0 = performance.now();
  const brief = buildWriterBrief(root, 2);
  const card = buildRevisionCard(root, reportRel, {chapterNumber: 2});
  const totalMs = performance.now() - t0;
  assert.ok(brief.durationMs < 200, `Writer Brief compilation took ${brief.durationMs}ms >= 200ms`);
  assert.ok(card.durationMs < 200, `Revision Card compilation took ${card.durationMs}ms >= 200ms`);
  assert.ok(totalMs < 200, `Combined compilation took ${totalMs.toFixed(2)}ms >= 200ms`);

  const briefCli = runCli('build_writer_brief', root, '--chapter', '2', '--out', 'briefs/ch2-brief.md', '--json');
  assert.equal(briefCli.code, 0, JSON.stringify(briefCli.out));
  assert.equal(briefCli.out.status, 'ok');
  assert.equal(briefCli.out.purity.pure, true);
  assert.equal(briefCli.out.purity.governanceCount, 0);
  assert.equal(briefCli.out.purity.timePressureCount, 0);
  assert.ok(briefCli.out.durationMs < 200);
  assert.equal(fs.readFileSync(path.join(root, 'briefs/ch2-brief.md'), 'utf8'), briefCli.out.markdown);

  const cardCli = runCli('build_revision_card', root, '--report', reportRel, '--chapter', '2', '--out', 'briefs/ch2-revision.md', '--json');
  assert.equal(cardCli.code, 0, JSON.stringify(cardCli.out));
  assert.equal(cardCli.out.status, 'ok');
  assert.equal(cardCli.out.preservedStrengthsCount, 3);
  assert.equal(cardCli.out.blockingGuidanceCount, 2);
  assert.equal(cardCli.out.purity.pure, true);
  assert.ok(cardCli.out.durationMs < 200);
  assert.equal(fs.readFileSync(path.join(root, 'briefs/ch2-revision.md'), 'utf8'), cardCli.out.markdown);

  // Path traversal guard on --out must fail closed
  const badOut = runCli('build_writer_brief', root, '--chapter', '2', '--out', '../escape.md', '--json');
  assert.equal(badOut.code, 2);
  assert.match(badOut.out.error, /OUT_OUTSIDE_PROJECT/);

  // Read-only safety: invoking compiler without --out does not mutate project directory
  const rootRO = createContaminatedProject(t);
  fs.rmSync(path.join(rootRO, 'story-ledger.json'));
  const beforeFiles = fs.readdirSync(rootRO).sort();
  const ch1NoLedger = buildWriterBrief(rootRO, 1);
  assert.equal(ch1NoLedger.purity.pure, true);
  assert.equal(ch1NoLedger.tailCheck.last, BRIEF_STYLE_HEADING);
  assert.deepEqual(fs.readdirSync(rootRO).sort(), beforeFiles);
});
