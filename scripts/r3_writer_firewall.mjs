/**
 * P0-2: Writer Register Firewall (写手语域防火墙).
 *
 * Deterministic compiler & Fail-Closed purity validator separating the creative
 * writing register from governance/engineering metadata:
 *  - Strips engineering ID tags (e.g. [F-012 | ch2 | established]) and governance
 *    metadata while preserving 100% of story hard facts, numbers, and anchors.
 *  - Hard-rejects any time-pressure / rush directives (Fail-Closed).
 *  - Enforces Writer Brief tail section order (03 §2.1 & PRD P0-2):
 *      Penultimate H2: ## 本书文风锚点示范
 *      Final H2 (last): ## 上一章结尾原文 (500-900 chars when available)
 *  - Compiles Pure Narrative Revision Cards preserving 100% of preserveStrengths
 *    original quotes while stripping 100% of reverseDefense and raw review JSON.
 */

export const BRIEF_STYLE_HEADING = '## 本书文风锚点示范';
export const BRIEF_PREV_TAIL_HEADING = '## 上一章结尾原文';

export const GOVERNANCE_PATTERNS = Object.freeze([
  {code: 'GOV_SHA256_LABEL', re: /sha-?256/gi},
  {code: 'GOV_HEX_HASH_64', re: /\b[0-9a-f]{64}\b/gi},
  {code: 'GOV_SCHEMA_VERSION', re: /\bschemaVersion\b/g},
  {code: 'GOV_REVERSE_DEFENSE', re: /\breverseDefense\b/g},
  {code: 'GOV_GATE_CODE_R2', re: /\bR2_[A-Z0-9_]*\b/g},
  {code: 'GOV_GATE_CODE_R3', re: /\bR3_[A-Z0-9_]*\b/g},
  {code: 'GOV_SEVERITY_ENUM', re: /\b(?:BLOCKER|MAJOR|MINOR|SUGGESTION)\b/g},
  {code: 'GOV_DECISION_TOKEN', re: /\b(?:pass_candidate|pass_with_notes|fix_now|fix_in_arc|defer_to_final|keep_as_blank|UNVERIFIED)\b/g},
  {code: 'GOV_INTERNAL_FIELD', re: /\b(?:issueIdentityKey|reviewFingerprint|reviewHistory|manuscriptHashes|p1Protocol|literaryStatus|evidenceLevel|evidenceBasis|impactScope|mustCloseInReReview|dimensionAuditSlots|NEEDS_SEMANTIC_AUDIT|PLANNING_CONFLICT_BLOCK|DIFF_OVER_30PCT)\b/g},
  {code: 'GOV_ENGINEERING_ID_TAG', re: /\[\s*[A-Za-z][A-Za-z0-9_-]*\s*\|\s*ch\d+[^\]]*\]/gi},
  {code: 'GOV_LEDGER_KIND_TAG', re: /\[\s*(?:established|character-belief|provisional)\s*\]/gi},
  {code: 'GOV_INTERNAL_FILE', re: /(?:02-写作计划\.json|story-ledger\.json|reviews\/r3\/[^\s，。；)]*)/gi},
  {code: 'GOV_PROTOCOL_CODE', re: /\b(?:M1\s*[–-]\s*M4|OR[1-7]\s*[–-]\s*OR[1-7]|HL-[1-6])\b/g},
]);

