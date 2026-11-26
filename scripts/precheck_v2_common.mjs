/**
 * P0-3: Deterministic Read-Only Precheck v2 Core Engine (`schemaVersion: 2`).
 *
 * Strictly read-only — contains zero filesystem write APIs, zero child_process calls,
 * and never mutates 02-写作计划.json, story-ledger.json, snapshots, or revision counters.
 *
 * Admission iron law (frozen Doc 06 §1.1 & Doc 05 §1.2):
 *  - hardErrors (blocking: true): ONLY engineering file integrity damage
 *    (missing/empty/binary/invalid-UTF8/unsafe-path/unapproved finalized-chapter tamper)
 *    and explicit author-configured deterministic hardConstraints in 02-写作计划.json.
 *  - softWarnings (blocking: false): word-count deviations, duplicate paragraph candidates,
 *    unpaired quote candidates (with GB/T 15834 Chinese multi-paragraph quote whitelist),
 *    prose parentheses, high-frequency sudden adverbs, and overlong semicolon sentences.
 *  - needsSemanticAudit (blocking: false, mandatory reviewer resolution): structured
 *    clues across 6 categories with exact verbatim anchorQuote & 1-based paragraphIndex.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {checkChapter} from './chapter_wordcount_common.mjs';
import {structuredChecks} from './r3_structured_checks.mjs';

export const PRECHECK_SCHEMA_VERSION = 2;
export const DEFAULT_SOFT_MIN_WORDS = 3000;
export const DEFAULT_SOFT_MAX_WORDS = 4000;

const CATEGORY_ORDER = [
  'date_arithmetic',
  'ledger_quantity',
  'prop_sequence',
  'author_semantic_constraint',
  'climax_action_pov',
  'info_asymmetry',
];

function sha256Hex(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function isPlainObject(v) {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function hasOwn(obj, key) {
  return !!obj && Object.prototype.hasOwnProperty.call(obj, key);
}

/**
 * Resolve a relative path strictly inside root, distinguishing:
 *  - unsafe path / traversal / symlink escape -> { status: 'unsafe' }
 *  - missing file -> { status: 'missing' }
 *  - non-file (e.g. directory) -> { status: 'not_file' }
 *  - safe regular file -> { status: 'ok', realPath }
 */
export function inspectSafeFile(root, relative) {
  if (typeof relative !== 'string' || !relative.trim() || path.isAbsolute(relative)) {
    return {status: 'unsafe', reason: 'INVALID_OR_ABSOLUTE_PATH'};
  }
  const candidate = path.resolve(root, relative);
  const rel = path.relative(root, candidate);
  if (!rel || rel === '..' || rel.startsWith('..' + path.sep) || path.isAbsolute(rel)) {
    return {status: 'unsafe', reason: 'PATH_TRAVERSAL'};
  }
  let lstat;
  try {
    lstat = fs.lstatSync(candidate);
  } catch (err) {
    if (err && err.code === 'ENOENT') {
      return {status: 'missing', reason: 'ENOENT'};
    }
    return {status: 'unreadable', reason: err?.code || 'STAT_ERROR'};
  }
  let real;
  try {
    real = fs.realpathSync(candidate);
  } catch (err) {
    if (lstat.isSymbolicLink()) {
      return {status: 'unsafe', reason: 'BROKEN_SYMLINK'};
    }
    return {status: 'unreadable', reason: err?.code || 'REALPATH_ERROR'};
  }
  const realRel = path.relative(root, real);
  if (!realRel || realRel === '..' || realRel.startsWith('..' + path.sep) || path.isAbsolute(realRel)) {
    return {status: 'unsafe', reason: 'SYMLINK_ESCAPE'};
  }
  let stat;
  try {
    stat = fs.statSync(real);
  } catch (err) {
    return {status: 'unreadable', reason: err?.code || 'STAT_ERROR'};
  }
  if (!stat.isFile()) {
    return {status: 'not_file', reason: 'NOT_REGULAR_FILE'};
  }
  return {status: 'ok', realPath: real};
}

/**
 * Validate raw manuscript bytes for binary pollution and strict UTF-8 encoding.
 * Returns { ok: true, text, sha256 } or { ok: false, sha256, error: { code, message } }.
 */
export function decodeAndValidateManuscriptBytes(buf) {
  const digest = sha256Hex(buf);
  if (buf.length === 0) {
    return {
      ok: false,
      sha256: digest,
      error: {
        code: 'MANUSCRIPT_EMPTY_FILE',
        message: '章节文件为 0 字节空稿，无法送审。',
      },
    };
  }
  for (let i = 0; i < buf.length; i++) {
    const b = buf[i];
    if (b === 0x00) {
      return {
        ok: false,
        sha256: digest,
        error: {
          code: 'MANUSCRIPT_BINARY_POLLUTION',
          message: `章节文件在第 ${i} 字节处包含非法空字节（0x00），疑似二进制污染。`,
          byteOffset: i,
        },
      };
    }
    // Reject non-printable ASCII control characters other than \t (0x09), \n (0x0A), \r (0x0D)
    if ((b < 0x20 && b !== 0x09 && b !== 0x0a && b !== 0x0d) || b === 0x7f) {
      return {
        ok: false,
        sha256: digest,
        error: {
          code: 'MANUSCRIPT_BINARY_POLLUTION',
          message: `章节文件在第 ${i} 字节处包含非法控制字节（0x${b.toString(16).padStart(2, '0')}），疑似二进制或编码污染。`,
          byteOffset: i,
        },
      };
    }
  }
  let text;
  try {
    text = new TextDecoder('utf-8', {fatal: true}).decode(buf);
  } catch {
    return {
      ok: false,
      sha256: digest,
      error: {
        code: 'MANUSCRIPT_INVALID_UTF8',
        message: '章节文件包含非法 UTF-8 字节序列，编码已损坏。',
      },
    };
  }
  if (text.includes('\uFFFD')) {
    return {
      ok: false,
      sha256: digest,
      error: {
        code: 'MANUSCRIPT_INVALID_UTF8',
        message: '章节正文包含 UTF-8 替换字符（U+FFFD），疑似编码破损。',
      },
    };
  }
  const bodyCheck = text.replace(/^\uFEFF/, '').trim();
  if (!bodyCheck) {
    return {
      ok: false,
      sha256: digest,
      error: {
        code: 'MANUSCRIPT_EMPTY_CONTENT',
        message: '章节文件仅包含空白字符，缺少有效正文内容。',
      },
    };
  }
  return {ok: true, text, sha256: digest};
}

/**
 * Split raw chapter Markdown into 1-based body paragraphs, stripping an optional
 * UTF-8 BOM and optional leading "# ..." chapter heading block so paragraphIndex=1
 * corresponds to the first body paragraph.
 */
