#!/usr/bin/env node
/**
 * P0-5: `impactScope` Hard Interceptor & `OR6` `PLANNING_CONFLICT_BLOCK` Router.
 *
 * ISOLATED PROTOTYPE MODULE — implements frozen protocol `06` §3.2 (`OR6`):
 *  - `impactScope = "draft_only"`        -> eligible for pure-narrative writer revision batch
 *  - `impactScope = "upstream_planning"` -> HARD-REJECTED from writer revision batch (exit code 2);
 *                                           routed to `PLANNING_CONFLICT_BLOCK` (subRoute: `upstream_planning_deadlock`)
 *  - `impactScope = "finalized_canon"`   -> HARD-REJECTED from writer revision batch & silent canon overwrite (exit code 2);
 *                                           routed to `PLANNING_CONFLICT_BLOCK` (subRoute: `retcon_required`)
 *  - Legal outline-approved tropes       -> `planningConflictAdvisories` (non-blocking, 0% false block)
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {compileRevisionCard} from '../r3_writer_firewall.mjs';
import {ALLOWED_IMPACT_SCOPES} from '../r3_review_kernel.mjs';

const isPlainObject = x => Boolean(x) && typeof x === 'object' && !Array.isArray(x);

export const FORBIDDEN_WRITER_BATCH_SCOPES = Object.freeze([
  'upstream_planning',
  'finalized_canon',
]);

/**
 * Hard-guard preventing any `upstream_planning` or `finalized_canon` issue from entering a writer revision batch.
 * Returns `{ok: false, exitCode: 2, error: 'R3_IMPACT_SCOPE_WRITER_BATCH_FORBIDDEN', ...}` on ANY violation.
 */
export function assertWriterRevisionBatchSafe(reportOrIssues) {
  const issues = Array.isArray(reportOrIssues)
    ? reportOrIssues
    : Array.isArray(reportOrIssues?.issues)
      ? reportOrIssues.issues
      : null;

  if (!issues) {
    return {
      ok: false,
      exitCode: 2,
      error: 'R3_WRITER_BATCH_INVALID_INPUT',
      message: '写手改稿批校验输入必须是 issues 数组或包含 issues 的报告对象。',
    };
  }

  const forbidden = [];
  for (const issue of issues) {
    if (!isPlainObject(issue)) {
      return {
        ok: false,
        exitCode: 2,
        error: 'R3_WRITER_BATCH_INVALID_ISSUE',
        message: '写手改稿批包含非对象条目。',
      };
    }
    const scope = issue.impactScope;
    if (scope !== undefined && !ALLOWED_IMPACT_SCOPES.includes(scope)) {
      return {
        ok: false,
        exitCode: 2,
        error: 'R3_INVALID_IMPACT_SCOPE',
        message: `写手改稿批包含非法 impactScope：${String(scope)}。`,
      };
    }
    if (FORBIDDEN_WRITER_BATCH_SCOPES.includes(scope)) {
      forbidden.push({
        id: issue.id ?? null,
        severity: issue.severity ?? null,
        impactScope: scope,
        dimension: issue.dimension ?? null,
        requiredRoute: 'PLANNING_CONFLICT_BLOCK',
        subRoute: scope === 'finalized_canon' ? 'retcon_required' : 'upstream_planning_deadlock',
      });
    }
  }

  if (forbidden.length > 0) {
    return {
      ok: false,
      exitCode: 2,
      error: 'R3_IMPACT_SCOPE_WRITER_BATCH_FORBIDDEN',
      message: `硬拦截：禁止将 impactScope 为 upstream_planning 或 finalized_canon 的条目混入写手改稿批（共 ${forbidden.length} 条），必须路由至 PLANNING_CONFLICT_BLOCK。`,
      forbiddenIssues: forbidden,
    };
  }

  return {
    ok: true,
    exitCode: 0,
    allowedCount: issues.length,
  };
}