export const TIME_PRESSURE_PATTERNS = Object.freeze([
  {code: 'TIME_FIVE_MINUTES', re: /(?:5\s*分钟|五分钟|5\s*min(?:utes?)?\b|\b5m\b)/gi},
  {code: 'TIME_LIMIT', re: /(?:限时|限期(?:完成|交稿|写完)?|别超时|不要超时|不能超时|严禁超时|切勿超时|勿超时|超时扣分|时间上限|时间限制|\bdeadline\b|\btime\s*limit\b|\btimebox(?:ed|ing)?\b|\bstrict\s*timer\b)/gi},
  {code: 'TIME_RUSH_WORK', re: /(?:赶工|赶写|赶稿|抓紧赶|冲刺交稿|提速赶|压缩(?:写稿|创作|生成)时间|\brush\s*(?:draft|writing|to\s*finish|this\s*chapter)\b|\bhurry\s*(?:up|to\s*finish)\b)/gi},
  {code: 'TIME_COUNTDOWN', re: /(?:倒计时|计时器|掐表|\bcountdown\b|\bclock\s*is\s*ticking\b)/gi},
  {code: 'TIME_HURRY_FINISH', re: /(?:(?:尽快|抓紧|赶紧|立刻|立即|马上|火速|抓紧时间|从速)(?:写完|完成|交稿|出稿|收尾|结束(?:本章|写作)?)|快速(?:写完|完成|交稿|出稿)|(?:\d+|[一二三四五六七八九十两半]+)\s*分钟内(?:写完|完成|交稿|出稿)|\b(?:finish|complete|deliver|write)\s+(?:asap|immediately|right\s+away|quickly|within\s+\d+\s*min(?:utes?)?|in\s+\d+\s*(?:min(?:utes?)?|sec(?:onds?)?))\b|\b(?:within|in)\s+\d+\s*min(?:utes?)?\b|\basap\b)/gi},
]);

export function nonempty(x) {
  return typeof x === 'string' && x.trim().length > 0;
}

/**
 * Scan text for forbidden governance tokens and time-pressure phrases.
 * Returns structured matches without mutating input.
 */
export function scanWriterContextPurity(text) {
  const input = typeof text === 'string' ? text : '';
  const governanceHits = [];
  const timePressureHits = [];

  for (const {code, re} of GOVERNANCE_PATTERNS) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(input)) !== null) {
      governanceHits.push({code, match: m[0], index: m.index});
      if (m[0].length === 0) re.lastIndex++;
    }
  }
  for (const {code, re} of TIME_PRESSURE_PATTERNS) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(input)) !== null) {
      timePressureHits.push({code, match: m[0], index: m.index});
      if (m[0].length === 0) re.lastIndex++;
    }
  }
  return {
    pure: governanceHits.length === 0 && timePressureHits.length === 0,
    governanceCount: governanceHits.length,
    timePressureCount: timePressureHits.length,
    totalViolations: governanceHits.length + timePressureHits.length,
    governanceHits,
    timePressureHits,
  };
}

/**
 * Fail-Closed purity assertion for writer-facing context (Writer Brief & Revision Card).
 * Throws an Error if ANY governance token or time-pressure phrase is detected.
 */
export function assertWriterContextPurity(text) {
  if (typeof text !== 'string' || !text.trim()) {
    throw new Error('WRITER_FIREWALL_EMPTY_OUTPUT');
  }
  const report = scanWriterContextPurity(text);
  if (report.timePressureCount > 0) {
    const sample = report.timePressureHits.slice(0, 5).map(h => `${h.code}:${h.match}`).join(', ');
    const err = new Error(`WRITER_FIREWALL_TIME_PRESSURE_DETECTED: ${sample}`);
    err.code = 'WRITER_FIREWALL_TIME_PRESSURE_DETECTED';
    err.report = report;
    throw err;
  }
  if (report.governanceCount > 0) {
    const sample = report.governanceHits.slice(0, 5).map(h => `${h.code}:${h.match}`).join(', ');
    const err = new Error(`WRITER_FIREWALL_GOVERNANCE_LEAK: ${sample}`);
    err.code = 'WRITER_FIREWALL_GOVERNANCE_LEAK';
    err.report = report;
    throw err;
  }
  return report;
}

/**
 * Fail-Closed check specifically for time-pressure directives injected into inputs.
 * Unlike engineering tags (which are translated/stripped from structured files),
 * time-pressure directives must ALWAYS fail closed.
 */