export function extractBodyParagraphs(rawText) {
  let body = rawText.replace(/^\uFEFF/, '');
  const headMatch = body.match(/^[ \t]*#[ \t]+[^\r\n]*(?:\r?\n)+/);
  if (headMatch) {
    body = body.slice(headMatch[0].length);
  }
  const hasBlankLineSep = /\r?\n[ \t]*\r?\n/.test(body.trim());
  const rawParts = hasBlankLineSep ? body.split(/\r?\n[ \t]*\r?\n+/) : body.split(/\r?\n+/);
  const paragraphs = [];
  for (const part of rawParts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    // Skip standalone Markdown horizontal rules / secondary divider lines
    if (/^[-*_]{3,}$/.test(trimmed)) continue;
    paragraphs.push(trimmed);
  }
  return paragraphs;
}

const HEX64_RE = /^[a-f0-9]{64}$/;
const R2_VALID_STATUSES = ['under_review', 'passed', 'revise'];

function reviewScopeNumbers(kind, end) {
  return kind === 'chapter' ? [end] : kind === 'pilot' ? [1, 2, 3] : [end - 2, end - 1, end];
}

/**
 * Pure read-only verification of an r3_snapshots.mjs directory snapshot inside reviews/r3/.
 * Matches scripts/r3_snapshots.mjs verifySnapshot() strictly:
 *  - Canonical manifest serialization: Buffer.from(JSON.stringify(m, null, 2) + '\n').equals(bytes)
 *  - Exact manifest SHA-256 digest match
 *  - Safe file names, zero symlinks, zero extra/missing files on disk, every file SHA-256 verified
 */
function verifyReadOnlySnapshot(root, relPath, expectedSha256) {
  if (typeof relPath !== 'string' || !/^reviews\/r3\/[a-zA-Z0-9/_-]+$/.test(relPath) ||
      relPath.includes('//') || relPath.includes('..') || !HEX64_RE.test(expectedSha256)) {
    return {ok: false, reason: 'R3_SNAPSHOT_PATH_OR_DIGEST_INVALID'};
  }
  const realRoot = fs.realpathSync(root);
  const abs = path.resolve(realRoot, relPath);
  if (!abs.startsWith(realRoot + path.sep)) {
    return {ok: false, reason: 'R3_SNAPSHOT_PATH_OUTSIDE_ROOT'};
  }
  let st;
  try {
    st = fs.lstatSync(abs);
  } catch {
    return {ok: false, reason: 'R3_SNAPSHOT_MISSING'};
  }
  if (!st.isDirectory() || st.isSymbolicLink() || !fs.realpathSync(abs).startsWith(realRoot + path.sep)) {
    return {ok: false, reason: 'R3_SNAPSHOT_UNSAFE'};
  }
  const manifestPath = path.join(abs, 'manifest.json');
  let mst;
  try {
    mst = fs.lstatSync(manifestPath);
  } catch {
    return {ok: false, reason: 'R3_SNAPSHOT_MANIFEST_INVALID'};
  }
  if (!mst.isFile() || mst.isSymbolicLink()) {
    return {ok: false, reason: 'R3_SNAPSHOT_MANIFEST_INVALID'};
  }
  const manifestBytes = fs.readFileSync(manifestPath);
  let m;
  try {
    m = JSON.parse(manifestBytes.toString('utf8'));
  } catch {
    return {ok: false, reason: 'R3_SNAPSHOT_MANIFEST_INVALID'};
  }
  if (!isPlainObject(m) || m.schemaVersion !== 1 || !isPlainObject(m.files) || Object.keys(m.files).length === 0) {
    return {ok: false, reason: 'R3_SNAPSHOT_MANIFEST_INVALID'};
  }
  // Exact canonical serialization check matching r3_snapshots.mjs L15/L35
  const canonicalBytes = Buffer.from(JSON.stringify(m, null, 2) + '\n', 'utf8');
  if (!canonicalBytes.equals(manifestBytes)) {
    return {ok: false, reason: 'R3_SNAPSHOT_MANIFEST_NONCANONICAL'};
  }
  if (sha256Hex(manifestBytes) !== expectedSha256) {
    return {ok: false, reason: 'R3_SNAPSHOT_HASH_MISMATCH'};
  }
  const actualEntries = fs.readdirSync(abs).sort();
  const expectedEntries = [...Object.keys(m.files), 'manifest.json'].sort();
  if (JSON.stringify(actualEntries) !== JSON.stringify(expectedEntries)) {
    return {ok: false, reason: 'R3_SNAPSHOT_EXTRA_OR_MISSING_FILE'};
  }
  const files = {};
  for (const [name, expectedFileHash] of Object.entries(m.files)) {
    if (typeof name !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(name) || name.includes('..')) {
      return {ok: false, reason: 'R3_SNAPSHOT_MANIFEST_INVALID'};
    }
    if (!HEX64_RE.test(expectedFileHash)) return {ok: false, reason: 'R3_SNAPSHOT_MANIFEST_INVALID'};
    const filePath = path.join(abs, name);
    const fst = fs.lstatSync(filePath);
    if (!fst.isFile() || fst.isSymbolicLink()) return {ok: false, reason: 'R3_SNAPSHOT_UNSAFE'};
    const bytes = fs.readFileSync(filePath);
    if (sha256Hex(bytes) !== expectedFileHash) {
      return {ok: false, reason: 'R3_SNAPSHOT_HASH_MISMATCH'};
    }
    files[name] = bytes.toString('utf8');
  }
  return {ok: true, files};
}

/**
 * Pure read-only equivalent of scripts/r3_p1_common.mjs p1State(plan) (B8).
 */
function readAndValidateP1State(plan) {
  const r = plan.v3?.r3;
  if (!isPlainObject(r) || !hasOwn(r, 'p1')) {
    return {present: false, ok: true, state: null};
  }
  const s = r.p1;
  if (!isPlainObject(s) ||
      s.schemaVersion !== 1 ||
      !Number.isSafeInteger(s.baselineUpto) || s.baselineUpto < 0 ||
      typeof s.projectId !== 'string' || !s.projectId.trim() || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(s.projectId) ||
      !isPlainObject(s.legacyReviews) ||
      !Array.isArray(s.reviewHistory)) {
    return {present: true, ok: false, state: null, reason: 'R3_P1_STATE_INVALID'};
  }
  return {present: true, ok: true, state: s};
}

/**
 * Pure read-only equivalent of scripts/r3_p1_common.mjs verifyP1Registration() (B8).
 */
function verifyP1RegistrationReadOnly(p1StateObj, kind, end, record, packet) {
  if (!p1StateObj) return null;
  if (packet.p1Protocol !== 1) {
    const old = p1StateObj.legacyReviews[`${kind}:${end}`];
    if (!isPlainObject(old) || old.inputSha256 !== record.inputSha256 || old.reviewSha256 !== record.reviewSha256) {
      return 'R3_P1_UNREGISTERED_LEGACY_REVIEW';
    }
    return null;
  }
  if (!p1StateObj.reviewHistory.some(h =>
    isPlainObject(h) &&
    h.kind === kind &&
    h.end === end &&
    h.revision === record.revision &&
    h.path === record.reviewPath &&
    h.sha256 === record.reviewSha256
  )) {
    return 'R3_P1_REVIEW_HISTORY_MISSING';
  }
  return null;
}

/**
 * Pure read-only verification of a `status: 'passed'` chapter or arc review record in plan.v3.r2,
 * equivalent to scripts/r2_review_common.mjs verify() + validate() + verifyP1Registration() +
 * verifyR3ManuscriptSnapshot() (without importing write-capable modules).
 */
function verifyPassedReviewEvidence(root, plan, kind, end, rec, resolveDiskHash, p1StateObj) {
  if (!['chapter', 'arc'].includes(kind)) {
    return {ok: false, reason: 'R2_KIND_INVALID'};
  }
  if (!Number.isSafeInteger(end) || end < 1 || (kind === 'arc' && (end < 6 || end % 3 !== 0))) {
    return {ok: false, reason: 'R2_SCOPE_INVALID'};
  }
  if (!Number.isSafeInteger(rec.revision) || rec.revision < 1) {
    return {ok: false, reason: 'R2_REVISION_INVALID'};
  }
  const ip = inspectSafeFile(root, rec.inputPath);
  const rp = inspectSafeFile(root, rec.reviewPath);
  if (ip.status !== 'ok' || rp.status !== 'ok') {
    return {ok: false, reason: 'R2_REVIEW_OR_INPUT_FILE_MISSING'};
  }
  if (typeof rec.inputSha256 !== 'string' || !HEX64_RE.test(rec.inputSha256) ||
      typeof rec.reviewSha256 !== 'string' || !HEX64_RE.test(rec.reviewSha256)) {
    return {ok: false, reason: 'R2_REVIEW_OR_INPUT_SHA_INVALID'};
  }
  const ib = fs.readFileSync(ip.realPath);
  const rb = fs.readFileSync(rp.realPath);
  if (sha256Hex(ib) !== rec.inputSha256 || sha256Hex(rb) !== rec.reviewSha256) {
    return {ok: false, reason: 'R2_REVIEW_OR_INPUT_CHANGED'};
  }

  let packet;
  let report;
  try {
    packet = JSON.parse(ib.toString('utf8').replace(/^\uFEFF/, ''));
    report = JSON.parse(rb.toString('utf8').replace(/^\uFEFF/, ''));
  } catch {
    return {ok: false, reason: 'R2_BAD_JSON'};
  }
  if (!isPlainObject(packet) || !isPlainObject(report)) {
    return {ok: false, reason: 'R2_BAD_JSON_STRUCTURE'};
  }

  const numbers = reviewScopeNumbers(kind, end);
  const expectedKeys = numbers.map(n => String(n));
  const sameScopeHashes = (a, b) =>
    isPlainObject(a) && isPlainObject(b) &&
    Object.keys(a).length === expectedKeys.length && Object.keys(b).length === expectedKeys.length &&
    expectedKeys.every(k => typeof a[k] === 'string' && HEX64_RE.test(a[k]) && a[k] === b[k]);

  if (packet.schemaVersion !== 1 || packet.kind !== kind || packet.end !== end ||
      packet.revision !== rec.revision || !sameScopeHashes(packet.manuscriptHashes, rec.manuscriptHashes)) {
    return {ok: false, reason: 'R2_PACKET_MISMATCH'};
  }
  if (!Array.isArray(packet.writers) || packet.writers.length === 0 ||
      packet.writers.some(w => !isPlainObject(w) || typeof w.runId !== 'string' || !w.runId.trim() ||
        typeof w.contextId !== 'string' || !w.contextId.trim())) {
    return {ok: false, reason: 'R2_WRITER_PROVENANCE_INVALID'};
  }

  // Verify EVERY chapter in scope matches disk hash
  const diskByChapter = new Map();
  for (const n of numbers) {
    const disk = resolveDiskHash(n);
    if (!disk.ok) {
      return {ok: false, chapter: n, reason: disk.reason};
    }
    const expectedHash = packet.manuscriptHashes[String(n)];
    if (disk.sha256 !== expectedHash) {
      return {
        ok: false,
        chapter: n,
        reason: 'R2_MANUSCRIPT_CHANGED',
        expectedSha256: expectedHash,
        actualSha256: disk.sha256,
      };
    }
    diskByChapter.set(n, disk);
  }

  // B9: If R3 namespace is enabled, verify immutable r3Snapshot with exact file-set equivalence to r3_manuscripts.mjs
  if (isPlainObject(plan.v3) && hasOwn(plan.v3, 'r3')) {
    if (!isPlainObject(rec.r3Snapshot) || !isPlainObject(packet.r3Snapshot) ||
        rec.r3Snapshot.path !== packet.r3Snapshot.path || rec.r3Snapshot.sha256 !== packet.r3Snapshot.sha256) {
      return {ok: false, reason: 'R3_MANUSCRIPT_SNAPSHOT_MISSING_OR_MISMATCH'};
    }
    const snap = verifyReadOnlySnapshot(root, rec.r3Snapshot.path, rec.r3Snapshot.sha256);
    if (!snap.ok) {
      return {ok: false, reason: snap.reason};
    }
    const expectedFileNames = new Set(numbers.map(n => `chapter-${String(n).padStart(4, '0')}.md`));
    for (const name of Object.keys(snap.files)) {
      if (name !== 'diff.md' && !expectedFileNames.has(name)) {
        return {ok: false, reason: 'R3_MANUSCRIPT_SNAPSHOT_EXTRA_FILE'};
      }
    }
    for (const n of numbers) {
      const snapName = `chapter-${String(n).padStart(4, '0')}.md`;
      if (!hasOwn(snap.files, snapName) ||
          sha256Hex(Buffer.from(snap.files[snapName], 'utf8')) !== diskByChapter.get(n).sha256) {
        return {ok: false, chapter: n, reason: 'R3_MANUSCRIPT_SNAPSHOT_CONTENT_MISMATCH'};
      }
    }
  }

  // B8: Verify P1 registration equivalence when P1 state is active
  const p1RegErr = verifyP1RegistrationReadOnly(p1StateObj, kind, end, rec, packet);
  if (p1RegErr) {
    return {ok: false, reason: p1RegErr};
  }

  // Validate report content, independent reviewer, and pass_candidate decision (matches r2_review_common.mjs)
  if (report.schemaVersion !== 1 || report.kind !== kind || report.end !== end ||
      report.revision !== packet.revision || !sameScopeHashes(report.manuscriptHashes, packet.manuscriptHashes)) {
    return {ok: false, reason: 'R2_REPORT_SCOPE_OR_HASH_MISMATCH'};
  }
  if (!isPlainObject(report.reviewer) || report.reviewer.kind !== 'independent_agent' ||
      typeof report.reviewer.runId !== 'string' || !report.reviewer.runId.trim() ||
      typeof report.reviewer.contextId !== 'string' || !report.reviewer.contextId.trim()) {
    return {ok: false, reason: 'R2_REVIEWER_MISSING'};
  }
  if (packet.writers.some(w => w.runId === report.reviewer.runId || w.contextId === report.reviewer.contextId)) {
    return {ok: false, reason: 'R2_SELF_REVIEW'};
  }
  if (report.decision !== 'pass_candidate' || typeof report.summary !== 'string' || !report.summary.trim() ||
      !Array.isArray(report.issues)) {
    return {ok: false, reason: 'R2_REPORT_NOT_VALID_PASS'};
  }

  const allowP1 = Boolean(p1StateObj);
  const allowS1 = Boolean(allowP1 && packet.p1Protocol === 1);
  const allowedSeverities = allowS1 ? ['BLOCKER', 'MAJOR', 'MINOR', 'SUGGESTION'] : ['BLOCKER', 'MAJOR', 'MINOR'];
  const ids = new Set();
  for (const i of report.issues) {
    if (!isPlainObject(i) || typeof i.id !== 'string' || !i.id.trim() || ids.has(i.id) ||
        !allowedSeverities.includes(i.severity) ||
        !['open', 'resolved', 'accepted'].includes(i.status) ||
        !numbers.includes(i.chapter) ||
        typeof i.quote !== 'string' || !i.quote.trim() ||
        typeof i.reason !== 'string' || !i.reason.trim() ||
        typeof i.suggestion !== 'string' || !i.suggestion.trim() ||
        (i.status === 'accepted' && !(typeof i.acceptanceReason === 'string' && i.acceptanceReason.trim()))) {
      return {ok: false, reason: 'R2_INVALID_ISSUE'};
    }
    if (i.severity === 'SUGGESTION' &&
        ((i.blocking !== undefined && i.blocking !== false) ||
         (i.mustCloseInReReview !== undefined && i.mustCloseInReReview !== false) ||
         i.disposition === 'fix_now' || i.disposition === 'fix_in_arc')) {
      return {ok: false, reason: 'R2_SUGGESTION_CANNOT_BLOCK'};
    }
    if ((i.status === 'open' && ['BLOCKER', 'MAJOR'].includes(i.severity) &&
         !(allowP1 && packet.p1Protocol === 1 && kind === 'chapter' && i.severity === 'MAJOR' &&
           i.classification === 'B' && i.disposition === 'fix_in_arc')) ||
        (i.status === 'accepted' && i.severity === 'BLOCKER')) {
      return {ok: false, reason: 'R2_UNRESOLVED_ISSUES'};
    }
    ids.add(i.id);
  }

  return {ok: true};
}

/**
 * Pure read-only audit of historical passed reviews under reviews/r2/ and p1.reviewHistory (B7).
 * Prevents bypassing finalized-chapter protection by:
 *  - running `r2_review.mjs prepare` on a finalized chapter (which overwrites status 'passed' -> 'under_review'), OR
 *  - deleting a finalized entry from plan.v3.r2.chapterReviews / arcReviews while keeping an empty index.
 */
function auditHistoricalPassedReviews(root, plan, resolveDiskHash, p1StateObj) {
  const errors = [];
  const r2DirRel = 'reviews/r2';
  const dirCandidate = path.resolve(root, r2DirRel);
  const rel = path.relative(root, dirCandidate);

  if (rel && !rel.startsWith('..')) {
    let lst = null;
    try {
      lst = fs.lstatSync(dirCandidate);
    } catch (err) {
      if (!err || err.code !== 'ENOENT') {
        errors.push({
          code: 'STALE_REVIEW_AFTER_EDIT',
          source: r2DirRel,
          reason: err?.code || 'R2_DIR_STAT_ERROR',
          message: `无法读取历史审稿目录 ${r2DirRel}（${err?.code || 'STAT_ERROR'}），Fail-Closed 阻断。`,
        });
      }
    }
    if (lst) {
      if (lst.isSymbolicLink() || !lst.isDirectory()) {
        errors.push({
          code: 'STALE_REVIEW_AFTER_EDIT',
          source: r2DirRel,
          reason: 'R2_DIR_UNSAFE_OR_NOT_DIR',
          message: `历史审稿目录 ${r2DirRel} 为符号链接或非目录，Fail-Closed 阻断。`,
        });
      } else {
        let entries = null;
        try {
          const realDir = fs.realpathSync(dirCandidate);
          const realRel = path.relative(root, realDir);
          if (!realRel || realRel.startsWith('..')) {
            errors.push({
              code: 'STALE_REVIEW_AFTER_EDIT',
              source: r2DirRel,
              reason: 'R2_DIR_SYMLINK_ESCAPE',
              message: `历史审稿目录 ${r2DirRel} 逃逸项目根目录，Fail-Closed 阻断。`,
            });
          } else {
            entries = fs.readdirSync(realDir).sort();
          }
        } catch (err) {
          errors.push({
            code: 'STALE_REVIEW_AFTER_EDIT',
            source: r2DirRel,
            reason: err?.code || 'R2_DIR_READDIR_FAILED',
            message: `历史审稿目录 ${r2DirRel} 无法枚举（${err?.code || 'READDIR_ERROR'}），Fail-Closed 阻断。`,
          });
        }

        if (entries) {
          for (const name of entries) {
            if (!name.endsWith('.json')) continue;
            const fileRel = path.join(r2DirRel, name);
            const inspected = inspectSafeFile(root, fileRel);
            if (inspected.status !== 'ok') {
              errors.push({
                code: 'STALE_REVIEW_AFTER_EDIT',
                source: fileRel,
                reason: inspected.reason,
                message: `历史审稿文件 ${fileRel} 路径异常或不可读（${inspected.reason}），Fail-Closed 阻断。`,
              });
              continue;
            }
            let report;
            try {
              report = JSON.parse(fs.readFileSync(inspected.realPath, 'utf8').replace(/^\uFEFF/, ''));
            } catch {
              continue;
            }
            if (!isPlainObject(report) || report.schemaVersion !== 1 ||
                !['chapter', 'arc'].includes(report.kind) ||
                !Number.isSafeInteger(report.end) || report.end < 1 ||
                (report.kind === 'arc' && (report.end < 6 || report.end % 3 !== 0)) ||
                report.decision !== 'pass_candidate' ||
                !isPlainObject(report.manuscriptHashes)) {
              continue;
            }

            // Verify every chapter covered by this historical passed review still matches disk!
            const numbers = reviewScopeNumbers(report.kind, report.end);
            for (const c of numbers) {
              const expectedHash = report.manuscriptHashes[String(c)];
              if (typeof expectedHash !== 'string' || !HEX64_RE.test(expectedHash)) continue;
              const disk = resolveDiskHash(c);
              if (!disk.ok || disk.sha256 !== expectedHash) {
                errors.push({
                  code: 'STALE_REVIEW_AFTER_EDIT',
                  chapter: c,
                  source: fileRel,
                  reason: 'HISTORICAL_PASSED_REVIEW_MANUSCRIPT_CHANGED',
                  expectedSha256: expectedHash,
                  ...(disk.ok ? {actualSha256: disk.sha256} : {}),
                  message: `历史已通过审稿 ${fileRel} 对应的第 ${c} 章正文已被修改或丢失（即使计划索引已被 prepare 覆盖或删除，原定稿基线仍受完整性保护）。`,
                });
              }
            }

            // If v3.r2 is enabled, a historical passed review cannot have its plan index silently deleted
            if (isPlainObject(plan.v3?.r2)) {
              const bucketKey = report.kind === 'chapter' ? 'chapterReviews' : 'arcReviews';
              const bucket = plan.v3.r2[bucketKey];
              if (!isPlainObject(bucket) || !hasOwn(bucket, String(report.end))) {
                errors.push({
                  code: 'STALE_REVIEW_AFTER_EDIT',
                  chapter: report.end,
                  source: fileRel,
                  reason: 'HISTORICAL_PASSED_REVIEW_MISSING_FROM_PLAN',
                  message: `磁盘存在历史已通过审稿 ${fileRel}，但 02-写作计划.json 的 v3.r2.${bucketKey}["${report.end}"] 索引缺失，禁止通过删索引绕过定稿基线。`,
                });
              }
            }
          }
        }
      }
    }
  }

  // Also audit p1State.reviewHistory entries on disk (B7 + B8)
  if (p1StateObj) {
    const seenHistory = new Set();
    for (const item of p1StateObj.reviewHistory) {
      if (!isPlainObject(item) || !['chapter', 'arc', 'pilot'].includes(item.kind) ||
          !Number.isSafeInteger(item.end) || item.end < 1 ||
          !Number.isSafeInteger(item.revision) || item.revision < 1 ||
          typeof item.path !== 'string' || !item.path.trim() ||
          typeof item.sha256 !== 'string' || !HEX64_RE.test(item.sha256)) {
        errors.push({
          code: 'STALE_REVIEW_AFTER_EDIT',
          source: 'v3.r3.p1.reviewHistory',
          reason: 'R3_P1_HISTORY_INVALID',
          message: 'v3.r3.p1.reviewHistory 存在格式非法的注册记录。',
        });
        continue;
      }
      const hk = `${item.kind}:${item.end}:${item.revision}`;
      if (seenHistory.has(hk)) {
        errors.push({
          code: 'STALE_REVIEW_AFTER_EDIT',
          chapter: item.end,
          source: 'v3.r3.p1.reviewHistory',
          reason: 'R3_P1_DUPLICATE_HISTORY',
          message: `v3.r3.p1.reviewHistory 存在重复注册记录 ${hk}。`,
        });
        continue;
      }
      seenHistory.add(hk);
      const inspected = inspectSafeFile(root, item.path);
      if (inspected.status !== 'ok') {
        errors.push({
          code: 'STALE_REVIEW_AFTER_EDIT',
          chapter: item.end,
          source: item.path,
          reason: 'R3_P1_HISTORY_FILE_MISSING',
          message: `P1 历史审稿文件 ${item.path} 缺失或路径非法。`,
        });
        continue;
      }
      const bytes = fs.readFileSync(inspected.realPath);
      if (sha256Hex(bytes) !== item.sha256) {
        errors.push({
          code: 'STALE_REVIEW_AFTER_EDIT',
          chapter: item.end,
          source: item.path,
          reason: 'R3_P1_HISTORY_CHANGED',
          message: `P1 历史审稿文件 ${item.path} 哈希与注册记录不匹配。`,
        });
        continue;
      }
      let report;
      try {
        report = JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/, ''));
      } catch {
        errors.push({
          code: 'STALE_REVIEW_AFTER_EDIT',
          chapter: item.end,
          source: item.path,
          reason: 'R3_P1_HISTORY_INVALID',
          message: `P1 历史审稿文件 ${item.path} JSON 损坏。`,
        });
        continue;
      }
      if (report?.decision === 'pass_candidate' && isPlainObject(report.manuscriptHashes)) {
        for (const c of reviewScopeNumbers(item.kind, item.end)) {
          const expectedHash = report.manuscriptHashes[String(c)];
          if (typeof expectedHash === 'string' && HEX64_RE.test(expectedHash)) {
            const disk = resolveDiskHash(c);
            if (!disk.ok || disk.sha256 !== expectedHash) {
              errors.push({
                code: 'STALE_REVIEW_AFTER_EDIT',
                chapter: c,
                source: item.path,
                reason: 'HISTORICAL_PASSED_REVIEW_MANUSCRIPT_CHANGED',
                expectedSha256: expectedHash,
                ...(disk.ok ? {actualSha256: disk.sha256} : {}),
                message: `P1 历史已通过审稿 ${item.path} 对应的第 ${c} 章正文已被修改或丢失。`,
              });
            }
          }
        }
      }
    }
  }

  return errors;
}

