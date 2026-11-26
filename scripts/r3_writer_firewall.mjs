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
  {code: 'TIME_FIVE_MINUTES', re: /(?:5\s*分钟|五分钟|5\s*min(?:utes?)?\b)/gi},
  {code: 'TIME_LIMIT', re: /(?:限时|限期完成|别超时|不要超时|不能超时|严禁超时|超时扣分)/g},
  {code: 'TIME_RUSH_WORK', re: /(?:赶工|赶写|抓紧赶|冲刺交稿|提速赶)/g},
  {code: 'TIME_COUNTDOWN', re: /(?:倒计时|计时器|掐表)/g},
  {code: 'TIME_HURRY_FINISH', re: /(?:尽快写完|抓紧写完|赶紧写完|立刻写完|马上写完|快速交稿|立刻交稿|\d+\s*分钟内(?:写完|完成|交稿))/g},
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

/**
 * Deterministically strip governance metadata and engineering ID tags from
 * source text while preserving natural Chinese hard facts, names, dates, and numbers.
 * Time-pressure phrases are NOT silently stripped; they trigger Fail-Closed rejection.
 */
export function sanitizeNarrativeText(text, {sourceLabel = 'text'} = {}) {
  if (typeof text !== 'string') return '';
  assertNoTimePressure(text, sourceLabel);

  let out = text;

  // 1. Remove full inline JSON-style governance key-value fragments like `"schemaVersion": 1,` or `reverseDefense: ...`
  out = out.replace(/["']?(?:schemaVersion|reverseDefense|issueIdentityKey|reviewFingerprint|reviewHistory|manuscriptHashes|p1Protocol|literaryStatus|evidenceLevel|evidenceBasis|impactScope|mustCloseInReReview|dimensionAuditSlots)["']?\s*[:=]\s*(?:\{[^}\n]*\}|\[[^\]\n]*\]|"[^"\n]*"|'[^'\n]*'|[^,;\n。；]+)/gi, '');

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
 * Extract clean suffix of previous chapter prose targeting 500-900 non-whitespace characters
 * (per 03 §2.1 & PRD P0-2). Never invents or pads text if source chapter is shorter than 500 chars.
 */
export function extractPreviousChapterTail(rawChapterText, {minChars = 500, maxChars = 900} = {}) {
  if (typeof rawChapterText !== 'string' || !rawChapterText.trim()) return '';
  // Strip top Markdown chapter heading line if present (e.g. "# 第1章 ...")
  let body = rawChapterText.replace(/^\uFEFF/, '').trim();
  const lines = body.split(/\r?\n/);
  if (lines.length > 1 && /^#\s+/.test(lines[0])) {
    body = lines.slice(1).join('\n').trim();
  }
  const countNonWs = s => s.replace(/\s+/g, '').length;
  if (countNonWs(body) <= maxChars) return body;

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
 * - Preserves 100% of preserveStrengths original quotes verbatim.
 * - Extracts only blocking issues (BLOCKER / MAJOR, open, not fix_in_arc) as
 *   pure natural-language narrative guidance.
 * - Strictly strips reverseDefense, raw JSON, issue IDs, severity labels, gate codes,
 *   and hard-rejects any time-pressure language via assertWriterContextPurity().
 */
export function compileRevisionCard(report, {chapterNumber = null, extraDirectives = ''} = {}) {
  if (!report || typeof report !== 'object') {
    throw new Error('REVISION_CARD_INVALID_REPORT');
  }
  if (extraDirectives) assertNoTimePressure(extraDirectives, 'extraDirectives');

  // 1. Collect preserveStrengths from R3 P1 (report.p1.preserveStrengths),
  //    top-level report.preserveStrengths, or legacy report.strengths.
  const rawStrengths = Array.isArray(report.p1?.preserveStrengths)
    ? report.p1.preserveStrengths
    : Array.isArray(report.preserveStrengths)
      ? report.preserveStrengths
      : Array.isArray(report.strengths)
        ? report.strengths
        : [];

  const preservedQuotes = [];
  for (const s of rawStrengths) {
    if (typeof s === 'string' && s.trim()) {
      assertNoTimePressure(s, 'preserveStrengths');
      preservedQuotes.push({quote: sanitizeNarrativeText(s, {sourceLabel: 'preserveStrengths'}), note: ''});
    } else if (s && typeof s === 'object') {
      if (s.status === 'not_established') continue;
      if (nonempty(s.quote)) {
        assertNoTimePressure(s.quote, 'preserveStrengths.quote');
        const note = nonempty(s.reason) ? sanitizeNarrativeText(s.reason, {sourceLabel: 'preserveStrengths.reason'}) : '';
        preservedQuotes.push({
          quote: sanitizeNarrativeText(s.quote, {sourceLabel: 'preserveStrengths.quote'}),
          note,
        });
      }
    }
  }

  // 2. Extract only mandatory blocking issues (BLOCKER / MAJOR, status === 'open',
  //    not deferred as fix_in_arc / defer_to_final / keep_as_blank).
  //    Explicitly IGNORE reverseDefense and all governance fields.
  const rawIssues = Array.isArray(report.issues) ? report.issues : [];
  const blockingIssues = rawIssues.filter(i => {
    if (!i || typeof i !== 'object') return false;
    if (i.status && i.status !== 'open') return false;
    if (!['BLOCKER', 'MAJOR'].includes(i.severity)) return false;
    if (i.severity === 'MAJOR' && i.disposition === 'fix_in_arc') return false;
    if (['defer_to_final', 'keep_as_blank', 'advisory'].includes(i.disposition)) return false;
    return true;
  });

  const guidanceItems = blockingIssues.map(i => {
    const quote = nonempty(i.quote) ? sanitizeNarrativeText(i.quote, {sourceLabel: 'issue.quote'}) : '';
    const guidanceRaw = nonempty(i.narrativeGuidance)
      ? i.narrativeGuidance
      : [i.reason, i.suggestion].filter(nonempty).join('；');
    assertNoTimePressure(guidanceRaw, 'issue.narrativeGuidance');
    const guidance = sanitizeNarrativeText(guidanceRaw, {sourceLabel: 'issue.narrativeGuidance'});
    return {
      chapter: Number.isInteger(i.chapter) ? i.chapter : chapterNumber,
      quote,
      guidance,
    };
  });

  const targetCh = chapterNumber ?? (Number.isInteger(report.end) ? report.end : null);
  const sections = [];
  sections.push(targetCh ? `# 第${targetCh}章 叙事修订卡` : '# 章节叙事修订卡');

  // Section 1: preserveStrengths (100% original quotes preserved)
  const strengthLines = ['## 必须守住的亮点原句'];
  if (preservedQuotes.length === 0) {
    strengthLines.push('- 本轮保留既有叙事节奏与人物语感，不做无关扩写。');
  } else {
    preservedQuotes.forEach((item, idx) => {
      strengthLines.push(`${idx + 1}. 原句：“${item.quote}”`);
      if (item.note) strengthLines.push(`   保留要点：${item.note}`);
    });
  }
  sections.push(strengthLines.join('\n'));

  // Section 2: pure natural-language narrative revision directions
  const fixLines = ['## 本次需要修正的剧情与逻辑要点'];
  if (guidanceItems.length === 0) {
    fixLines.push('- 当前没有必须修改的剧情硬伤，可直接保持正文自然连贯。');
  } else {
    guidanceItems.forEach((item, idx) => {
      const chPrefix = item.chapter ? `（第${item.chapter}章相关片段）` : '';
      fixLines.push(`${idx + 1}. ${item.guidance}${chPrefix}`);
      if (item.quote) fixLines.push(`   对应原文：“${item.quote}”`);
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
    preservedQuotes: preservedQuotes.map(p => p.quote),
    blockingGuidanceCount: guidanceItems.length,
    purity,
  };
}