export function assertNoTimePressure(text, sourceLabel = 'input') {
  if (typeof text !== 'string' || !text) return;
  const hits = [];
  for (const {code, re} of TIME_PRESSURE_PATTERNS) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text)) !== null) {
      hits.push(`${code}:${m[0]}`);
      if (m[0].length === 0) re.lastIndex++;
    }
  }
  if (hits.length > 0) {
    const err = new Error(`WRITER_FIREWALL_TIME_PRESSURE_DETECTED (${sourceLabel}): ${hits.slice(0, 5).join(', ')}`);
    err.code = 'WRITER_FIREWALL_TIME_PRESSURE_DETECTED';
    throw err;
  }
}

const META_KEY_GROUP = '(?:schemaVersion|reverseDefense|issueIdentityKey|reviewFingerprint|reviewHistory|manuscriptHashes|p1Protocol|literaryStatus|evidenceLevel|evidenceBasis|impactScope|mustCloseInReReview|dimensionAuditSlots)';
const META_STRUCTURED_KV_RE = new RegExp(
  `["']?${META_KEY_GROUP}["']?\\s*[:=：]\\s*(?:\\{[^}\\n]*\\}|\\[[^\\]\\n]*\\]|"[^"\\n]*"|'[^'\\n]*')\\s*[,;]?`,
  'gi',
);
const META_SCALAR_KV_RE = new RegExp(
  `["']?${META_KEY_GROUP}["']?\\s*[:=：]\\s*[A-Za-z0-9_./-]+\\s*[,;]?`,
  'gi',
);

/**
 * Deterministically strip governance metadata and engineering ID tags from
 * source text while preserving natural Chinese hard facts, names, dates, and numbers.
 * Time-pressure phrases are NOT silently stripped; they trigger Fail-Closed rejection.
 */
export function sanitizeNarrativeText(text, {sourceLabel = 'text'} = {}) {
  if (typeof text !== 'string') return '';
  assertNoTimePressure(text, sourceLabel);

  let out = text;

  // 1. Remove ONLY identifiable metadata key-value pairs (JSON object/array/quoted string or ASCII scalar),
  //    strictly stopping before Chinese commas/colons/prose so hard story facts are never swallowed.
  out = out.replace(META_STRUCTURED_KV_RE, '');
  out = out.replace(META_SCALAR_KV_RE, '');

  // 2. Remove bracketed engineering ID tags like [F-012 | ch2 | established], [P-003 | ch1 | open], [established]
  out = out.replace(/\[\s*[A-Za-z][A-Za-z0-9_-]*\s*\|\s*ch\d+[^\]]*\]/gi, '');
  out = out.replace(/\[\s*(?:established|character-belief|provisional)\s*\]/gi, '');
  out = out.replace(/[（(]\s*[A-Za-z]-\d+(?:\s*\|\s*[^)）]*)?[)）]/g, '');

  // 3. Remove SHA-256 labels and 64-char hex hashes (including adjacent labels/colons)
  out = out.replace(/(?:sha-?256\s*[:=：]?\s*)?\b[0-9a-f]{64}\b/gi, '');
  out = out.replace(/sha-?256(?:\s*[:=：])?/gi, '');

  // 4. Remove gate/error codes (R2_*, R3_*), severity enums, decision tokens, internal protocol names & governance files
  out = out.replace(/\b(?:R2|R3)_[A-Z0-9_]*\b/g, '');
  out = out.replace(/\[\s*(?:BLOCKER|MAJOR|MINOR|SUGGESTION)\s*\]/g, '');
  out = out.replace(/\b(?:BLOCKER|MAJOR|MINOR|SUGGESTION)\b/g, '');
  out = out.replace(/\b(?:pass_candidate|pass_with_notes|fix_now|fix_in_arc|defer_to_final|keep_as_blank|UNVERIFIED)\b/g, '');
  out = out.replace(/\b(?:NEEDS_SEMANTIC_AUDIT|PLANNING_CONFLICT_BLOCK|DIFF_OVER_30PCT)\b/g, '');
  out = out.replace(/\b(?:schemaVersion|reverseDefense|issueIdentityKey|reviewFingerprint|reviewHistory|manuscriptHashes|p1Protocol|literaryStatus|evidenceLevel|evidenceBasis|impactScope|mustCloseInReReview|dimensionAuditSlots)\b/g, '');
  out = out.replace(/(?:02-写作计划\.json|story-ledger\.json|reviews\/r3\/[^\s，。；)]*)/gi, '');
  out = out.replace(/\b(?:M1\s*[–-]\s*M4|OR[1-7]\s*[–-]\s*OR[1-7]|HL-[1-6])\b/g, '');

  // 5. Clean up empty brackets, orphaned punctuation, and redundant horizontal whitespace while keeping newlines
  out = out.replace(/\[\s*\]/g, '');
  out = out.replace(/[（(]\s*[,，、;；:：|]*\s*[)）]/g, '');
  out = out.replace(/[ \t]{2,}/g, ' ');
  out = out.replace(/^[ \t]*[,，;；|]+[ \t]*/gm, '');
  out = out.replace(/[ \t]+$/gm, '');
  out = out.replace(/\n{3,}/g, '\n\n');

  return out.trim();
}