/**
 * Inspect reviews/r3/retcons/ strictly read-only (B6 Fail-Closed).
 * Distinguishes:
 *  - directory truly absent (ENOENT) -> []
 *  - directory unreadable / symlink escape / readdirSync failure -> corrupt error entry
 *  - any non-rolled-back retcon record -> reported so P0-3 stays Fail-Closed until P0-4/P1-4 exist
 */
function inspectRetconDirectory(root) {
  const retconDirRel = 'reviews/r3/retcons';
  const dirCandidate = path.resolve(root, retconDirRel);
  const rel = path.relative(root, dirCandidate);
  if (!rel || rel.startsWith('..')) {
    return [{relPath: retconDirRel, corrupt: true, reason: 'RETCON_DIR_UNSAFE'}];
  }
  let lst;
  try {
    lst = fs.lstatSync(dirCandidate);
  } catch (err) {
    if (err && err.code === 'ENOENT') return [];
    return [{relPath: retconDirRel, corrupt: true, reason: err?.code || 'RETCON_DIR_STAT_ERROR'}];
  }
  if (lst.isSymbolicLink() || !lst.isDirectory()) {
    return [{relPath: retconDirRel, corrupt: true, reason: 'RETCON_DIR_UNSAFE_OR_NOT_DIR'}];
  }
  let realDir;
  try {
    realDir = fs.realpathSync(dirCandidate);
    const realRel = path.relative(root, realDir);
    if (!realRel || realRel.startsWith('..')) {
      return [{relPath: retconDirRel, corrupt: true, reason: 'RETCON_DIR_SYMLINK_ESCAPE'}];
    }
  } catch {
    return [{relPath: retconDirRel, corrupt: true, reason: 'RETCON_DIR_UNREADABLE'}];
  }
  let entries;
  try {
    entries = fs.readdirSync(realDir).sort();
  } catch (err) {
    return [{relPath: retconDirRel, corrupt: true, reason: err?.code || 'RETCON_DIR_READDIR_FAILED'}];
  }
  const records = [];
  for (const name of entries) {
    if (!name.endsWith('.json')) continue;
    const relPath = path.join(retconDirRel, name);
    const inspected = inspectSafeFile(root, relPath);
    if (inspected.status !== 'ok') {
      records.push({relPath, corrupt: true, reason: inspected.reason});
      continue;
    }
    try {
      const rec = JSON.parse(fs.readFileSync(inspected.realPath, 'utf8').replace(/^\uFEFF/, ''));
      if (!isPlainObject(rec)) {
        records.push({relPath, corrupt: true, reason: 'NOT_OBJECT'});
      } else {
        records.push({relPath, corrupt: false, rec});
      }
    } catch {
      records.push({relPath, corrupt: true, reason: 'BAD_JSON'});
    }
  }
  return records;
}

