/**
 * VAIURE Studio — Comprehensive Security Hardening Automated Test Suite
 * Verifies:
 * 1. Scrypt PIN hashing & 5-attempt brute-force lockout
 * 2. Cryptographic HMAC deposit token tampering & single-use replay rejection
 * 3. Terminal withdrawal settlement replay rejection
 * 4. SSRF private/loopback/metadata/obfuscated IP blocking
 * 5. Path traversal & identifier validation blocking
 * 6. Magic-byte media upload validation rejecting spoofed SVG/HTML/script payloads
 * 7. Backup snapshot creation, SHA-256 tamper detection, and error sanitization
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  vxaWalletRepo,
} from '../vxaSecurityEngine';
import {
  assertPublicRemoteUrl,
  validatePublicHttpUrl,
  isSafeIdentifier,
  resolveSafeSubpath,
  validateMagicBytes,
  sanitizeErrorMessage,
  isTrustedOrigin,
  constantTimeCompare,
  bruteForceGuard,
} from '../securityMiddleware';
import {
  BACKUP_ROOT_DIR,
  createBackupSnapshot,
  verifyBackupSnapshot,
} from '../backupService';

export interface SecurityAuditTestResult {
  testName: string;
  passed: boolean;
  message: string;
}

export async function runSecurityAuditTests(): Promise<{
  totalTests: number;
  passedTests: number;
  failedTests: number;
  results: SecurityAuditTestResult[];
}> {
  const results: SecurityAuditTestResult[] = [];

  async function runCase(testName: string, fn: () => void | Promise<void>) {
    try {
      await fn();
      results.push({ testName, passed: true, message: 'Passed.' });
    } catch (err: any) {
      results.push({ testName, passed: false, message: err?.message || String(err) });
    }
  }

  // 1. Scrypt PIN Hashing & 5-Attempt Brute-Force Lockout
  await runCase('VXA PIN: Scrypt Hashing & 5-Attempt Lockout', () => {
    const uid = `sec_pin_user_${Date.now()}`;
    vxaWalletRepo.setStepUpPin(uid, '482910');
    const wallet = vxaWalletRepo.getOrCreateWallet(uid);

    assert.ok(wallet.stepUpPinHash?.startsWith('scrypt:'), 'PIN must be stored using scrypt');
    assert.ok(!wallet.stepUpPinHash?.includes('482910'), 'Plaintext PIN must never be stored');
    assert.equal(vxaWalletRepo.verifyStepUpPin(uid, '482910'), true);

    for (let i = 0; i < 4; i++) {
      assert.equal(vxaWalletRepo.verifyStepUpPin(uid, '000000'), false);
    }

    assert.throws(
      () => vxaWalletRepo.verifyStepUpPin(uid, '000000'),
      /locked/i,
      '5th invalid PIN attempt must trigger brute-force lockout'
    );
    assert.throws(
      () => vxaWalletRepo.verifyStepUpPin(uid, '482910'),
      /locked/i,
      'Valid PIN must remain blocked while lockout window is active'
    );
    bruteForceGuard.reset(`vxa_pin:${uid}`);
  });

  // 2. Cryptographic HMAC Deposit Token Forge & Replay Rejection
  await runCase('VXA Deposit: HMAC Signature Verification & Single-Use Replay Block', () => {
    const uid = `sec_dep_user_${Date.now()}`;
    const depositRef = `DEP_TEST_${Date.now()}`;
    const token = vxaWalletRepo.issueDepositToken({
      userId: uid,
      amountIdr: 50_000,
      depositRef,
      paymentMethod: 'QRIS',
    });

    // Forged amount must fail
    const forgedAmount = vxaWalletRepo.verifyDepositToken(token, {
      userId: uid,
      amountIdr: 500_000_000,
      depositRef,
    });
    assert.equal(forgedAmount.valid, false, 'Amount tampering must be rejected');

    // Forged userId must fail
    const forgedUser = vxaWalletRepo.verifyDepositToken(token, {
      userId: 'other_user',
      amountIdr: 50_000,
      depositRef,
    });
    assert.equal(forgedUser.valid, false, 'Cross-user token hijack must be rejected');

    // Valid token succeeds once
    const validFirst = vxaWalletRepo.verifyDepositToken(token, {
      userId: uid,
      amountIdr: 50_000,
      depositRef,
    });
    assert.equal(validFirst.valid, true, 'First valid verification should pass');

    // Replay of same token must fail
    const replaySecond = vxaWalletRepo.verifyDepositToken(token, {
      userId: uid,
      amountIdr: 50_000,
      depositRef,
    });
    assert.equal(replaySecond.valid, false, 'Replaying a consumed depositToken must fail');
  });

  // 3. Terminal Settlement State Replay Prevention
  await runCase('VXA Settlement: Terminal State Replay Block', () => {
    const uid = `sec_settle_user_${Date.now()}`;
    vxaWalletRepo.processDeposit({ userId: uid, amountIdr: 100_000, paymentMethod: 'QRIS' });
    const { transaction } = vxaWalletRepo.requestWithdrawal({
      userId: uid,
      amountVxa: 50,
      destination: { bankName: 'BCA', accountNumber: '1234567890', accountHolderName: 'Audit' },
    });

    const rejected = vxaWalletRepo.processSettlementAction({
      withdrawalId: transaction.id,
      action: 'REJECT',
      reason: 'Security audit test rejection',
    });
    assert.equal(rejected.settlement.currentStatus, 'REJECTED');

    assert.throws(
      () =>
        vxaWalletRepo.processSettlementAction({
          withdrawalId: transaction.id,
          action: 'REJECT',
          reason: 'Duplicate reversal attempt',
        }),
      /terminal state/i,
      'Re-processing a terminal REJECTED settlement must throw'
    );
  });

  // 4. SSRF URL Validation & Private IP Blocking
  await runCase('SSRF Guard: Private, Loopback, Metadata & Obfuscated IP Blocking', async () => {
    const blockedUrls = [
      'http://127.0.0.1:3000/api/admin/bootstrap',
      'http://169.254.169.254/latest/meta-data/',
      'http://metadata.google.internal/computeMetadata/v1/',
      'http://10.0.0.5:8080/internal',
      'http://192.168.1.1/admin',
      'http://[::1]:3000/',
      'http://2130706433/test',
      'http://0x7f000001/test',
      'file:///etc/passwd',
      'http://user:pass@example.com/hook',
    ];

    for (const url of blockedUrls) {
      const staticCheck = validatePublicHttpUrl(url);
      assert.equal(staticCheck.valid, false, `Blocked URL must be rejected: ${url}`);
      await assert.rejects(() => assertPublicRemoteUrl(url));
    }

    const okCheck = validatePublicHttpUrl('https://storage.googleapis.com/demo/video.mp4');
    assert.equal(okCheck.valid, true, 'Legitimate public HTTPS asset URL must be accepted');
  });

  // 5. Path Traversal & Identifier Validation
  await runCase('Path Traversal & Safe Identifier Enforcement', () => {
    assert.equal(isSafeIdentifier('../etc/passwd'), false);
    assert.equal(isSafeIdentifier('abc/../../secret'), false);
    assert.equal(isSafeIdentifier('valid_asset-123'), true);

    const base = path.resolve(process.cwd(), 'uploads');
    assert.equal(resolveSafeSubpath(base, '../.env'), null);
    assert.equal(resolveSafeSubpath(base, 'sub/../../package.json'), null);
    assert.ok(resolveSafeSubpath(base, 'demo_file.png')?.startsWith(base));
  });

  // 6. Magic-Byte File Upload Validation (SVG / HTML / Executable Rejection)
  await runCase('Upload Validation: Reject Spoofed SVG/HTML/Script & Allow Real PNG/JPEG', () => {
    const svgSpoof = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
    assert.equal(validateMagicBytes(svgSpoof, 'image/png', ['image']).valid, false);

    const htmlSpoof = Buffer.from('<!DOCTYPE html><html><script>alert(1)</script></html>');
    assert.equal(validateMagicBytes(htmlSpoof, 'image/jpeg', ['image']).valid, false);

    const exeHeader = Buffer.from('MZ\x90\x00\x03\x00\x00\x00');
    assert.equal(validateMagicBytes(exeHeader, 'image/png', ['image']).valid, false);

    const realPng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
    const pngRes = validateMagicBytes(realPng, 'image/png', ['image']);
    assert.equal(pngRes.valid, true);
    assert.equal(pngRes.detectedMime, 'image/png');
  });

  // 7. Backup Snapshot Creation, SHA-256 Integrity & Tamper Detection + Origin & Sanitization
  await runCase('Backup Integrity, Origin Check & Error Sanitization', () => {
    const manifest = createBackupSnapshot('SECURITY_AUDIT_TEST', 'audit_suite');
    const snapDir = path.join(BACKUP_ROOT_DIR, 'snapshots', manifest.id);

    try {
      const initialVerify = verifyBackupSnapshot(manifest.id);
      assert.equal(initialVerify.valid, true, 'Fresh backup snapshot must pass SHA-256 verification');

      if (manifest.files.length > 0) {
        const firstTarget = path.join(snapDir, manifest.files[0].snapshotFilename);
        fs.appendFileSync(firstTarget, '/* tampered */');
        const tamperedVerify = verifyBackupSnapshot(manifest.id);
        assert.equal(tamperedVerify.valid, false, 'Tampered snapshot file must fail SHA-256 verification');
        assert.ok(tamperedVerify.failures.some((f) => f.includes('Checksum mismatch')));
      }
    } finally {
      fs.rmSync(snapDir, { recursive: true, force: true });
    }

    assert.equal(isTrustedOrigin('https://evil.attacker.example', 'localhost:3000'), false);
    assert.equal(isTrustedOrigin('null', 'localhost:3000'), false);
    assert.equal(isTrustedOrigin('https://aistudio.google.com', 'localhost:3000'), true);
    assert.equal(constantTimeCompare('secret_123', 'secret_123'), true);
    assert.equal(constantTimeCompare('secret_123', 'secret_124'), false);

    const scrubbed = sanitizeErrorMessage(new Error('ENOENT: /app/applet/.env AIzaSySecretKeyValue123456789012'), 'Fallback error');
    assert.equal(scrubbed, 'Fallback error');
  });

  const passedTests = results.filter((r) => r.passed).length;
  const failedTests = results.length - passedTests;

  return {
    totalTests: results.length,
    passedTests,
    failedTests,
    results,
  };
}

// Execute immediately if invoked directly via `tsx`
const isDirectExec =
  typeof process !== 'undefined' &&
  Array.isArray(process.argv) &&
  process.argv[1]?.includes('securityAudit.test');

if (isDirectExec) {
  runSecurityAuditTests()
    .then((summary) => {
      console.log(JSON.stringify(summary, null, 2));
      if (summary.failedTests > 0) {
        process.exit(1);
      }
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
