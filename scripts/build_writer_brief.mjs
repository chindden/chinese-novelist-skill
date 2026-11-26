#!/usr/bin/env node
/**
 * P0-2: Pure Narrative Writer Brief Compiler (纯叙事写手任务卡编译器).
 *
 * Reads character profiles, chapter outline, story ledger, style benchmark, and
 * previous chapter ending, then deterministically compiles a governance-free,
 * time-pressure-free pure narrative Writer Brief (< 200ms).
 *
 * Enforces mandatory tail section ordering (03 §2.1 & PRD P0-2):
 *   Penultimate H2: ## 本书文风锚点示范
 *   Final H2 (last): ## 上一章结尾原文 (500-900 chars when available)
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {projectRoot, readPlan, readJsonFile, safeFile} from './v3_common.mjs';
import {
  BRIEF_STYLE_HEADING,
  BRIEF_PREV_TAIL_HEADING,
  nonempty,
  assertNoTimePressure,
  sanitizeNarrativeText,
  extractPreviousChapterTail,
  assertWriterBriefTailOrder,
  assertWriterContextPurity,
} from './r3_writer_firewall.mjs';

function extractH2Section(md, headingText) {
  const lines = md.split(/\r?\n/);
  let start = -1;
  let end = lines.length;
  for (let i = 0; i < lines.length; i++) {
    if (/^##\s+/.test(lines[i])) {
      if (start < 0 && lines[i].replace(/^##\s+/, '').trim() === headingText) {
        start = i + 1;
      } else if (start >= 0) {
        end = i;
        break;
      }
    }
  }
  return start >= 0 ? lines.slice(start, end).join('\n').trim() : '';
}

function extractSubsectionsMatching(md, regex) {
  const lines = md.split(/\r?\n/);
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^(#{3,5})\s+(.*)$/);
    if (m && regex.test(m[2])) {
      const level = m[1].length;
      let j = i + 1;
      while (j < lines.length) {
        const next = lines[j].match(/^(#{1,6})\s+/);
        if (next && next[1].length <= level) break;
        j++;
      }
      out.push(lines.slice(i, j).join('\n').trim());
      i = j - 1;
    }
  }
  return out;
}

function extractChapterOutline(outlineMd, chapterNumber) {
  const lines = outlineMd.split(/\r?\n/);
  const re = new RegExp(`^(#{3,6})\\s+第\\s*${chapterNumber}\\s*章(.*)$`);
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(re);
    if (!m) continue;
    const level = m[1].length;
    let j = i + 1;
    while (j < lines.length) {
      const next = lines[j].match(/^(#{1,6})\s+/);
      if (next && next[1].length <= level) break;
      j++;
    }
    // Strip the raw heading marker and normalize subsection content to plain narrative bullets/text
    return lines.slice(i + 1, j).join('\n').trim();
  }
  return '';
}

function demoteH2(text) {
  // Prevent any embedded "## " heading from interfering with Writer Brief top-level H2 tail order
  return text.replace(/^##(\s+)/gm, '###$1');
}

function extractStyleAnchorProse(styleMd) {
  const parts = [];
  const calibration = extractH2Section(styleMd, '本书校准段落');
  const demoH3s = extractSubsectionsMatching(styleMd, /示范|样例|锚点|紧张|舒缓|高潮|对话|校准/)
    .filter(h => !calibration || !calibration.includes(h));
  if (demoH3s.length > 0) {
    parts.push(...demoH3s);
  }
  if (calibration) {
    parts.push(calibration);
  }
  if (parts.length === 0) {
    const strippedTop = styleMd.replace(/^#\s+[^\n]*\n?/, '').trim();
    parts.push(strippedTop);
  }
  return demoteH2(sanitizeNarrativeText(parts.join('\n\n'), {sourceLabel: '03-文风基准.md'}));
}

function extractActiveLedgerNarrative(root, uptoChapter) {
  const lp = safeFile(root, 'story-ledger.json');
  if (!lp) {
    return {
      asOf: null,
      characterKnowledge: [],
      relationships: [],
      establishedFacts: [],
      characterBeliefs: [],
      openForeshadowing: [],
      recentEvents: [],
    };
  }
  const ledger = readJsonFile(root, 'story-ledger.json');
  const visibleFacts = (ledger.facts || []).filter(
    f => f && Number.isSafeInteger(f.chapter) && f.chapter <= uptoChapter
  );
  const visibleIds = new Set(visibleFacts.map(f => f.id));
  const activeFacts = visibleFacts.filter(
    f => f.kind !== 'provisional' && !(f.supersededBy && visibleIds.has(f.supersededBy))
  );

  const establishedFacts = activeFacts
    .filter(f => f.kind === 'established')
    .map(f => {
      const subject = sanitizeNarrativeText(String(f.subject || ''), {sourceLabel: 'ledger.fact.subject'});
      const key = sanitizeNarrativeText(String(f.key || ''), {sourceLabel: 'ledger.fact.key'});
      const value = sanitizeNarrativeText(String(f.value || ''), {sourceLabel: 'ledger.fact.value'});
      return {subject, key, value};
    })
    .filter(f => f.subject || f.key || f.value);

  const characterBeliefs = activeFacts
    .filter(f => f.kind === 'character-belief')
    .map(f => ({
      subject: sanitizeNarrativeText(String(f.subject || ''), {sourceLabel: 'ledger.belief.subject'}),
      key: sanitizeNarrativeText(String(f.key || ''), {sourceLabel: 'ledger.belief.key'}),
      value: sanitizeNarrativeText(String(f.value || ''), {sourceLabel: 'ledger.belief.value'}),
    }))
    .filter(f => f.subject || f.value);

  const relationships = (ledger.relationships || [])
    .filter(r => r && Number.isSafeInteger(r.chapter) && r.chapter <= uptoChapter)
    .map(r => ({
      characters: Array.isArray(r.characters)
        ? r.characters.map(c => sanitizeNarrativeText(String(c), {sourceLabel: 'ledger.relationship.character'}))
        : [],
      change: sanitizeNarrativeText(String(r.change || ''), {sourceLabel: 'ledger.relationship.change'}),
      consequence: sanitizeNarrativeText(String(r.consequence || ''), {sourceLabel: 'ledger.relationship.consequence'}),
    }))
    .filter(r => r.characters.length > 0 && (r.change || r.consequence));

  const handoffs = (ledger.handoffs || [])
    .filter(h => h && Number.isSafeInteger(h.chapter) && h.chapter <= uptoChapter)
    .sort((a, b) => a.chapter - b.chapter);
  const latestHandoff = handoffs.length > 0 ? handoffs[handoffs.length - 1] : null;

  const characterKnowledge = [];
  for (const h of handoffs) {
    for (const k of h.knowledge || []) {
      const character = sanitizeNarrativeText(String(k?.character || ''), {sourceLabel: 'ledger.knowledge.character'});
      const change = sanitizeNarrativeText(String(k?.change || ''), {sourceLabel: 'ledger.knowledge.change'});
      if (character && change) characterKnowledge.push({character, change});
    }
  }

  const recentEvents = latestHandoff && Array.isArray(latestHandoff.events)
    ? latestHandoff.events
        .map(e => ({
          when: sanitizeNarrativeText(String(e?.when || ''), {sourceLabel: 'ledger.handoff.when'}),
          event: sanitizeNarrativeText(String(e?.event || ''), {sourceLabel: 'ledger.handoff.event'}),
        }))
        .filter(e => e.event)
    : [];

  const openForeshadowing = (ledger.foreshadowing || [])
    .filter(f => f && Number.isSafeInteger(f.chapter) && f.chapter <= uptoChapter && f.status === 'open')
    .map(f => sanitizeNarrativeText(String(f.description || ''), {sourceLabel: 'ledger.foreshadowing'}))
    .filter(Boolean);

  return {
    asOf: latestHandoff?.asOf ? sanitizeNarrativeText(String(latestHandoff.asOf), {sourceLabel: 'ledger.handoff.asOf'}) : null,
    characterKnowledge,
    relationships,
    establishedFacts,
    characterBeliefs,
    openForeshadowing,
    recentEvents,
  };
}

function safeOutPath(root, relOut) {
  const resolved = path.resolve(root, relOut);
  const rel = path.relative(root, resolved);
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error('WRITER_BRIEF_OUT_OUTSIDE_PROJECT');
  }
  return resolved;
}

function parseChapterNumberToken(token) {
  if (!token) return null;
  if (/^\d+$/.test(token)) return Number(token);
  const digits = {'零': 0, '〇': 0, '一': 1, '二': 2, '两': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9};
  const units = {'十': 10, '百': 100, '千': 1000};
  let total = 0;
  let current = 0;
  let sawAny = false;
  for (const ch of token) {
    if (ch in digits) {
      current = digits[ch];
      sawAny = true;
    } else if (ch in units) {
      const u = units[ch];
      total += (current === 0 ? 1 : current) * u;
      current = 0;
      sawAny = true;
    } else {
      return null;
    }
  }
  if (!sawAny) return null;
  return total + current;
}

function filterFutureSubsections(sectionMd, chapterNumber) {
  if (!sectionMd) return '';
  const lines = sectionMd.split(/\r?\n/);
  const out = [];
  let skipUntilLevel = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(/^(#{3,6})\s+(.*)$/);
    if (m) {
      const level = m[1].length;
      const title = m[2].trim();
      if (skipUntilLevel > 0 && level <= skipUntilLevel) {
        skipUntilLevel = 0;
      }
      if (skipUntilLevel === 0) {
        const chMatch = title.match(/第\s*([0-9零〇一二两三四五六七八九十百千]+)\s*章/);
        const parsedCh = chMatch ? parseChapterNumberToken(chMatch[1]) : null;
        const isFutureChapter = parsedCh !== null && parsedCh > chapterNumber;
        const isFutureArc = /(?:远期弧线|远期规划|后期弧线|后续弧线|后续章节|结局规划|终局|伏笔揭晓)/.test(title);
        if (isFutureChapter || isFutureArc) {
          skipUntilLevel = level;
          continue;
        }
      }
    }
    if (skipUntilLevel === 0) {
      out.push(line);
    }
  }
  return out.join('\n').trim();
}

/**
 * Deterministically compile a Pure Narrative Writer Brief for a given chapter.
 */