/**
 * Fail-Closed finalized chapter integrity audit (B1–B9):
 *  1. Validates P1 state structure (B8), v3.pilotGate / v3.pilot, v3.r2.chapterReviews & arcReviews
 *     (full R2/R3 review evidence + P1 registration + strict R3 snapshot file-set equivalence, B2/B5/B7/B8/B9),
 *     and explicit chapter.finalizedSha256 independently.
 *  2. Audits historical passed reviews in reviews/r2/ and p1.reviewHistory (B7) so `r2_review.mjs prepare`
 *     overwriting status to `under_review` or deleting a plan index entry cannot erase finalized baselines.
 *  3. Keeps ALL forward retcon recovery strictly Fail-Closed in P0-3 (B1/B3/B4/B6) until P0-4/P1-4 exist.
 */
function checkFinalizedChapterIntegrity(root, plan) {
  const errors = [];
  const expectedSimpleBaselines = [];
  const actualDiskHashes = new Map();

  const resolveDiskHash = chNum => {
    if (actualDiskHashes.has(chNum)) return actualDiskHashes.get(chNum);
    const entry = plan.chapters.find(c => c?.chapterNumber === chNum);
    if (!entry) {
      const res = {ok: false, reason: 'CHAPTER_MAPPING_MISSING'};
      actualDiskHashes.set(chNum, res);
      return res;
    }
    const inspected = inspectSafeFile(root, entry.filePath);
    if (inspected.status !== 'ok') {
      const res = {ok: false, reason: inspected.reason};
      actualDiskHashes.set(chNum, res);
      return res;
    }
    const res = {ok: true, sha256: sha256Hex(fs.readFileSync(inspected.realPath))};
    actualDiskHashes.set(chNum, res);
    return res;
  };

  // 0. Validate P1 state structure if present (B8)
  const p1Check = readAndValidateP1State(plan);
  if (!p1Check.ok) {
    errors.push({
      code: 'STALE_REVIEW_AFTER_EDIT',
      source: 'v3.r3.p1',
      reason: p1Check.reason,
      message: 'v3.r3.p1 状态结构畸形，无法核验 P1 审稿注册基线（Fail-Closed）。',
    });
  }
  const p1StateObj = p1Check.ok ? p1Check.state : null;

  // 1a. Approved Pilot hashes (v3.pilot)
  if (plan.v3?.pilot?.status === 'approved') {
    const pilotHashes = plan.v3.pilot.manuscriptHashes;
    if (!isPlainObject(pilotHashes)) {
      errors.push({
        code: 'STALE_REVIEW_AFTER_EDIT',
        source: 'v3.pilot',
        message: '已批准 Pilot 缺少合法的 manuscriptHashes 映射，完整性基线破损。',
      });
    } else {
      const pilotKeys = new Set(['1', '2', '3', ...Object.keys(pilotHashes)]);
      for (const k of [...pilotKeys].sort((a, b) => Number(a) - Number(b))) {
        const h = pilotHashes[k];
        if (!/^[1-9]\d*$/.test(k) || typeof h !== 'string' || !HEX64_RE.test(h)) {
          errors.push({
            code: 'STALE_REVIEW_AFTER_EDIT',
            chapter: /^[1-9]\d*$/.test(k) ? Number(k) : null,
            source: 'v3.pilot',
            message: `已批准 Pilot 第 ${k} 章缺少有效的 64 位 SHA-256 基线哈希，禁止静默跳过。`,
          });
        } else {
          expectedSimpleBaselines.push({chapter: Number(k), sha256: h, source: 'v3.pilot'});
        }
      }
    }
  }

  // 1b. Passed Pilot Gate hashes (v3.pilotGate, matching v3_gate.mjs)
  if (plan.v3?.pilotGate?.status === 'passed') {
    const gateHashes = plan.v3.pilotGate.reviewedChapterHashes;
    if (!isPlainObject(gateHashes)) {
      errors.push({
        code: 'STALE_REVIEW_AFTER_EDIT',
        source: 'v3.pilotGate',
        message: '已通过 Pilot Gate 缺少合法的 reviewedChapterHashes 映射，完整性基线破损。',
      });
    } else {
      const gateKeys = new Set(['1', '2', '3', ...Object.keys(gateHashes)]);
      for (const k of [...gateKeys].sort((a, b) => Number(a) - Number(b))) {
        const h = gateHashes[k];
        if (!/^[1-9]\d*$/.test(k) || typeof h !== 'string' || !HEX64_RE.test(h)) {
          errors.push({
            code: 'STALE_REVIEW_AFTER_EDIT',
            chapter: /^[1-9]\d*$/.test(k) ? Number(k) : null,
            source: 'v3.pilotGate',
            message: `已通过 Pilot Gate 第 ${k} 章缺少有效的 64 位 SHA-256 基线哈希，禁止静默跳过。`,
          });
        } else {
          expectedSimpleBaselines.push({chapter: Number(k), sha256: h, source: 'v3.pilotGate'});
        }
      }
    }
  }

  // 2. Strict R2 namespace structure & full passed chapterReviews + arcReviews evidence verification (B2/B5/B7/B8/B9)
  if (isPlainObject(plan.v3) && hasOwn(plan.v3, 'r2')) {
    const r2Obj = plan.v3.r2;
    if (!isPlainObject(r2Obj) || r2Obj.schemaVersion !== 1 ||
        !hasOwn(r2Obj, 'chapterReviews') || !isPlainObject(r2Obj.chapterReviews)) {
      errors.push({
        code: 'STALE_REVIEW_AFTER_EDIT',
        source: 'v3.r2',
        message: 'v3.r2 命名空间已启用但状态结构不完整（缺少合法 schemaVersion 或 chapterReviews 索引），拒绝静默跳过。',
      });
    } else {
      const buckets = [{kind: 'chapter', prop: 'chapterReviews', map: r2Obj.chapterReviews}];
      if (hasOwn(r2Obj, 'arcReviews')) {
        if (!isPlainObject(r2Obj.arcReviews)) {
          errors.push({
            code: 'STALE_REVIEW_AFTER_EDIT',
            source: 'v3.r2.arcReviews',
            message: 'v3.r2.arcReviews 结构损坏（非对象），拒绝静默跳过。',
          });
        } else {
          buckets.push({kind: 'arc', prop: 'arcReviews', map: r2Obj.arcReviews});
        }
      }

      for (const {kind, prop, map} of buckets) {
        for (const [k, rec] of Object.entries(map)) {
          if (!isPlainObject(rec)) {
            errors.push({
              code: 'STALE_REVIEW_AFTER_EDIT',
              chapter: /^[1-9]\d*$/.test(k) ? Number(k) : null,
              source: `v3.r2.${prop}`,
              message: `v3.r2.${prop}["${k}"] 记录为非法空值或非对象，拒绝静默跳过。`,
            });
            continue;
          }
          if (!R2_VALID_STATUSES.includes(rec.status)) {
            errors.push({
              code: 'STALE_REVIEW_AFTER_EDIT',
              chapter: /^[1-9]\d*$/.test(k) ? Number(k) : null,
              source: `v3.r2.${prop}`,
              reason: 'R2_REVIEW_STATUS_INVALID',
              message: `v3.r2.${prop}["${k}"].status 值非法（${String(rec.status)}），拒绝静默跳过。`,
            });
            continue;
          }
          if (rec.status !== 'passed') continue;
          if (!/^[1-9]\d*$/.test(k)) {
            errors.push({
              code: 'STALE_REVIEW_AFTER_EDIT',
              source: `v3.r2.${prop}`,
              message: `已通过审稿记录的章号键 "${k}" 非法，无法映射章节基线。`,
            });
            continue;
          }
          const end = Number(k);
          const verified = verifyPassedReviewEvidence(root, plan, kind, end, rec, resolveDiskHash, p1StateObj);
          if (!verified.ok) {
            errors.push({
              code: 'STALE_REVIEW_AFTER_EDIT',
              chapter: verified.chapter ?? end,
              source: `v3.r2.${prop}`,
              reason: verified.reason,
              ...(verified.expectedSha256 ? {expectedSha256: verified.expectedSha256} : {}),
              ...(verified.actualSha256 ? {actualSha256: verified.actualSha256} : {}),
              message: `已定稿 ${kind} #${end} 复审证据核验失败（${verified.reason}），禁止凭计划 JSON 状态字面放行。`,
            });
          }
        }
      }
    }
  }

  // 3. Audit historical passed reviews on disk (reviews/r2/ & p1.reviewHistory) against prepare-overwrite / index-deletion (B7)
  errors.push(...auditHistoricalPassedReviews(root, plan, resolveDiskHash, p1StateObj));

  // 4. Explicit finalizedSha256 on chapter entries (Fail-Closed if present and malformed)
  for (const ch of plan.chapters) {
    if (!isPlainObject(ch) || !hasOwn(ch, 'finalizedSha256')) continue;
    if (typeof ch.finalizedSha256 !== 'string' || !HEX64_RE.test(ch.finalizedSha256)) {
      errors.push({
        code: 'STALE_REVIEW_AFTER_EDIT',
        chapter: Number.isSafeInteger(ch.chapterNumber) ? ch.chapterNumber : null,
        source: 'chapter.finalizedSha256',
        message: `第 ${ch.chapterNumber} 章显式 finalizedSha256 哈希格式非法，禁止静默跳过。`,
      });
    } else {
      expectedSimpleBaselines.push({
        chapter: ch.chapterNumber,
        sha256: ch.finalizedSha256,
        source: 'chapter.finalizedSha256',
      });
    }
  }

  // 5. Verify every Pilot / PilotGate / finalizedSha256 baseline independently against disk
  expectedSimpleBaselines.sort((a, b) => a.chapter - b.chapter || a.source.localeCompare(b.source));
  for (const {chapter: chNum, sha256: expectedHash, source} of expectedSimpleBaselines) {
    const disk = resolveDiskHash(chNum);
    if (!disk.ok) {
      errors.push({
        code: 'STALE_REVIEW_AFTER_EDIT',
        chapter: chNum,
        source,
        reason: disk.reason,
        message:
          disk.reason === 'CHAPTER_MAPPING_MISSING'
            ? `已定稿第 ${chNum} 章在 02-写作计划.json 中缺少章节映射条目，禁止绕过完整性保护。`
            : `已定稿第 ${chNum} 章文件缺失或路径异常（${disk.reason}），完整性基线破损。`,
      });
      continue;
    }
    if (disk.sha256 !== expectedHash) {
      errors.push({
        code: 'STALE_REVIEW_AFTER_EDIT',
        chapter: chNum,
        source,
        expectedSha256: expectedHash,
        actualSha256: disk.sha256,
        message: `已定稿第 ${chNum} 章正文与已定稿基线不一致（预期哈希 ${expectedHash.slice(0, 12)}…，实际 ${disk.sha256.slice(0, 12)}…）。`,
      });
    }
  }

  // 6. Inspect reviews/r3/retcons/ strictly Fail-Closed (B1/B3/B4/B6):
  //    Until P0-4 (five-tuple reviewFingerprint) and P1-4 (analyze_impact.mjs + explicit retcon protocol)
  //    are implemented, P0-3 MUST NOT allow any forward retcon record to lift STALE_REVIEW_AFTER_EDIT.
  const retconEntries = inspectRetconDirectory(root);
  for (const entry of retconEntries) {
    if (entry.corrupt) {
      errors.push({
        code: 'STALE_REVIEW_AFTER_EDIT',
        source: entry.relPath,
        reason: entry.reason,
        message: `retcon 目录或记录 ${entry.relPath} 损坏/不可枚举（${entry.reason}），Fail-Closed 阻断。`,
      });
      continue;
    }
    const rec = entry.rec;
    if (rec.status === 'rolled_back') {
      continue;
    }
    errors.push({
      code: 'STALE_REVIEW_AFTER_EDIT',
      chapter: Number.isSafeInteger(rec.chapter) ? rec.chapter : null,
      source: entry.relPath,
      reason: 'RETCON_RECOVERY_REQUIRES_P0_4_AND_P1_4',
      message:
        `检测到未闭合的 retcon 记录 ${entry.relPath}（status=${String(rec.status)}）。` +
        '完整显式 retcon 恢复核验依赖后续 P0-4（五元组 reviewFingerprint）与 P1-4（analyze_impact.mjs 及显式 retcon 协议）；' +
        '在下游证据能力就绪前，P0-3 严格保持 Fail-Closed 阻断（仅回滚至已验证的原定稿基线方可解除）。',
    });
  }

  return errors;
}