/**
 * Extract clean suffix of previous chapter prose strictly within [minChars, maxChars]
 * non-whitespace characters (default 500-900 per 03 §2.1 & PRD P0-2).
 * Fail-Closed: throws WRITER_BRIEF_PREV_TAIL_TOO_SHORT if previous chapter prose < minChars.
 */
export function extractPreviousChapterTail(rawChapterText, {minChars = 500, maxChars = 900} = {}) {
  if (typeof rawChapterText !== 'string' || !rawChapterText.trim()) {
    throw new Error('WRITER_BRIEF_PREV_TAIL_EMPTY');
  }
  // Strip top Markdown chapter heading line if present (e.g. "# 第1章 ...")
  let body = rawChapterText.replace(/^\uFEFF/, '').trim();
  const lines = body.split(/\r?\n/);
  if (lines.length > 1 && /^#\s+/.test(lines[0])) {
    body = lines.slice(1).join('\n').trim();
  }
  const countNonWs = s => s.replace(/\s+/g, '').length;
  const totalNonWs = countNonWs(body);
  if (totalNonWs < minChars) {
    throw new Error(`WRITER_BRIEF_PREV_TAIL_TOO_SHORT: ${totalNonWs} < ${minChars}`);
  }
  if (totalNonWs <= maxChars) return body;

  // Prefer paragraph-aligned tail within [minChars, maxChars]
  const paragraphs = body.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
  if (paragraphs.length > 1) {
    const picked = [];
    let len = 0;
    for (let i = paragraphs.length - 1; i >= 0; i--) {
      const pLen = countNonWs(paragraphs[i]);
      if (len + pLen <= maxChars) {
        picked.unshift(paragraphs[i]);
        len += pLen;
      } else {
        break;
      }
    }
    if (len >= minChars) {
      return picked.join('\n\n');
    }
  }

  // Fallback: take suffix of raw characters so non-whitespace count is within [minChars, maxChars],
  // snapped cleanly to the nearest sentence boundary inside the window.
  let idx = body.length;
  let nonWs = 0;
  let minIdx = body.length;
  let maxIdx = 0;
  while (idx > 0 && nonWs < maxChars) {
    idx--;
    if (!/\s/.test(body[idx])) nonWs++;
    if (nonWs === minChars) minIdx = idx;
    maxIdx = idx;
  }
  // Search forward from maxIdx to minIdx for a clean paragraph or sentence start
  const windowSlice = body.slice(maxIdx, minIdx);
  const paraBreak = windowSlice.indexOf('\n\n');
  if (paraBreak >= 0) {
    const candidate = body.slice(maxIdx + paraBreak + 2).trim();
    if (countNonWs(candidate) >= minChars && countNonWs(candidate) <= maxChars) return candidate;
  }
  const sentMatch = windowSlice.match(/[。！？…」”]\s*/);
  if (sentMatch && sentMatch.index !== undefined) {
    const candidate = body.slice(maxIdx + sentMatch.index + sentMatch[0].length).trim();
    if (countNonWs(candidate) >= minChars && countNonWs(candidate) <= maxChars) return candidate;
  }
  return body.slice(maxIdx).trim();
}