/**
 * Deterministic OR6 router for a validated `FinalCalibrationReport`.
 *
 * Strictly enforces:
 *  - `finalized_canon` BLOCKER/MAJOR -> `PLANNING_CONFLICT_BLOCK` (`subRoute: "retcon_required"`, no writer batch, no silent overwrite)
 *  - `upstream_planning` BLOCKER/MAJOR -> `PLANNING_CONFLICT_BLOCK` (`subRoute: "upstream_planning_deadlock"`, no writer batch)
 *  - Pure `draft_only` blocking issues -> `WRITER_REVISION_BATCH` (verified via `assertWriterRevisionBatchSafe`)
 *  - Clean `pass_candidate` (including legal tropes in `planningConflictAdvisories`) -> `PASS_CANDIDATE` (blocking: false)
 */
export function routeFinalReviewReport(report, {compileWriterCard = false, chapterNumber = null} = {}) {
  if (!isPlainObject(report) || !Array.isArray(report.issues)) {
    return {
      ok: false,
      exitCode: 2,
      error: 'R3_ROUTE_INVALID_REPORT',
      message: '分流输入必须是包含 issues 数组的 FinalCalibrationReport。',
    };
  }

  const advisories = Array.isArray(report.planningConflictAdvisories)
    ? report.planningConflictAdvisories
    : [];

  const blockingIssues = report.issues.filter(
    i => isPlainObject(i) && (i.severity === 'BLOCKER' || i.severity === 'MAJOR')
  );
  if (blockingIssues.some(i => !ALLOWED_IMPACT_SCOPES.includes(i.impactScope))) {
    return {
      ok: false,
      exitCode: 2,
      error: 'R3_INVALID_IMPACT_SCOPE',
      message: '存在缺少或非法 impactScope 的 BLOCKER/MAJOR 项，无法安全分流。',
    };
  }
  const canonConflicts = blockingIssues.filter(i => i.impactScope === 'finalized_canon');
  const planningConflicts = blockingIssues.filter(i => i.impactScope === 'upstream_planning');
  const draftBlocking = blockingIssues.filter(
    i => i.impactScope === 'draft_only' && i.blocking !== false
  );

  // Route 1: finalized_canon or upstream_planning -> PLANNING_CONFLICT_BLOCK
  if (canonConflicts.length > 0 || planningConflicts.length > 0) {
    if (report.decision !== 'PLANNING_CONFLICT_BLOCK') {
      return {
        ok: false,
        exitCode: 2,
        error: 'R3_OR6_DECISION_MISMATCH',
        message: '存在 upstream_planning 或 finalized_canon 阻断项，但报告 decision 不是 PLANNING_CONFLICT_BLOCK，拒绝放行或混入改稿批。',
      };
    }
    const subRoute = canonConflicts.length > 0 ? 'retcon_required' : 'upstream_planning_deadlock';
    return {
      ok: true,
      exitCode: 0,
      route: 'PLANNING_CONFLICT_BLOCK',
      subRoute,
      decision: 'PLANNING_CONFLICT_BLOCK',
      blocking: true,
      allowWriterRevisionBatch: false,
      allowSilentCanonOverwrite: false,
      requiresAuthorDecision: true,
      nextAction:
        subRoute === 'retcon_required'
          ? 'RUN_ANALYZE_IMPACT_AND_EXPLICIT_RETCON_APPROVAL'
          : 'RUN_ANALYZE_IMPACT_AND_AUTHOR_PLAN_PROPOSAL',
      upstreamPlanningIssues: planningConflicts,
      finalizedCanonIssues: canonConflicts,
      deferredDraftIssues: draftBlocking,
      advisories,
    };
  }

  // Reverse OR6 guard: cannot claim PLANNING_CONFLICT_BLOCK without real planning/canon conflict
  if (report.decision === 'PLANNING_CONFLICT_BLOCK') {
    return {
      ok: false,
      exitCode: 2,
      error: 'R3_OR6_EMPTY_PLANNING_CONFLICT_BLOCK',
      message: '报告 decision 为 PLANNING_CONFLICT_BLOCK，但不存在任何 upstream_planning 或 finalized_canon 阻断项。',
    };
  }

  // Guard: pass_candidate cannot carry blocking draft_only BLOCKER/MAJOR issues
  if (draftBlocking.length > 0 && report.decision === 'pass_candidate') {
    return {
      ok: false,
      exitCode: 2,
      error: 'R3_PASS_CANDIDATE_WITH_BLOCKING_ISSUES',
      message: '报告 decision 为 pass_candidate，但仍包含未解决的 draft_only 阻断项，拒绝放行。',
    };
  }

  // Route 2: Pure draft_only rework -> WRITER_REVISION_BATCH
  if (draftBlocking.length > 0 || report.decision === 'revise') {
    const batchCheck = assertWriterRevisionBatchSafe(report.issues);
    if (!batchCheck.ok) {
      return batchCheck;
    }
    let revisionCard = null;
    if (compileWriterCard) {
      revisionCard = compileRevisionCard(
        {
          ...report,
          preserveStrengths: (report.preserveStrengths || []).map((s, idx) => ({
            id: s.id || `PS-${idx + 1}`,
            status: s.status || 'observed',
            chapter: s.chapter ?? chapterNumber ?? 1,
            quote: s.quote,
            reason: s.reason,
          })),
          issues: draftBlocking.map(i => ({
            ...i,
            status: 'open',
            reason: i.evidence || i.reason || '',
            suggestion: i.narrativeGuidance || i.suggestion || i.evidence || '',
          })),
        },
        {chapterNumber}
      );
    }
    return {
      ok: true,
      exitCode: 0,
      route: 'WRITER_REVISION_BATCH',
      subRoute: 'draft_only_rework',
      decision: 'revise',
      blocking: true,
      allowWriterRevisionBatch: true,
      allowSilentCanonOverwrite: false,
      requiresAuthorDecision: false,
      writerRevisionIssues: draftBlocking,
      advisories,
      ...(revisionCard ? {revisionCard} : {}),
    };
  }

  // Route 3: Clean pass_candidate (outline-approved legal tropes stay in advisories and NEVER block)
  if (report.decision === 'pass_candidate') {
    return {
      ok: true,
      exitCode: 0,
      route: 'PASS_CANDIDATE',
      subRoute: advisories.length > 0 ? 'pass_with_planning_advisories' : 'clean_pass',
      decision: 'pass_candidate',
      blocking: false,
      allowWriterRevisionBatch: false,
      allowSilentCanonOverwrite: false,
      requiresAuthorDecision: false,
      advisories,
    };
  }

  return {
    ok: false,
    exitCode: 2,
    error: 'R3_ROUTE_UNKNOWN_DECISION',
    message: `未知或不支持的 decision：${String(report.decision)}。`,
  };
}

function runCli(argv) {
  const args = argv.slice(2);
  const action = args[0];
  const flag = k => {
    const idx = args.indexOf(k);
    return idx >= 0 ? args[idx + 1] : null;
  };
  const reportPath = flag('--report');
  if (!['route-report', 'check-writer-batch'].includes(action) || !reportPath) {
    console.log(JSON.stringify({
      ok: false,
      error: 'R3_IMPACT_ROUTER_USAGE',
      usage: 'node scripts/p0_prototypes/impact_scope_router.mjs <route-report|check-writer-batch> --report <file.json>',
    }, null, 2));
    process.exitCode = 2;
    return;
  }

  let obj;
  try {
    obj = JSON.parse(fs.readFileSync(path.resolve(reportPath), 'utf8').replace(/^\uFEFF/, ''));
  } catch {
    console.log(JSON.stringify({ok: false, error: 'R3_REPORT_READ_OR_JSON_ERROR'}, null, 2));
    process.exitCode = 2;
    return;
  }

  const res = action === 'check-writer-batch'
    ? assertWriterRevisionBatchSafe(obj)
    : routeFinalReviewReport(obj);
  console.log(JSON.stringify(res, null, 2));
  process.exitCode = res.exitCode;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runCli(process.argv);
}