/**
 * Validate and merge global (plan.hardConstraints) and chapter-level (chapterEntry.hardConstraints).
 * Strictly Fail-Closed on malformed types so invalid author constraints never silently fail open.
 */
function parseAndValidateHardConstraints(plan, chapterEntry) {
  const errors = [];
  const merged = {
    mustInclude: [],
    mustExclude: [],
    enforceMinWords: false,
    minWords: null,
    enforceMaxWords: false,
    maxWords: null,
    enforceNoDuplicateParagraphs: false,
    needSemanticAudit: [],
  };

  const sources = [];
  if (hasOwn(plan, 'hardConstraints')) {
    sources.push({label: 'plan.hardConstraints', value: plan.hardConstraints});
  }
  if (hasOwn(chapterEntry, 'hardConstraints')) {
    sources.push({label: `chapter[${chapterEntry.chapterNumber}].hardConstraints`, value: chapterEntry.hardConstraints});
  }

  for (const {label, value} of sources) {
    if (!isPlainObject(value)) {
      errors.push({
        code: 'HARD_CONSTRAINTS_INVALID',
        message: `${label} 必须为普通 JSON 对象，拒绝畸形配置。`,
      });
      continue;
    }

    for (const boolKey of ['enforceMinWords', 'enforceMaxWords', 'enforceNoDuplicateParagraphs']) {
      if (hasOwn(value, boolKey)) {
        if (typeof value[boolKey] !== 'boolean') {
          errors.push({
            code: 'HARD_CONSTRAINTS_INVALID',
            message: `${label}.${boolKey} 必须为布尔值（true/false），收到 ${typeof value[boolKey]}。`,
          });
        } else {
          merged[boolKey] = value[boolKey];
        }
      }
    }

    for (const numKey of ['minWords', 'maxWords']) {
      if (hasOwn(value, numKey)) {
        if (!Number.isSafeInteger(value[numKey]) || value[numKey] <= 0) {
          errors.push({
            code: 'HARD_CONSTRAINTS_INVALID',
            message: `${label}.${numKey} 必须为正整数。`,
          });
        } else {
          merged[numKey] = value[numKey];
        }
      }
    }

    for (const listKey of ['mustInclude', 'mustExclude']) {
      if (!hasOwn(value, listKey)) continue;
      if (!Array.isArray(value[listKey])) {
        errors.push({
          code: 'HARD_CONSTRAINTS_INVALID',
          message: `${label}.${listKey} 必须为字符串或规则对象数组。`,
        });
        continue;
      }
      for (const [idx, item] of value[listKey].entries()) {
        if (typeof item === 'string') {
          if (!item.trim()) {
            errors.push({
              code: 'HARD_CONSTRAINTS_INVALID',
              message: `${label}.${listKey}[${idx}] 不能为空字符串。`,
            });
          } else {
            merged[listKey].push({text: item, label: item});
          }
        } else if (isPlainObject(item) && typeof item.text === 'string' && item.text.trim()) {
          merged[listKey].push({
            text: item.text,
            label: typeof item.label === 'string' && item.label.trim() ? item.label.trim() : item.text,
          });
        } else {
          errors.push({
            code: 'HARD_CONSTRAINTS_INVALID',
            message: `${label}.${listKey}[${idx}] 格式非法，需为非空字符串或 { text } 对象。`,
          });
        }
      }
    }

    for (const semKey of ['needSemanticAudit', 'need_semantic_audit']) {
      if (!hasOwn(value, semKey)) continue;
      if (!Array.isArray(value[semKey])) {
        errors.push({
          code: 'HARD_CONSTRAINTS_INVALID',
          message: `${label}.${semKey} 必须为数组。`,
        });
        continue;
      }
      for (const [idx, item] of value[semKey].entries()) {
        if (typeof item === 'string' && item.trim()) {
          merged.needSemanticAudit.push({rule: item.trim(), anchor: null, hint: item.trim()});
        } else if (isPlainObject(item)) {
          const ruleText = [item.rule, item.text, item.description, item.hint].find(
            x => typeof x === 'string' && x.trim(),
          );
          if (!ruleText) {
            errors.push({
              code: 'HARD_CONSTRAINTS_INVALID',
              message: `${label}.${semKey}[${idx}] 缺少非空条款说明（rule/text/description/hint）。`,
            });
          } else {
            merged.needSemanticAudit.push({
              rule: ruleText.trim(),
              anchor: typeof item.anchor === 'string' && item.anchor.trim() ? item.anchor.trim() : null,
              hint: typeof item.hint === 'string' && item.hint.trim() ? item.hint.trim() : ruleText.trim(),
            });
          }
        } else {
          errors.push({
            code: 'HARD_CONSTRAINTS_INVALID',
            message: `${label}.${semKey}[${idx}] 格式非法。`,
          });
        }
      }
    }
  }

  return {constraints: merged, errors};
}

/**
 * Scan duplicate paragraphs (exact same normalization & >=60-char criterion as check_repetition.mjs)
 * across target chapter and all prior chapters in 02-写作计划.json (strictly read-only).
 */
function detectDuplicateParagraphs(root, plan, targetChapter, targetParagraphs) {
  const seen = new Map();
  const findings = [];
  const normalize = p => p.replace(/\s+/g, '').replace(/[\p{P}\p{S}]/gu, '');

  // Index prior chapters (< targetChapter) first
  const priorChapters = plan.chapters
    .filter(c => c.chapterNumber < targetChapter)
    .sort((a, b) => a.chapterNumber - b.chapterNumber);

  for (const ch of priorChapters) {
    const inspected = inspectSafeFile(root, ch.filePath);
    if (inspected.status !== 'ok') continue;
    let raw;
    try {
      raw = fs.readFileSync(inspected.realPath, 'utf8');
    } catch {
      continue;
    }
    const paras = extractBodyParagraphs(raw);
    for (let i = 0; i < paras.length; i++) {
      const normal = normalize(paras[i]);
      if ([...normal].length < 60) continue;
      if (!seen.has(normal)) {
        seen.set(normal, {chapter: ch.chapterNumber, paragraphIndex: i + 1});
      }
    }
  }

  // Check target chapter paragraphs (catches both cross-chapter & intra-chapter duplicates)
  for (let i = 0; i < targetParagraphs.length; i++) {
    const normal = normalize(targetParagraphs[i]);
    const len = [...normal].length;
    if (len < 60) continue;
    const first = seen.get(normal);
    if (first) {
      findings.push({
        paragraphIndex: i + 1,
        firstOccurrence: first,
        length: len,
      });
    } else {
      seen.set(normal, {chapter: targetChapter, paragraphIndex: i + 1});
    }
  }

  return findings;
}

/**
 * Check Chinese quotation pairing across paragraphs with GB/T 15834-2011
 * multi-paragraph continuation quote whitelist:
 *  - Supports curly quotes (“ ” / ‘ ’) and corner quotes (「 」 / 『 』).
 *  - When a quote remains open at the end of paragraph P_i, a paragraph-initial
 *    opening quote at P_{i+1} is recognized as a legal multi-paragraph continuation
 *    marker (staying at depth 1) rather than an unclosed nested quote.
 *  - Remaining unpaired quotes are ALWAYS reported as non-blocking softWarnings.
 */
