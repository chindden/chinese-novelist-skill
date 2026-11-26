#!/usr/bin/env node
/**
 * P0-3: Single-Chapter Read-Only Deterministic Precheck CLI (`precheck v2`, schemaVersion: 2).
 *
 * Strictly read-only: outputs PrecheckV2Output JSON to stdout only.
 * Never modifies 02-写作计划.json, story-ledger.json, snapshots, or revision counters.
 *
 * Usage:
 *   node scripts/precheck_chapter.mjs <project-dir> --chapter <N> [--dry-run] [--json]
 *   node scripts/precheck_chapter.mjs <project-dir> <N> [--dry-run] [--json]
 *
 * Exit codes:
 *   0 = blocking: false (hardErrors is empty; softWarnings / needsSemanticAudit allowed)
 *   1 = blocking: true  (hardErrors non-empty: file damage or explicit author hardConstraints)
 *   2 = invalid CLI usage or project directory error
 */
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {precheckChapterV2} from './precheck_v2_common.mjs';

export {precheckChapterV2};

function parseCliArgs(argv) {
  let projectDir = null;
  let chapterRaw = null;
  let dryRun = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      return {help: true};
    }
    if (arg === '--dry-run') {
      dryRun = true;
      continue;
    }
    if (arg === '--json') {
      continue;
    }
    if (arg === '--chapter' || arg === '-c') {
      if (chapterRaw !== null || i + 1 >= argv.length) {
        throw new Error('PRECHECK_CLI_INVALID_CHAPTER_FLAG');
      }
      chapterRaw = argv[++i];
      continue;
    }
    if (arg.startsWith('-')) {
      throw new Error(`PRECHECK_CLI_UNKNOWN_FLAG: ${arg}`);
    }
    if (projectDir === null) {
      projectDir = arg;
    } else if (chapterRaw === null) {
      chapterRaw = arg;
    } else {
      throw new Error(`PRECHECK_CLI_UNEXPECTED_ARG: ${arg}`);
    }
  }

  if (!projectDir || chapterRaw === null || !/^\d+$/.test(chapterRaw)) {
    throw new Error('PRECHECK_CLI_USAGE');
  }
  const chapter = Number(chapterRaw);
  if (!Number.isSafeInteger(chapter) || chapter < 1) {
    throw new Error('PRECHECK_CLI_INVALID_CHAPTER_NUMBER');
  }
  return {help: false, projectDir, chapter, dryRun};
}

const isDirectRun =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  try {
    const parsed = parseCliArgs(process.argv.slice(2));
    if (parsed.help) {
      console.log(
        'Usage: node scripts/precheck_chapter.mjs <project-dir> --chapter <N> [--dry-run] [--json]\n' +
          'Read-only Precheck v2 (schemaVersion: 2). Outputs JSON to stdout with zero disk writes.\n' +
          'Exit codes: 0=non-blocking, 1=blocking (hardErrors), 2=CLI/project error.',
      );
      process.exit(0);
    }
    const result = precheckChapterV2(parsed.projectDir, parsed.chapter, {dryRun: parsed.dryRun});
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.blocking ? 1 : 0;
  } catch (err) {
    console.log(JSON.stringify({error: err.message}, null, 2));
    process.exitCode = 2;
  }
}