/**
 * Parse top-level H2 headings in a compiled Writer Brief and enforce mandatory tail ordering:
 *  - When hasPrevChapter is true:
 *      penultimate H2 MUST be "## 本书文风锚点示范"
 *      last H2 MUST be "## 上一章结尾原文"
 *      and both must have non-empty pure prose bodies.
 *  - When hasPrevChapter is false (e.g. Chapter 1):
 *      last H2 MUST be "## 本书文风锚点示范" with non-empty body.
 */
export function assertWriterBriefTailOrder(briefText, {hasPrevChapter = true, minTailChars = 500, maxTailChars = 900, enforceTailLength = false} = {}) {
  if (typeof briefText !== 'string' || !briefText.trim()) {
    throw new Error('WRITER_BRIEF_EMPTY');
  }
  const lines = briefText.split(/\r?\n/);
  const h2s = [];
  let inFence = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^ {0,3}(?:`{3,}|~{3,})/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (!inFence && /^##\s+/.test(line)) {
      h2s.push({heading: line.trim(), line: i});
    }
  }
  const sectionBody = idx => {
    const start = h2s[idx].line + 1;
    const end = idx + 1 < h2s.length ? h2s[idx + 1].line : lines.length;
    return lines.slice(start, end).join('\n').trim();
  };

  if (hasPrevChapter) {
    if (h2s.length < 2) {
      throw new Error('WRITER_BRIEF_TAIL_ORDER_INVALID: requires style anchor and previous chapter tail sections');
    }
    const penultimate = h2s[h2s.length - 2];
    const last = h2s[h2s.length - 1];
    if (penultimate.heading !== BRIEF_STYLE_HEADING || last.heading !== BRIEF_PREV_TAIL_HEADING) {
      throw new Error(
        `WRITER_BRIEF_TAIL_ORDER_INVALID: expected penultimate "${BRIEF_STYLE_HEADING}" and last "${BRIEF_PREV_TAIL_HEADING}", got "${penultimate.heading}" then "${last.heading}"`
      );
    }
    const styleBody = sectionBody(h2s.length - 2);
    const tailBody = sectionBody(h2s.length - 1);
    if (!styleBody) throw new Error('WRITER_BRIEF_STYLE_ANCHOR_EMPTY');
    if (!tailBody) throw new Error('WRITER_BRIEF_PREV_TAIL_EMPTY');
    if (enforceTailLength) {
      const len = tailBody.replace(/\s+/g, '').length;
      if (len < minTailChars || len > maxTailChars) {
        throw new Error(`WRITER_BRIEF_PREV_TAIL_LENGTH_OUT_OF_RANGE: ${len} not in [${minTailChars}, ${maxTailChars}]`);
      }
    }
    return {
      ok: true,
      headings: h2s.map(h => h.heading),
      penultimate: penultimate.heading,
      last: last.heading,
      prevTailChars: tailBody.replace(/\s+/g, '').length,
    };
  }

  if (h2s.length < 1) {
    throw new Error('WRITER_BRIEF_TAIL_ORDER_INVALID: missing style anchor section');
  }
  const last = h2s[h2s.length - 1];
  if (last.heading !== BRIEF_STYLE_HEADING) {
    throw new Error(`WRITER_BRIEF_TAIL_ORDER_INVALID: expected last "${BRIEF_STYLE_HEADING}" for chapter 1, got "${last.heading}"`);
  }
  const styleBody = sectionBody(h2s.length - 1);
  if (!styleBody) throw new Error('WRITER_BRIEF_STYLE_ANCHOR_EMPTY');
  return {
    ok: true,
    headings: h2s.map(h => h.heading),
    penultimate: h2s.length >= 2 ? h2s[h2s.length - 2].heading : null,
    last: last.heading,
    prevTailChars: 0,
  };
}

/**
 * Compile a Pure Narrative Revision Card from a structured review report.
 * Strict writer-safe field whitelist (PRD P0-2 §3.2 & 03 §2.1):
 *  - Extracts ONLY:
 *      1) preserveStrengths original quotes verbatim (no reviewer reason/ID/status).
 *      2) narrativeGuidance of open mandatory blocking issues (BLOCKER / MAJOR
 *         with explicit status === 'open', not deferred via fix_in_arc /
 *         defer_to_final / keep_as_blank / advisory, and not blocking === false
 *         or mustCloseInReReview === false).
 *  - Fail-Closed validation:
 *      - Throws if any issue has missing/invalid status or severity.
 *      - Throws if any selected blocking issue lacks a non-empty narrativeGuidance
 *        (never silently falls back to reviewer reason/suggestion or emits issue.quote).
 *      - Strictly ignores reverseDefense and raw governance fields.
 *      - Runs assertWriterContextPurity() before returning.
 */
export function compileRevisionCard(report, {chapterNumber = null, extraDirectives = ''} = {}) {
  if (!report || typeof report !== 'object') {
    throw new Error('REVISION_CARD_INVALID_REPORT');
  }
  if (extraDirectives) assertNoTimePressure(extraDirectives, 'extraDirectives');

  // 1. Strict preserveStrengths whitelist: verbatim original quotes ONLY (no s.reason / s.id).
  const rawStrengths = Array.isArray(report.p1?.preserveStrengths)
    ? report.p1.preserveStrengths
    : Array.isArray(report.preserveStrengths)
      ? report.preserveStrengths
      : Array.isArray(report.strengths)
        ? report.strengths
        : [];

  const preservedQuotes = [];
  for (const [idx, s] of rawStrengths.entries()) {
    if (typeof s === 'string') {
      if (!s.trim()) continue;
      assertNoTimePressure(s, `preserveStrengths[${idx}]`);
      preservedQuotes.push(sanitizeNarrativeText(s, {sourceLabel: `preserveStrengths[${idx}]`}));
    } else if (s && typeof s === 'object') {
      if (!['observed', 'not_established'].includes(s.status)) {
        throw new Error(`REVISION_CARD_STRENGTH_STATUS_INVALID: preserveStrengths[${idx}].status`);
      }
      if (s.status === 'not_established') continue;
      if (!nonempty(s.quote)) {
        throw new Error(`REVISION_CARD_STRENGTH_QUOTE_MISSING: preserveStrengths[${idx}].quote`);
      }
      assertNoTimePressure(s.quote, `preserveStrengths[${idx}].quote`);
      preservedQuotes.push(sanitizeNarrativeText(s.quote, {sourceLabel: `preserveStrengths[${idx}].quote`}));
    } else {
      throw new Error(`REVISION_CARD_STRENGTH_INVALID: preserveStrengths[${idx}]`);
    }
  }

  // 2. Strict blocking issue selection & Fail-Closed validation:
  //    NEVER reads or emits reverseDefense, reason, suggestion, or issue.quote.
  if (report.issues !== undefined && !Array.isArray(report.issues)) {
    throw new Error('REVISION_CARD_ISSUES_NOT_ARRAY');
  }
  const rawIssues = Array.isArray(report.issues) ? report.issues : [];
  const validStatuses = ['open', 'resolved', 'accepted'];
  const validSeverities = ['BLOCKER', 'MAJOR', 'MINOR', 'SUGGESTION'];
  const nonBlockingDispositions = ['fix_in_arc', 'defer_to_final', 'keep_as_blank', 'advisory'];

  const guidanceItems = [];
  for (const [idx, i] of rawIssues.entries()) {
    if (!i || typeof i !== 'object') {
      throw new Error(`REVISION_CARD_ISSUE_INVALID: issues[${idx}]`);
    }
    if (!validStatuses.includes(i.status)) {
      throw new Error(`REVISION_CARD_ISSUE_STATUS_MISSING_OR_INVALID: issues[${idx}].status`);
    }
    if (!validSeverities.includes(i.severity)) {
      throw new Error(`REVISION_CARD_ISSUE_SEVERITY_INVALID: issues[${idx}].severity`);
    }
    if (i.status !== 'open') continue;
    if (!['BLOCKER', 'MAJOR'].includes(i.severity)) continue;
    if (nonBlockingDispositions.includes(i.disposition)) continue;
    if (i.blocking === false || i.mustCloseInReReview === false) continue;

    if (!nonempty(i.narrativeGuidance)) {
      throw new Error(`REVISION_CARD_NARRATIVE_GUIDANCE_REQUIRED: issues[${idx}].narrativeGuidance`);
    }
    assertNoTimePressure(i.narrativeGuidance, `issues[${idx}].narrativeGuidance`);
    const guidance = sanitizeNarrativeText(i.narrativeGuidance, {sourceLabel: `issues[${idx}].narrativeGuidance`});
    if (!guidance) {
      throw new Error(`REVISION_CARD_NARRATIVE_GUIDANCE_EMPTY_AFTER_SANITIZE: issues[${idx}].narrativeGuidance`);
    }
    guidanceItems.push({
      chapter: Number.isInteger(i.chapter) ? i.chapter : chapterNumber,
      guidance,
    });
  }

  const targetCh = chapterNumber ?? (Number.isInteger(report.end) ? report.end : null);
  const sections = [];
  sections.push(targetCh ? `# 第${targetCh}章 叙事修订卡` : '# 章节叙事修订卡');

  // Section 1: preserveStrengths (100% original quotes verbatim ONLY)
  const strengthLines = ['## 必须守住的亮点原句'];
  if (preservedQuotes.length === 0) {
    strengthLines.push('- 本轮保留既有叙事节奏与人物语感，不做无关扩写。');
  } else {
    preservedQuotes.forEach((quote, idx) => {
      strengthLines.push(`${idx + 1}. 原句：“${quote}”`);
    });
  }
  sections.push(strengthLines.join('\n'));

  // Section 2: pure natural-language narrativeGuidance ONLY
  const fixLines = ['## 本次需要修正的剧情与逻辑要点'];
  if (guidanceItems.length === 0) {
    fixLines.push('- 当前没有必须修改的剧情硬伤，可直接保持正文自然连贯。');
  } else {
    guidanceItems.forEach((item, idx) => {
      const chPrefix = item.chapter ? `（第${item.chapter}章）` : '';
      fixLines.push(`${idx + 1}. ${chPrefix}${item.guidance}`);
    });
  }
  if (nonempty(extraDirectives)) {
    const cleanedExtra = sanitizeNarrativeText(extraDirectives, {sourceLabel: 'extraDirectives'});
    if (cleanedExtra) fixLines.push(`- 补充叙事提示：${cleanedExtra}`);
  }
  sections.push(fixLines.join('\n'));

  // Section 3: Pure creative reminder (zero governance words, zero time pressure)
  sections.push([
    '## 修订语态提醒',
    '- 仅围绕上述剧情与逻辑要点在正文场景内自然补足或修正，完整守住已确认的亮点原句与人物语气。',
    '- 用具体动作、感官与对白落笔，不在正文中插入解释性说明或括注。',
  ].join('\n'));

  const markdown = sections.join('\n\n') + '\n';

  // Fail-Closed purity assertion before returning
  const purity = assertWriterContextPurity(markdown);

  return {
    markdown,
    preservedStrengthsCount: preservedQuotes.length,
    preservedQuotes,
    blockingGuidanceCount: guidanceItems.length,
    purity,
  };
}