export function checkQuotesWithChineseMultiParaWhitelist(paragraphs) {
  const warnings = [];
  const pairs = [
    {open: '\u201C', close: '\u201D', name: '中文双引号 “”'},
    {open: '\u300C', close: '\u300D', name: '直角引号 「」'},
    {open: '\u2018', close: '\u2019', name: '中文单引号 ‘’'},
    {open: '\u300E', close: '\u300F', name: '双直角引号 『』'},
  ];

  for (const {open, close, name} of pairs) {
    let openParaIndex = null;
    let depth = 0;
    let hadPlainGap = false;

    for (let idx = 0; idx < paragraphs.length; idx++) {
      const p = paragraphs[idx];
      const trimmedStart = p.trimStart();
      let startOffset = p.length - trimmedStart.length;

      // Legal GB/T 15834 multi-paragraph continuation: paragraph immediately begins with `open` while depth === 1
      if (depth === 1 && trimmedStart.startsWith(open)) {
        if (!hadPlainGap) {
          startOffset += open.length;
        } else {
          // Intervening non-quote narration means the earlier open quote was genuinely unclosed
          warnings.push({
            code: 'UNPAIRED_QUOTE_CANDIDATE',
            paragraphIndex: openParaIndex ?? idx,
            quoteType: name,
            message: `第 ${openParaIndex ?? idx} 段存在疑似未闭合的${name}，请核对排版（非阻断）。`,
          });
          depth = 0;
          openParaIndex = null;
          hadPlainGap = false;
        }
      }

      let sawCloseInPara = false;
      for (let i = startOffset; i < p.length; i++) {
        const ch = p[i];
        if (ch === open) {
          if (depth === 0) {
            openParaIndex = idx + 1;
            depth = 1;
            hadPlainGap = false;
          } else {
            // Unexpected extra opening quote mid-paragraph while already open
            depth++;
            warnings.push({
              code: 'UNPAIRED_QUOTE_CANDIDATE',
              paragraphIndex: idx + 1,
              quoteType: name,
              message: `第 ${idx + 1} 段检测到嵌套或重复开引号（${name}），请核对排版（非阻断）。`,
            });
          }
        } else if (ch === close) {
          sawCloseInPara = true;
          if (depth > 0) {
            depth--;
            if (depth === 0) {
              openParaIndex = null;
              hadPlainGap = false;
            }
          } else {
            warnings.push({
              code: 'UNPAIRED_QUOTE_CANDIDATE',
              paragraphIndex: idx + 1,
              quoteType: name,
              message: `第 ${idx + 1} 段检测到孤立闭引号（${name}），请核对排版（非阻断）。`,
            });
          }
        }
      }

      if (depth === 1 && !trimmedStart.startsWith(open) && !sawCloseInPara && openParaIndex !== idx + 1) {
        hadPlainGap = true;
      }
    }

    if (depth > 0) {
      warnings.push({
        code: 'UNPAIRED_QUOTE_CANDIDATE',
        paragraphIndex: openParaIndex ?? paragraphs.length,
        quoteType: name,
        message: `第 ${openParaIndex ?? paragraphs.length} 段起存在截至章末未闭合的${name}，请核对排版（非阻断）。`,
      });
    }
  }

  return warnings;
}

/**
 * Split a paragraph into verbatim sentences (each guaranteed to be an exact substring of the paragraph).
 */
function splitSentencesVerbatim(paragraph) {
  const results = [];
  const re = /[^。！？!?\n]+[。！？!?]*[”’」』]?/g;
  let m;
  while ((m = re.exec(paragraph)) !== null) {
    const raw = m[0].trim();
    if (raw) results.push(raw);
  }
  return results.length ? results : [paragraph];
}

function makeVerbatimAnchor(paragraph, sentence, matchIndexInSentence = 0) {
  let candidate = sentence;
  if (candidate.length > 120) {
    const start = Math.max(0, Math.min(matchIndexInSentence - 24, candidate.length - 120));
    candidate = candidate.slice(start, start + 120).trim();
  }
  if (paragraph.includes(candidate)) return candidate;
  const fallback = paragraph.slice(0, Math.min(120, paragraph.length));
  return fallback;
}

/**
 * Extract soft style/typography warnings (NEVER blocking):
 *  - Prose parentheses (excluding Markdown links)
 *  - High-frequency sudden adverbs
 *  - Overlong semicolon sentences
 */
function extractStyleSoftWarnings(paragraphs) {
  const warnings = [];
  const parenParas = [];
  const longSemiParas = [];
  const suddenAdverbRe = /(?:突然|忽然|猛然|陡然|骤然|蓦地|霎时|瞬间)/g;
  let suddenCount = 0;
  let totalChineseChars = 0;

  for (let idx = 0; idx < paragraphs.length; idx++) {
    const p = paragraphs[idx];
    const chineseMatches = p.match(/[\u4e00-\u9fff]/g);
    totalChineseChars += chineseMatches ? chineseMatches.length : 0;

    // 1. Prose parentheses (strip Markdown links [text](url) before checking half-width parens)
    const withoutMdLinks = p.replace(/\[[^\]]+\]\([^)]+\)/g, '');
    if (/[（(][^）)\r\n]{1,120}[）)]/.test(withoutMdLinks)) {
      parenParas.push(idx + 1);
    }

    // 2. Sudden adverbs
    const advMatches = p.match(suddenAdverbRe);
    if (advMatches) suddenCount += advMatches.length;

    // 3. Overlong semicolon sentences
    for (const s of splitSentencesVerbatim(p)) {
      const semiMatches = s.match(/[；;]/g);
      if (!semiMatches) continue;
      const nonWsLen = s.replace(/\s+/g, '').length;
      if (nonWsLen > 80 || (semiMatches.length >= 2 && nonWsLen > 60)) {
        longSemiParas.push({paragraphIndex: idx + 1, length: nonWsLen});
        break;
      }
    }
  }

  if (parenParas.length > 0) {
    warnings.push({
      code: 'PROSE_PARENTHESES',
      paragraphs: parenParas,
      message: `正文第 ${parenParas.slice(0, 5).join('、')} 段出现括号补充说明（共 ${parenParas.length} 处），建议改为自然叙事（非阻断）。`,
    });
  }

  const densityPer1k = totalChineseChars > 0 ? (suddenCount * 1000) / totalChineseChars : 0;
  if (suddenCount >= 6 || (suddenCount >= 4 && densityPer1k >= 2.5)) {
    warnings.push({
      code: 'HIGH_FREQ_SUDDEN_ADVERBS',
      count: suddenCount,
      message: `本章突发副词（突然/忽然/猛然等）出现 ${suddenCount} 次，注意避免机械转折（非阻断）。`,
    });
  }

  if (longSemiParas.length > 0) {
    warnings.push({
      code: 'OVERLONG_SEMICOLON_SENTENCE',
      paragraphs: longSemiParas.map(x => x.paragraphIndex),
      message: `第 ${longSemiParas.slice(0, 5).map(x => x.paragraphIndex).join('、')} 段存在超长分号句（共 ${longSemiParas.length} 段），可酌情拆句（非阻断）。`,
    });
  }

  return warnings;
}

/**
 * Extract structured NEEDS_SEMANTIC_AUDIT clues across all 6 required categories:
 *  1. date_arithmetic
 *  2. ledger_quantity
 *  3. prop_sequence
 *  4. author_semantic_constraint
 *  5. climax_action_pov
 *  6. info_asymmetry
 */
