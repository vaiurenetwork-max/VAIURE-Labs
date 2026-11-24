/**
 * VAIURE Studio — Database Backup, Checksum Verification & Recovery Service
 * Stores encrypted-integrity snapshots in `.vaiure_backups/` (outside public webroot /uploads).
 * Backs up:
 * - uploads/seedance_platform_db.json
 * - uploads/seedance_community_db.json
 * - uploads/seedance_curated_db.json
 * - uploads/bytedance_history.json
 * - .vaiure_backups/vxa_ledger_db.json
 * - .vaiure_backups/ivntri_api_store.json (if present)
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { isSafeIdentifier, resolveSafeSubpath } from './securityMiddleware';

export const BACKUP_ROOT_DIR = path.resolve(process.cwd(), '.vaiure_backups');
const SNAPSHOTS_DIR = path.join(BACKUP_ROOT_DIR, 'snapshots');
const MAX_SNAPSHOT_RETENTION = 15;
const BACKUP_INTERVAL_MS = 15 * 60_000;

interface BackupFileEntry {
  logicalKey: string;
  relativeTarget: string;
  snapshotFilename: string;
  byteSize: number;
  sha256: string;
}

export interface BackupSnapshotManifest {
  id: string;
  createdAt: string;
  reason: string;
  actorUid?: string;
  files: BackupFileEntry[];
}

const MANAGED_DB_TARGETS: Array<{ logicalKey: string; relativeTarget: string; snapshotFilename: string }> = [
  {
    logicalKey: 'seedance_platform_db',
    relativeTarget: path.join('uploads', 'seedance_platform_db.json'),
    snapshotFilename: 'seedance_platform_db.json',
  },
  {
    logicalKey: 'seedance_community_db',
    relativeTarget: path.join('uploads', 'seedance_community_db.json'),
    snapshotFilename: 'seedance_community_db.json',
  },
  {
    logicalKey: 'seedance_curated_db',
    relativeTarget: path.join('uploads', 'seedance_curated_db.json'),
    snapshotFilename: 'seedance_curated_db.json',
  },
  {
    logicalKey: 'bytedance_history',
    relativeTarget: path.join('uploads', 'bytedance_history.json'),
    snapshotFilename: 'bytedance_history.json',
  },
  {
    logicalKey: 'vxa_ledger_db',
    relativeTarget: path.join('.vaiure_backups', 'vxa_ledger_db.json'),
    snapshotFilename: 'vxa_ledger_db.json',
  },
];

function ensureBackupDirs(): void {
  if (!fs.existsSync(BACKUP_ROOT_DIR)) {
    fs.mkdirSync(BACKUP_ROOT_DIR, { recursive: true, mode: 0o700 });
  }
  if (!fs.existsSync(SNAPSHOTS_DIR)) {
    fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true, mode: 0o700 });
  }
}

function sha256Buffer(buf: Buffer): string {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function pruneOldSnapshots(): void {
  ensureBackupDirs();
  const entries = fs
    .readdirSync(SNAPSHOTS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name.startsWith('snap_'))
    .map((d) => {
      const fullPath = path.join(SNAPSHOTS_DIR, d.name);
      const stat = fs.statSync(fullPath);
      return { name: d.name, fullPath, mtimeMs: stat.mtimeMs };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  for (const stale of entries.slice(MAX_SNAPSHOT_RETENTION)) {
    fs.rmSync(stale.fullPath, { recursive: true, force: true });
  }
}

export function createBackupSnapshot(reason = 'SCHEDULED', actorUid?: string): BackupSnapshotManifest {
  ensureBackupDirs();
  const timestampSlug = new Date().toISOString().replace(/[:.]/g, '-');
  const id = `snap_${timestampSlug}_${crypto.randomBytes(3).toString('hex')}`;
  const snapDir = path.join(SNAPSHOTS_DIR, id);
  fs.mkdirSync(snapDir, { recursive: true, mode: 0o700 });

  const files: BackupFileEntry[] = [];
  const cwd = process.cwd();

  for (const target of MANAGED_DB_TARGETS) {
    const srcPath = path.resolve(cwd, target.relativeTarget);
    if (!fs.existsSync(srcPath)) continue;

    const raw = fs.readFileSync(srcPath);
    const destPath = path.join(snapDir, target.snapshotFilename);
    fs.writeFileSync(destPath, raw, { mode: 0o600 });

    files.push({
      logicalKey: target.logicalKey,
      relativeTarget: target.relativeTarget,
      snapshotFilename: target.snapshotFilename,
      byteSize: raw.length,
      sha256: sha256Buffer(raw),
    });
  }

  const manifest: BackupSnapshotManifest = {
    id,
    createdAt: new Date().toISOString(),
    reason,
    actorUid,
    files,
  };

  const manifestPath = path.join(snapDir, 'manifest.json');
  const tmpPath = `${manifestPath}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(manifest, null, 2), { encoding: 'utf8', mode: 0o600 });
  fs.renameSync(tmpPath, manifestPath);

  pruneOldSnapshots();
  return manifest;
}

export function listBackups(): BackupSnapshotManifest[] {
  ensureBackupDirs();
  const dirs = fs
    .readdirSync(SNAPSHOTS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && isSafeIdentifier(d.name));

  const manifests: BackupSnapshotManifest[] = [];
  for (const d of dirs) {
    const manifestPath = path.join(SNAPSHOTS_DIR, d.name, 'manifest.json');
    if (!fs.existsSync(manifestPath)) continue;
    try {
      const parsed = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as BackupSnapshotManifest;
      manifests.push(parsed);
    } catch {
      // Ignore corrupt manifest
    }
  }

  manifests.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return manifests;
}

export function verifyBackupSnapshot(backupId: string): {
  valid: boolean;
  backupId: string;
  checkedFiles: number;
  failures: string[];
} {
  if (!isSafeIdentifier(backupId)) {
    return { valid: false, backupId, checkedFiles: 0, failures: ['Invalid backup identifier.'] };
  }
  const snapDir = resolveSafeSubpath(SNAPSHOTS_DIR, backupId);
  if (!snapDir || !fs.existsSync(snapDir)) {
    return { valid: false, backupId, checkedFiles: 0, failures: ['Backup snapshot not found.'] };
  }

  const manifestPath = path.join(snapDir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    return { valid: false, backupId, checkedFiles: 0, failures: ['Snapshot manifest missing.'] };
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as BackupSnapshotManifest;
  const failures: string[] = [];

  for (const f of manifest.files) {
    const filePath = resolveSafeSubpath(snapDir, f.snapshotFilename);
    if (!filePath || !fs.existsSync(filePath)) {
      failures.push(`Missing snapshot file: ${f.snapshotFilename}`);
      continue;
    }
    const raw = fs.readFileSync(filePath);
    const actualHash = sha256Buffer(raw);
    if (actualHash !== f.sha256) {
      failures.push(`Checksum mismatch for ${f.snapshotFilename}`);
    }
  }

  return {
    valid: failures.length === 0,
    backupId,
    checkedFiles: manifest.files.length,
    failures,
  };
}

export function restoreBackupSnapshot(
  backupId: string,
  actorUid: string
): { restored: string[]; safetyBackupId: string } {
  const verify = verifyBackupSnapshot(backupId);
  if (!verify.valid) {
    throw new Error(`Backup verification failed: ${verify.failures.join('; ')}`);
  }

  // Always capture a pre-restore safety snapshot first for rollback
  const safetyBackup = createBackupSnapshot(`PRE_RESTORE_OF_${backupId}`, actorUid);

  const snapDir = resolveSafeSubpath(SNAPSHOTS_DIR, backupId)!;
  const manifest = JSON.parse(fs.readFileSync(path.join(snapDir, 'manifest.json'), 'utf8')) as BackupSnapshotManifest;
  const cwd = process.cwd();
  const restored: string[] = [];

  for (const fileEntry of manifest.files) {
    const allowedTarget = MANAGED_DB_TARGETS.find(
      (t) => t.logicalKey === fileEntry.logicalKey && t.relativeTarget === fileEntry.relativeTarget
    );
    if (!allowedTarget) continue;

    const srcFile = resolveSafeSubpath(snapDir, fileEntry.snapshotFilename);
    const destFile = resolveSafeSubpath(cwd, allowedTarget.relativeTarget);
    if (!srcFile || !destFile) continue;

    const raw = fs.readFileSync(srcFile);
    // Validate JSON syntax before restoring
    JSON.parse(raw.toString('utf8'));

    const destDir = path.dirname(destFile);
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
    const tmpDest = `${destFile}.restore.tmp`;
    fs.writeFileSync(tmpDest, raw);
    fs.renameSync(tmpDest, destFile);
    restored.push(fileEntry.logicalKey);
  }

  return {
    restored,
    safetyBackupId: safetyBackup.id,
  };
}

let schedulerStarted = false;

export function startBackupScheduler(): void {
  if (schedulerStarted) return;
  schedulerStarted = true;
  ensureBackupDirs();

  try {
    createBackupSnapshot('SERVER_STARTUP', 'system');
  } catch (err) {
    console.warn('Initial backup snapshot warning:', err);
  }

  const timer = setInterval(() => {
    try {
      createBackupSnapshot('PERIODIC_15M', 'system');
    } catch (err) {
      console.warn('Periodic backup warning:', err);
    }
  }, BACKUP_INTERVAL_MS);
  timer.unref();
}
