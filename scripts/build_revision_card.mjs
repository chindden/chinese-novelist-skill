#!/usr/bin/env node
/**
 * P0-2: Pure Narrative Revision Card Compiler (纯叙事返工修订卡编译器).
 *
 * Compiles a structured review report JSON into a pure natural-language Revision Card:
 *  - Preserves 100% of preserveStrengths original quotes verbatim.
 *  - Translates only mandatory blocking issues into natural narrative guidance.
 *  - Hard-strips reverseDefense, raw JSON, issue IDs, severity enums, and gate codes.
 *  - Hard-rejects any time-pressure language via assertWriterContextPurity().
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {projectRoot, safeFile} from './v3_common.mjs';
import {compileRevisionCard} from './r3_writer_firewall.mjs';

function safeOutPath(root, relOut) {
  const resolved = path.resolve(root, relOut);
  const rel = path.relative(root, resolved);
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error('REVISION_CARD_OUT_OUTSIDE_PROJECT');
  }
  return resolved;
}

export function buildRevisionCard(rootDir, reportPath, {chapterNumber = null, extraDirectives = ''} = {}) {
  const t0 = performance.now();
  const root = projectRoot(rootDir);
  const resolvedReport = safeFile(root, reportPath);
  if (!resolvedReport) {
    throw new Error('REVISION_CARD_REPORT_NOT_FOUND');
  }
  let report;
  try {
    report = JSON.parse(fs.readFileSync(resolvedReport, 'utf8'));
  } catch {
    throw new Error('REVISION_CARD_REPORT_INVALID_JSON');
  }
  const compiled = compileRevisionCard(report, {chapterNumber, extraDirectives});
  const durationMs = Number((performance.now() - t0).toFixed(2));
  return {
    ...compiled,
    durationMs,
  };
}

function parseCliArgs(argv) {
  const folder = argv[0];
  let reportPath = null;
  let chapter = null;
  let outRel = null;
  let extra = '';
  let json = false;
  for (let i = 1; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json') json = true;
    else if (a === '--report') reportPath = argv[++i];
    else if (a === '--chapter') chapter = Number(argv[++i]);
    else if (a === '--out') outRel = argv[++i];
    else if (a === '--extra') extra = argv[++i] ?? '';
    else throw new Error('Usage: build_revision_card.mjs <project-dir> --report <rel-path> [--chapter <N>] [--out <rel-path>] [--extra <text>] [--json]');
  }
  if (!folder || !reportPath) {
    throw new Error('Usage: build_revision_card.mjs <project-dir> --report <rel-path> [--chapter <N>] [--out <rel-path>] [--extra <text>] [--json]');
  }
  if (chapter !== null && (!Number.isSafeInteger(chapter) || chapter < 1)) {
    throw new Error('REVISION_CARD_INVALID_CHAPTER');
  }
  return {folder, reportPath, chapter, outRel, extra, json};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const {folder, reportPath, chapter, outRel, extra, json} = parseCliArgs(process.argv.slice(2));
    const result = buildRevisionCard(folder, reportPath, {chapterNumber: chapter, extraDirectives: extra});
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
        durationMs: result.durationMs,
        outputPath,
        preservedStrengthsCount: result.preservedStrengthsCount,
        blockingGuidanceCount: result.blockingGuidanceCount,
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