export function extractNeedsSemanticAudit(paragraphs, {authorSemanticRules = [], structuredLedgerMismatches = []} = {}) {
  const rawClues = [];
  const dedup = new Set();

  const pushClue = (category, paragraphIndex, anchorQuote, hint) => {
    const key = `${category}|${paragraphIndex}|${anchorQuote}`;
    if (dedup.has(key)) return;
    dedup.add(key);
    rawClues.push({category, paragraphIndex, anchorQuote, hint});
  };

  // --- Patterns ---
  const lunarOrDateTokenRe = /(?:(?:正|腊|冬|[一二三四五六七八九十]{1,2}|\d{1,2})月)?(?:初[一二三四五六七八九十]|十[一二三四五六七八九]?|廿[一二三四五六七八九]?|二十[一二三四五六七八九]?|三十|[1-3]?\d[日号])/g;
  const dateDeltaRe = /(?:提前|推迟|延迟|早了|晚了|隔了|过了|相差|相距|距离|还剩|还有|不过|仅余|不到|足足|整整|比原定)[^。！？\n]{0,16}(?:[一二三四五六七八九十两半百千\d]+)\s*(?:日|天|夜|月|年|个?时辰|刻钟?|炷香|小时|分钟)/;
  const shichenRe = /(?:子|丑|寅|卯|辰|巳|午|未|申|酉|戌|亥)(?:时(?:初|正|末)?|初|正|末|刻)/g;
  const relativeDayRe = /(?:[一二三四五六七八九十两半\d]+)\s*(?:日|天|夜|个?时辰|刻钟?)(?:前|后|之内|以内|之后|之前|后才|才到)/;

  const accountingUnitRe = /(?:\d+(?:\.\d+)?|[零一二三四五六七八九十百千万两半]+)\s*(?:[块枚颗粒张副瓶锭箱担匹套份把件根支]?\s*(?:灵石|灵碎|下品灵石|中品灵石|上品灵石|碎银|纹银|白银|黄金|银票|银子|铜钱|药膏|丹药|盐引|官盐)|引|两(?:银|纹银|碎银|白银|黄金)?|贯|吊|文(?:钱)?|石|斗|升|斤|担|箱|车|匹|枚|锭|副|瓶|颗|粒|张|套|份|元|万元|千元|亿元)/g;
  const accountingVerbRe = /(?:共计|合计|一共|总计|余下|还剩|剩下|扣除|扣去|花了|花费|支出|入账|进账|结余|找零|凑齐|凑够|亏空|缺口|折合|抵扣|平分|账目|账面|银钱|总账|盐引|定额|配额|盘点|清点|分账)/;
  const arabicQuantityRe = /\d+(?:\.\d+)?\s*(?:[块枚颗粒张副瓶锭箱担匹套份把件根支]?\s*(?:灵碎|灵石|碎银|银票|官盐)|引|两|文|贯|石|斗|升|斤|担|箱|车|匹|枚|锭|副|瓶|颗|粒|张|套|份|块|个|只|把|根|支|件|元|万|千|百)/;
  const vagueIdiomOnlyRe = /^(?:一两|三两|百般|万分|千百|一时|一刻)$/;

  const propCodeRe = /(?:[甲乙丙丁戊己庚辛壬癸]字[一二三四五六七八九十\d]+号|第[一二三四五六七八九十\d]+号|编号[：:\s]?[A-Za-z0-9\-一二三四五六七八九十]+|[A-Z]{1,3}-\d{1,5}|一式[两二三四]份|第[一二三四五六七八九十\d]+份)/;
  const propObjectRe = /(?:卷宗|印信|令牌|腰牌|账册|副簿|正簿|密信|契约|契纸|钥匙|玉佩|护心镜|证物|凭据|路引|勘合|盐引|封条|手谕|兵符|木匣|铁盒)/;
  const propTransferRe = /(?:编号|序号|字号|盖印|画押|交予|递给|收回|遗落|藏于|贴身|锁进|封印|拆封|调包|掉包|失窃|摸走|顺走|塞进|换了|核对)/;

  const spatialMeasureRe = /(?:\d+(?:\.\d+)?|[一二三四五六七八九十两半]+)\s*(?:米|丈|尺|寸|步|层楼?)/;
  const spatialStructureRe = /(?:前墙|后墙|墙体|墙头|高墙|木门|后门|窗户|排风道|排风口|通风口|暗道|密道|窄巷|后巷|屋顶|房梁|楼梯|拐角|走廊|盲区|死角|正上方|正下方|对面|隔墙|冷库|地窖)/;
  const actionCombatRe = /(?:拔刀|抽刀|出剑|挥剑|挥拳|格挡|闪身|翻滚|扑倒|扑向|扼住|勒住|拽住|踹开|撞开|刺向|劈向|跃起|翻越|扣动扳机|拉栓|举枪|护心镜|拉门|推门|锁门|堵门|突袭|遇袭|暗算|反手一)/g;

  const infoSecrecyRe = /(?:暗中|背地里|私下|悄悄|秘密|殊不知|浑然不知|并不知晓|无人知晓|早已知晓|隔墙|偷听|窃听|窥见|藏在暗处|没看到|看不见|听不见|视线死角|背对着|并不在场|从未见过|从未听过|限知)/;
  const infoMindOrKnowledgeRe = /(?:知道|知晓|明白|察觉|看穿|心里盘算|心中暗道|暗自得意|暗想|盘算着|早就料到|其实早已|认出|叫出名字|脱口而出|一语道破|准确说出|知道他|知道她|看出对方)/;

  for (let idx = 0; idx < paragraphs.length; idx++) {
    const p = paragraphs[idx];
    const pIdx = idx + 1;
    const sentences = splitSentencesVerbatim(p);

    // Paragraph-level action density check for climax_action_pov
    const paraActionHits = p.match(actionCombatRe) || [];

    for (const s of sentences) {
      // 1. date_arithmetic
      const dateTokens = s.match(lunarOrDateTokenRe) || [];
      const shichenTokens = s.match(shichenRe) || [];
      const hasDateDelta = dateDeltaRe.test(s);
      const hasRelDay = relativeDayRe.test(s);
      if (
        (hasDateDelta && (dateTokens.length >= 1 || shichenTokens.length >= 1)) ||
        (dateTokens.length >= 2 && (hasDateDelta || hasRelDay || /[比距差早晚间隔]/.test(s))) ||
        (shichenTokens.length >= 2) ||
        (shichenTokens.length >= 1 && (hasDateDelta || hasRelDay))
      ) {
        const anchor = makeVerbatimAnchor(p, s);
        const tokensSummary = [...new Set([...dateTokens, ...shichenTokens])].slice(0, 4).join('、');
        pushClue(
          'date_arithmetic',
          pIdx,
          anchor,
          `检测到日期/时辰差表述${tokensSummary ? `（${tokensSummary}）` : ''}，请独立核验差值算术与前后文时序一致性。`,
        );
      }

      // 2. ledger_quantity
      const unitMatches = (s.match(accountingUnitRe) || []).filter(t => !vagueIdiomOnlyRe.test(t.trim()));
      const hasArabicQty = arabicQuantityRe.test(s);
      const hasAcctVerb = accountingVerbRe.test(s);
      if (
        hasArabicQty ||
        (unitMatches.length >= 2) ||
        (unitMatches.length >= 1 && hasAcctVerb)
      ) {
        const anchor = makeVerbatimAnchor(p, s);
        const qtySummary = [...new Set(unitMatches)].slice(0, 4).join('、');
        pushClue(
          'ledger_quantity',
          pIdx,
          anchor,
          `检测到账目/金额/数量变动${qtySummary ? `（${qtySummary}）` : ''}，请独立核验加减守恒与前文底账。`,
        );
      }

      // 3. prop_sequence
      const hasPropCode = propCodeRe.test(s);
      const hasPropObj = propObjectRe.test(s);
      const hasPropTransfer = propTransferRe.test(s);
      if (hasPropCode || (hasPropObj && hasPropTransfer)) {
        const anchor = makeVerbatimAnchor(p, s);
        pushClue(
          'prop_sequence',
          pIdx,
          anchor,
          '检测到证物/道具编号序列或关键器物交接状态，请核对编号连续性与持有人/存放位置一致。',
        );
      }

      // 5. climax_action_pov (sentence-level spatial geometry or combat + spatial)
      const hasSpatialMeasure = spatialMeasureRe.test(s);
      const hasSpatialStruct = spatialStructureRe.test(s);
      const sentActionHits = s.match(actionCombatRe) || [];
      if ((hasSpatialMeasure && hasSpatialStruct) || (sentActionHits.length >= 2 && (hasSpatialStruct || hasSpatialMeasure))) {
        const anchor = makeVerbatimAnchor(p, s);
        pushClue(
          'climax_action_pov',
          pIdx,
          anchor,
          '检测到高潮动作/空间几何描写，请核验三维空间关系、物理动作链与限知视角边界。',
        );
      }

      // 6. info_asymmetry
      if (infoSecrecyRe.test(s) && infoMindOrKnowledgeRe.test(s)) {
        const anchor = makeVerbatimAnchor(p, s);
        pushClue(
          'info_asymmetry',
          pIdx,
          anchor,
          '检测到信息差或知情边界敏感表述，请核验角色获取信息的合法渠道，防止限知 POV 越界。',
        );
      }
    }

    // Paragraph-level dense combat/action segment fallback (e.g. >= 3 distinct action triggers in paragraph)
    if (paraActionHits.length >= 3) {
      const alreadyTagged = rawClues.some(c => c.category === 'climax_action_pov' && c.paragraphIndex === pIdx);
      if (!alreadyTagged) {
        const firstHitSent = sentences.find(s => actionCombatRe.test(s)) || sentences[0];
        actionCombatRe.lastIndex = 0;
        pushClue(
          'climax_action_pov',
          pIdx,
          makeVerbatimAnchor(p, firstHitSent),
          `检测到高密度动作对抗段落（${paraActionHits.length} 处动作锚点），请核验动作衔接、持物状态与限知视角。`,
        );
      }
    }
  }

  // 4. author_semantic_constraint (from 02-写作计划.json hardConstraints.needSemanticAudit / need_semantic_audit)
  for (const ruleObj of authorSemanticRules) {
    let matchedIdx = 1;
    let anchorMatched = false;
    let anchor = paragraphs[0] ? makeVerbatimAnchor(paragraphs[0], splitSentencesVerbatim(paragraphs[0])[0]) : '';
    if (ruleObj.anchor) {
      const foundIdx = paragraphs.findIndex(p => p.includes(ruleObj.anchor));
      if (foundIdx >= 0) {
        matchedIdx = foundIdx + 1;
        anchor = ruleObj.anchor;
        anchorMatched = true;
      }
    }
    const fallbackNotice = anchorMatched
      ? ''
      : '（未找到作者锚点，以下默认定位至第 1 段，请审稿人通读全章核销）';
    const key = `author_semantic_constraint|${matchedIdx}|${anchor}|${ruleObj.hint}`;
    if (!dedup.has(key)) {
      dedup.add(key);
      rawClues.push({
        category: 'author_semantic_constraint',
        paragraphIndex: matchedIdx,
        anchorQuote: anchor,
        anchorMatched,
        hint: `作者显式语义核查条款：${ruleObj.hint}${fallbackNotice}`,
      });
    }
  }

  // Optional structured ledger mismatches from r3_structured_checks.mjs (read-only, non-blocking)
  for (const issue of structuredLedgerMismatches) {
    const foundIdx = paragraphs.findIndex(p => p.includes(issue.quote));
    const pIdx = foundIdx >= 0 ? foundIdx + 1 : 1;
    const anchor =
      foundIdx >= 0
        ? issue.quote
        : paragraphs[0]
          ? makeVerbatimAnchor(paragraphs[0], splitSentencesVerbatim(paragraphs[0])[0])
          : issue.quote;
    pushClue(
      'ledger_quantity',
      pIdx,
      anchor,
      `账本结构化校验 ${issue.id}（${issue.code}）存在差额候选，请结合原文语义与单位独立核验。`,
    );
  }

  // Deterministic ordering by paragraphIndex then category priority, assigning sequential NSA-001..N
  rawClues.sort((a, b) => {
    if (a.paragraphIndex !== b.paragraphIndex) return a.paragraphIndex - b.paragraphIndex;
    return CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category);
  });

  return rawClues.map((c, idx) => ({
    auditId: `NSA-${String(idx + 1).padStart(3, '0')}`,
    category: c.category,
    anchorQuote: c.anchorQuote,
    paragraphIndex: c.paragraphIndex,
    ...(c.anchorMatched !== undefined ? {anchorMatched: c.anchorMatched} : {}),
    hint: c.hint,
  }));
}

/**
 * Run deterministic read-only Precheck v2 for a single chapter in a novel project.
 * Never writes to disk and never mutates plan/ledger/revision state.
 */