export function buildWriterBrief(rootDir, chapterNumber, {extraDirectives = '', minTailChars = 500, maxTailChars = 900} = {}) {
  const t0 = performance.now();
  if (!Number.isSafeInteger(chapterNumber) || chapterNumber < 1) {
    throw new Error('WRITER_BRIEF_INVALID_CHAPTER');
  }
  if (extraDirectives) assertNoTimePressure(extraDirectives, 'extraDirectives');

  const root = projectRoot(rootDir);
  const plan = readPlan(root);
  const entry = (plan.chapters || []).find(c => c.chapterNumber === chapterNumber);
  if (!entry) throw new Error('WRITER_BRIEF_CHAPTER_NOT_IN_PLAN_' + chapterNumber);

  const charsPath = safeFile(root, '00-人物档案.md');
  const outlinePath = safeFile(root, '01-大纲.md');
  const stylePath = safeFile(root, '03-文风基准.md');
  if (!charsPath) throw new Error('WRITER_BRIEF_MISSING_00_CHARACTERS');
  if (!outlinePath) throw new Error('WRITER_BRIEF_MISSING_01_OUTLINE');
  if (!stylePath) throw new Error('WRITER_BRIEF_MISSING_03_STYLE');

  const charsMd = fs.readFileSync(charsPath, 'utf8');
  const outlineMd = fs.readFileSync(outlinePath, 'utf8');
  const styleMd = fs.readFileSync(stylePath, 'utf8');

  const ledgerInfo = extractActiveLedgerNarrative(root, chapterNumber - 1);

  // 1. Chapter outline & story beats (strictly scoped to current chapterNumber)
  const coreContractSection = extractH2Section(outlineMd, '核心契约');
  const chapterBeatRaw = extractChapterOutline(outlineMd, chapterNumber);
  const coreContractRaw = coreContractSection || filterFutureSubsections(outlineMd.replace(/^#\s+[^\n]*\n?/, ''), chapterNumber).slice(0, 1200);
  const chapterTitle = sanitizeNarrativeText(String(entry.title || ''), {sourceLabel: 'plan.chapter.title'});
  const novelName = sanitizeNarrativeText(String(plan.novelName || path.basename(root)), {sourceLabel: 'plan.novelName'});

  const outlineSectionLines = ['## 本章故事脉络与细纲'];
  if (chapterTitle) outlineSectionLines.push(`- 本章暂定题名：${chapterTitle}`);
  if (ledgerInfo.asOf) outlineSectionLines.push(`- 承接时间点：${ledgerInfo.asOf}`);
  if (chapterBeatRaw) {
    outlineSectionLines.push(demoteH2(sanitizeNarrativeText(chapterBeatRaw, {sourceLabel: '01-大纲.md'})));
  } else {
    outlineSectionLines.push(demoteH2(sanitizeNarrativeText(coreContractRaw, {sourceLabel: '01-大纲.md'})));
  }
  if (ledgerInfo.recentEvents.length > 0) {
    outlineSectionLines.push('### 上一章刚发生的关键事件');
    for (const ev of ledgerInfo.recentEvents) {
      outlineSectionLines.push(ev.when ? `- ${ev.when}：${ev.event}` : `- ${ev.event}`);
    }
  }
  if (nonempty(extraDirectives)) {
    const cleanExtra = sanitizeNarrativeText(extraDirectives, {sourceLabel: 'extraDirectives'});
    if (cleanExtra) outlineSectionLines.push(`- 叙事侧重：${cleanExtra}`);
  }

  // 2. Characters, relationships, and knowledge boundaries (filter future-chapter / far-arc spoilers across ALL character sections)
  const rawCharCore = extractH2Section(charsMd, '核心人设') || charsMd.replace(/^#\s+[^\n]*\n?/, '');
  const charCoreRaw = filterFutureSubsections(rawCharCore, chapterNumber);
  const charRollingRaw = filterFutureSubsections(extractH2Section(charsMd, '动态状态与远期弧线'), chapterNumber);
  const charSectionLines = ['## 当前人物状态与知情边界'];
  const cleanCharCore = demoteH2(sanitizeNarrativeText(charCoreRaw, {sourceLabel: '00-人物档案.md'}));
  if (cleanCharCore) charSectionLines.push(cleanCharCore);
  if (charRollingRaw) {
    const cleanRolling = demoteH2(sanitizeNarrativeText(charRollingRaw, {sourceLabel: '00-人物档案.md'}));
    if (cleanRolling) charSectionLines.push(cleanRolling);
  }
  if (ledgerInfo.relationships.length > 0) {
    charSectionLines.push('### 当前人物关系变化');
    for (const r of ledgerInfo.relationships) {
      charSectionLines.push(`- ${r.characters.join(' 与 ')}：${r.change}${r.consequence ? `（后续影响：${r.consequence}）` : ''}`);
    }
  }
  if (ledgerInfo.characterBeliefs.length > 0 || ledgerInfo.characterKnowledge.length > 0) {
    charSectionLines.push('### 人物认知与知情边界');
    for (const b of ledgerInfo.characterBeliefs) {
      charSectionLines.push(`- ${b.subject}对“${b.key}”的当前认知：${b.value}`);
    }
    for (const k of ledgerInfo.characterKnowledge) {
      charSectionLines.push(`- ${k.character}已知情变化：${k.change}`);
    }
  }

  // 3. Hard facts, numbers, anchors, and open foreshadowing
  //    Only scan book-level stable core baseline (## 核心契约), NEVER global rolling volume/future chapters!
  const stableBaselineSource = coreContractSection || '';
  const timelineSubs = stableBaselineSource
    ? extractSubsectionsMatching(stableBaselineSource, /时间线|经济|核算|底账|物品|道具/)
    : [];
  const factSectionLines = ['## 核心事实与数字底账'];
  if (ledgerInfo.establishedFacts.length > 0) {
    for (const f of ledgerInfo.establishedFacts) {
      factSectionLines.push(`- ${f.subject} · ${f.key}：${f.value}`);
    }
  }
  if (timelineSubs.length > 0) {
    const cleanTimeline = demoteH2(sanitizeNarrativeText(timelineSubs.join('\n\n'), {sourceLabel: '01-大纲.md'}));
    if (cleanTimeline) factSectionLines.push(cleanTimeline);
  }
  if (ledgerInfo.openForeshadowing.length > 0) {
    factSectionLines.push('### 尚未回收的伏笔线索');
    for (const desc of ledgerInfo.openForeshadowing) {
      factSectionLines.push(`- ${desc}`);
    }
  }
  if (factSectionLines.length === 1) {
    factSectionLines.push('- 遵循前文已确立的人物处境、时间顺序与物品数量，保持前后一致。');
  }

  // 4. Penultimate H2 (倒数第二部分): Book style benchmark prose anchors
  const styleAnchorProse = extractStyleAnchorProse(styleMd);
  if (!styleAnchorProse) throw new Error('WRITER_BRIEF_STYLE_ANCHOR_EMPTY');
  const styleSection = `${BRIEF_STYLE_HEADING}\n\n${styleAnchorProse}`;

  // 5. Final H2 (最后一部分 / 最末位): Previous chapter VERBATIM ending (strictly 500-900 chars, Fail-Closed, never silently mutated)
  let prevTail = '';
  let hasPrevChapter = false;
  if (chapterNumber > 1) {
    const prevEntry = (plan.chapters || []).find(c => c.chapterNumber === chapterNumber - 1);
    const prevFile = prevEntry ? safeFile(root, prevEntry.filePath) : null;
    if (!prevFile) {
      throw new Error('WRITER_BRIEF_PREV_CHAPTER_MISSING_' + (chapterNumber - 1));
    }
    const rawPrev = fs.readFileSync(prevFile, 'utf8');
    const rawTail = extractPreviousChapterTail(rawPrev, {minChars: minTailChars, maxChars: maxTailChars});
    if (/^##\s+/m.test(rawTail)) {
      throw new Error('WRITER_BRIEF_PREV_TAIL_CONTAINS_H2');
    }
    // Fail-Closed purity check on verbatim manuscript tail: reject contaminated prose rather than mutating author text
    assertWriterContextPurity(rawTail);
    prevTail = rawTail;
    hasPrevChapter = true;
  }

  const sections = [
    `# ${novelName} · 第${chapterNumber}章 创作任务卡`,
    outlineSectionLines.join('\n'),
    charSectionLines.join('\n'),
    factSectionLines.join('\n'),
    styleSection,
  ];
  if (hasPrevChapter) {
    sections.push(`${BRIEF_PREV_TAIL_HEADING}\n\n${prevTail}`);
  }

  const markdown = sections.join('\n\n') + '\n';

  // Fail-Closed validations: mandatory tail order + strict 500-900 length + zero governance/time-pressure purity
  const tailCheck = assertWriterBriefTailOrder(markdown, {
    hasPrevChapter,
    minTailChars,
    maxTailChars,
    enforceTailLength: hasPrevChapter,
  });
  const purity = assertWriterContextPurity(markdown);
  const durationMs = Number((performance.now() - t0).toFixed(2));

  return {
    chapterNumber,
    markdown,
    durationMs,
    tailCheck,
    purity,
  };
}

function parseCliArgs(argv) {
  const folder = argv[0];
  let chapter = null;
  let outRel = null;
  let json = false;
  let extra = '';
  for (let i = 1; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json') json = true;
    else if (a === '--chapter') chapter = Number(argv[++i]);
    else if (a === '--out') outRel = argv[++i];
    else if (a === '--extra') extra = argv[++i] ?? '';
    else throw new Error('Usage: build_writer_brief.mjs <project-dir> --chapter <N> [--out <rel-path>] [--extra <text>] [--json]');
  }
  if (!folder || !Number.isSafeInteger(chapter) || chapter < 1) {
    throw new Error('Usage: build_writer_brief.mjs <project-dir> --chapter <N> [--out <rel-path>] [--extra <text>] [--json]');
  }
  return {folder, chapter, outRel, json, extra};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const {folder, chapter, outRel, json, extra} = parseCliArgs(process.argv.slice(2));
    const result = buildWriterBrief(folder, chapter, {extraDirectives: extra});
    let outputPath = null;
    if (outRel) {
      const root = projectRoot(folder);
      const target = safeOutPath(root, outRel);
      fs.mkdirSync(path.dirname(target), {recursive: true});
      fs.writeFileSync(target, result.markdown, 'utf8');
      outputPath = path.relative(root, target);
    }
    if (json) {
      console.log(JSON.stringify({
        status: 'ok',
        chapterNumber: result.chapterNumber,
        durationMs: result.durationMs,
        outputPath,
        tailCheck: result.tailCheck,
        purity: {
          pure: result.purity.pure,
          governanceCount: result.purity.governanceCount,
          timePressureCount: result.purity.timePressureCount,
        },
        markdown: result.markdown,
      }, null, 2));
    } else {
      process.stdout.write(result.markdown);
    }
  } catch (e) {
    console.log(JSON.stringify({status: 'error', error: e.message}));
    process.exitCode = 2;
  }
}