export function precheckChapterV2(projectDir, chapterNumber, {dryRun = false} = {}) {
  const startedAt = performance.now();

  if (!Number.isSafeInteger(chapterNumber) || chapterNumber < 1) {
    throw new Error('PRECHECK_INVALID_CHAPTER_NUMBER');
  }

  let root;
  try {
    root = fs.realpathSync(path.resolve(projectDir));
    if (!fs.statSync(root).isDirectory()) {
      throw new Error('PRECHECK_PROJECT_NOT_DIRECTORY');
    }
  } catch (err) {
    if (err?.message === 'PRECHECK_PROJECT_NOT_DIRECTORY') throw err;
    throw new Error(`PRECHECK_PROJECT_NOT_FOUND: ${projectDir}`);
  }

  const hardErrors = [];
  const softWarnings = [];
  let needsSemanticAudit = [];
  let manuscriptSha256 = null;
  let wordCount = 0;

  // 1. Read and validate 02-写作计划.json (read-only)
  const planInspected = inspectSafeFile(root, '02-写作计划.json');
  if (planInspected.status !== 'ok') {
    hardErrors.push({
      code: 'PLAN_FILE_MISSING_OR_UNSAFE',
      message: `无法读取项目计划文件 02-写作计划.json（${planInspected.reason}）。`,
    });
    return {
      schemaVersion: PRECHECK_SCHEMA_VERSION,
      chapter: chapterNumber,
      manuscriptSha256,
      blocking: true,
      dryRun: Boolean(dryRun),
      wordCount,
      hardErrors,
      softWarnings,
      needsSemanticAudit,
      elapsedMs: Number((performance.now() - startedAt).toFixed(2)),
    };
  }

  let plan;
  try {
    plan = JSON.parse(fs.readFileSync(planInspected.realPath, 'utf8').replace(/^\uFEFF/, ''));
  } catch (err) {
    hardErrors.push({
      code: 'PLAN_JSON_CORRUPT',
      message: `02-写作计划.json JSON 语法损坏：${err.message}`,
    });
    return {
      schemaVersion: PRECHECK_SCHEMA_VERSION,
      chapter: chapterNumber,
      manuscriptSha256,
      blocking: true,
      dryRun: Boolean(dryRun),
      wordCount,
      hardErrors,
      softWarnings,
      needsSemanticAudit,
      elapsedMs: Number((performance.now() - startedAt).toFixed(2)),
    };
  }

  if (!isPlainObject(plan) || !Array.isArray(plan.chapters) || plan.chapters.length === 0) {
    hardErrors.push({
      code: 'PLAN_STRUCTURE_INVALID',
      message: '02-写作计划.json 缺少有效的非空 chapters 数组。',
    });
    return {
      schemaVersion: PRECHECK_SCHEMA_VERSION,
      chapter: chapterNumber,
      manuscriptSha256,
      blocking: true,
      dryRun: Boolean(dryRun),
      wordCount,
      hardErrors,
      softWarnings,
      needsSemanticAudit,
      elapsedMs: Number((performance.now() - startedAt).toFixed(2)),
    };
  }

  const seenChapterNums = new Set();
  for (const [idx, ch] of plan.chapters.entries()) {
    if (!isPlainObject(ch) || !Number.isSafeInteger(ch.chapterNumber) || ch.chapterNumber < 1 ||
        seenChapterNums.has(ch.chapterNumber) || typeof ch.filePath !== 'string' || !ch.filePath.trim()) {
      hardErrors.push({
        code: 'PLAN_STRUCTURE_INVALID',
        message: `02-写作计划.json 中 chapters[${idx}] 存在非法或重复的 chapterNumber / filePath。`,
      });
    } else {
      seenChapterNums.add(ch.chapterNumber);
    }
  }
  if (hasOwn(plan, 'minWordsPerChapter') && (!Number.isSafeInteger(plan.minWordsPerChapter) || plan.minWordsPerChapter <= 0)) {
    hardErrors.push({
      code: 'PLAN_STRUCTURE_INVALID',
      message: '02-写作计划.json 中 minWordsPerChapter 必须为正整数。',
    });
  }
  if (hasOwn(plan, 'maxWordsPerChapter') && (!Number.isSafeInteger(plan.maxWordsPerChapter) || plan.maxWordsPerChapter <= 0)) {
    hardErrors.push({
      code: 'PLAN_STRUCTURE_INVALID',
      message: '02-写作计划.json 中 maxWordsPerChapter 必须为正整数。',
    });
  }

  const chapterEntry = plan.chapters.find(c => c?.chapterNumber === chapterNumber);
  if (!chapterEntry) {
    hardErrors.push({
      code: 'CHAPTER_NOT_IN_PLAN',
      message: `02-写作计划.json 中不存在第 ${chapterNumber} 章的计划条目。`,
    });
    return {
      schemaVersion: PRECHECK_SCHEMA_VERSION,
      chapter: chapterNumber,
      manuscriptSha256,
      blocking: true,
      dryRun: Boolean(dryRun),
      wordCount,
      hardErrors,
      softWarnings,
      needsSemanticAudit,
      elapsedMs: Number((performance.now() - startedAt).toFixed(2)),
    };
  }

  // 2. Check finalized chapters for unauthorized post-approval tampering (STALE_REVIEW_AFTER_EDIT)
  hardErrors.push(...checkFinalizedChapterIntegrity(root, plan));

  // 3. Validate author explicit hardConstraints (global + chapter)
  const {constraints, errors: constraintErrors} = parseAndValidateHardConstraints(plan, chapterEntry);
  hardErrors.push(...constraintErrors);

  // 4. Inspect and read target chapter manuscript safely
  const msInspected = inspectSafeFile(root, chapterEntry.filePath);
  if (msInspected.status !== 'ok') {
    const codeMap = {
      missing: 'MANUSCRIPT_MISSING',
      not_file: 'MANUSCRIPT_NOT_FILE',
      unsafe: 'UNSAFE_MANUSCRIPT_PATH',
      unreadable: 'MANUSCRIPT_UNREADABLE',
    };
    hardErrors.push({
      code: codeMap[msInspected.status] || 'MANUSCRIPT_UNREADABLE',
      filePath: chapterEntry.filePath,
      message: `第 ${chapterNumber} 章正文文件不可用（${chapterEntry.filePath}：${msInspected.reason}）。`,
    });
    return {
      schemaVersion: PRECHECK_SCHEMA_VERSION,
      chapter: chapterNumber,
      manuscriptSha256,
      blocking: true,
      dryRun: Boolean(dryRun),
      wordCount,
      hardErrors,
      softWarnings,
      needsSemanticAudit,
      elapsedMs: Number((performance.now() - startedAt).toFixed(2)),
    };
  }

  const rawBytes = fs.readFileSync(msInspected.realPath);
  const decoded = decodeAndValidateManuscriptBytes(rawBytes);
  manuscriptSha256 = decoded.sha256;
  if (!decoded.ok) {
    hardErrors.push(decoded.error);
    return {
      schemaVersion: PRECHECK_SCHEMA_VERSION,
      chapter: chapterNumber,
      manuscriptSha256,
      blocking: true,
      dryRun: Boolean(dryRun),
      wordCount,
      hardErrors,
      softWarnings,
      needsSemanticAudit,
      elapsedMs: Number((performance.now() - startedAt).toFixed(2)),
    };
  }

  const rawText = decoded.text;
  const paragraphs = extractBodyParagraphs(rawText);
  if (paragraphs.length === 0) {
    hardErrors.push({
      code: 'MANUSCRIPT_EMPTY_CONTENT',
      message: '章节文件缺少有效正文段落（仅含标题或空白）。',
    });
    return {
      schemaVersion: PRECHECK_SCHEMA_VERSION,
      chapter: chapterNumber,
      manuscriptSha256,
      blocking: true,
      dryRun: Boolean(dryRun),
      wordCount,
      hardErrors,
      softWarnings,
      needsSemanticAudit,
      elapsedMs: Number((performance.now() - startedAt).toFixed(2)),
    };
  }

  // 5. Measure Chinese word count via existing single-source-of-truth chapter_wordcount_common.mjs
  const softMinWords =
    constraints.minWords ??
    (Number.isSafeInteger(chapterEntry.minWords) && chapterEntry.minWords > 0 ? chapterEntry.minWords : null) ??
    (Number.isSafeInteger(plan.minWordsPerChapter) && plan.minWordsPerChapter > 0 ? plan.minWordsPerChapter : DEFAULT_SOFT_MIN_WORDS);
  const softMaxWords =
    constraints.maxWords ??
    (Number.isSafeInteger(chapterEntry.maxWords) && chapterEntry.maxWords > 0 ? chapterEntry.maxWords : null) ??
    (Number.isSafeInteger(plan.maxWordsPerChapter) && plan.maxWordsPerChapter > 0 ? plan.maxWordsPerChapter : DEFAULT_SOFT_MAX_WORDS);

  const measured = checkChapter(msInspected.realPath, softMinWords);
  if (measured.status === 'error') {
    hardErrors.push({
      code: 'MANUSCRIPT_WORDCOUNT_ERROR',
      message: measured.message,
    });
  } else {
    wordCount = measured.word_count;
    if (wordCount < softMinWords) {
      if (constraints.enforceMinWords === true) {
        hardErrors.push({
          code: 'HARD_CONSTRAINT_MIN_WORDS_VIOLATED',
          wordCount,
          minWords: softMinWords,
          message: `作者显式开启字数下限硬约束：当前 ${wordCount} 字，低于要求下限 ${softMinWords} 字。`,
        });
      } else {
        softWarnings.push({
          code: 'UNDER_SOFT_MIN',
          wordCount,
          referenceMin: softMinWords,
          message: `当前 ${wordCount} 字（参考下限 ${softMinWords}，非阻断，以内容完整为先）`,
        });
      }
    }
    if (softMaxWords && wordCount > softMaxWords) {
      if (constraints.enforceMaxWords === true) {
        hardErrors.push({
          code: 'HARD_CONSTRAINT_MAX_WORDS_VIOLATED',
          wordCount,
          maxWords: softMaxWords,
          message: `作者显式开启字数上限硬约束：当前 ${wordCount} 字，超过要求上限 ${softMaxWords} 字。`,
        });
      } else {
        softWarnings.push({
          code: 'OVER_SOFT_MAX',
          wordCount,
          referenceMax: softMaxWords,
          message: `当前 ${wordCount} 字（参考软上限 ${softMaxWords}，非阻断，以内容完整为先）`,
        });
      }
    }
  }

  // 6. Author explicit deterministic hardConstraints: mustInclude / mustExclude
  const bodyForConstraints = paragraphs.join('\n\n');
  for (const req of constraints.mustInclude) {
    if (!bodyForConstraints.includes(req.text)) {
      hardErrors.push({
        code: 'HARD_CONSTRAINT_MUST_INCLUDE_MISSING',
        constraint: req.label,
        message: `作者显式必含硬约束缺失：正文中未出现「${req.label}」。`,
      });
    }
  }
  for (const forbid of constraints.mustExclude) {
    if (rawText.includes(forbid.text)) {
      hardErrors.push({
        code: 'HARD_CONSTRAINT_MUST_EXCLUDE_HIT',
        constraint: forbid.label,
        message: `作者显式禁用硬约束命中：正文中出现了禁止内容「${forbid.label}」。`,
      });
    }
  }

  // 7. Duplicate paragraphs (default softWarnings; hardError ONLY if enforceNoDuplicateParagraphs === true)
  const dupFindings = detectDuplicateParagraphs(root, plan, chapterNumber, paragraphs);
  for (const d of dupFindings) {
    const desc = `第 ${d.paragraphIndex} 段与第 ${d.firstOccurrence.chapter} 章第 ${d.firstOccurrence.paragraphIndex} 段存在 ${d.length} 字字面重复`;
    if (constraints.enforceNoDuplicateParagraphs === true) {
      hardErrors.push({
        code: 'HARD_CONSTRAINT_DUPLICATE_PARAGRAPH',
        paragraphIndex: d.paragraphIndex,
        firstOccurrence: d.firstOccurrence,
        length: d.length,
        message: `作者显式开启禁重复段硬约束：${desc}。`,
      });
    } else {
      softWarnings.push({
        code: 'DUPLICATE_PARAGRAPH_CANDIDATE',
        paragraphIndex: d.paragraphIndex,
        firstOccurrence: d.firstOccurrence,
        length: d.length,
        message: `${desc}（默认非阻断，兼容循环叙事/原文复引/回环意象，仅作参考）。`,
      });
    }
  }

  // 8. Chinese quote check with GB/T 15834 multi-paragraph continuation whitelist (ALWAYS softWarnings)
  softWarnings.push(...checkQuotesWithChineseMultiParaWhitelist(paragraphs));

  // 9. Style soft warnings (prose parentheses, sudden adverbs, overlong semicolon sentences)
  softWarnings.push(...extractStyleSoftWarnings(paragraphs));

  // 10. Optional read-only integration with story-ledger.json + r3_structured_checks.mjs
  let structuredLedgerMismatches = [];
  const ledgerInspected = inspectSafeFile(root, 'story-ledger.json');
  if (ledgerInspected.status === 'ok') {
    try {
      const ledger = JSON.parse(fs.readFileSync(ledgerInspected.realPath, 'utf8').replace(/^\uFEFF/, ''));
      if (isPlainObject(ledger) && ledger.r3Checks !== undefined) {
        structuredLedgerMismatches = structuredChecks(ledger, chapterNumber).filter(x => x.chapter === chapterNumber);
      }
    } catch {
      // Do not block chapter precheck on optional ledger read/parse nuances unless author configured otherwise
    }
  }

  // 11. Extract 6-category NEEDS_SEMANTIC_AUDIT clues (NEVER blocking)
  needsSemanticAudit = extractNeedsSemanticAudit(paragraphs, {
    authorSemanticRules: constraints.needSemanticAudit,
    structuredLedgerMismatches,
  });

  return {
    schemaVersion: PRECHECK_SCHEMA_VERSION,
    chapter: chapterNumber,
    manuscriptSha256,
    blocking: hardErrors.length > 0,
    dryRun: Boolean(dryRun),
    wordCount,
    hardErrors,
    softWarnings,
    needsSemanticAudit,
    elapsedMs: Number((performance.now() - startedAt).toFixed(2)),
  };
}
