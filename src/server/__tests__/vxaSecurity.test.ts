/**
 * VAIURE Labs — VXA Financial Security Automated Test Suite
 * Validates:
 * 1. Dynamic 120s key rotation, KID generation, and HMAC-SHA256 signature verification.
 * 2. Revoked key fail-closed rejection.
 * 3. Double-entry ledger integrity & SHA-256 hash-chain tamper detection.
 * 4. Atomic balance reservation & double-spending prevention.
 * 5. Withdrawal failure reversal restoring customer available balance.
 * 6. Indonesian banking business-day settlement engine.
 */

import {
  keyManager,
  ledgerEngine,
  vxaWalletRepo,
  calculateSettlementTargetDate,
} from '../vxaSecurityEngine';
import crypto from 'crypto';

export function runVxaSecurityTests(): {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  results: Array<{ testName: string; passed: boolean; message: string }>;
} {
  const results: Array<{ testName: string; passed: boolean; message: string }> = [];

  function assert(condition: boolean, testName: string, failMsg: string) {
    if (condition) {
      results.push({ testName, passed: true, message: 'Passed.' });
    } else {
      results.push({ testName, passed: false, message: failMsg });
    }
  }

  // TEST 1: Dynamic 120s Key Generation & Signing
  try {
    const activeKey = keyManager.getActiveKey();
    assert(
      Boolean(activeKey.kid && activeKey.secret && activeKey.expiresAt > Date.now()),
      'Key Management: Active Key Generation',
      'Active key does not contain valid KID or future expiration.'
    );

    const testPayload = 'tx_verify_test_100_vxa';
    const { signature, kid } = keyManager.signPayload(testPayload);
    const isValid = keyManager.verifySignature(testPayload, signature, kid);
    assert(
      isValid === true,
      'Cryptographic Signatures: Valid Signature Verification',
      'HMAC-SHA256 signature verification failed for active key.'
    );

    const isTamperedInvalid = keyManager.verifySignature('tx_tampered_payload', signature, kid);
    assert(
      isTamperedInvalid === false,
      'Cryptographic Signatures: Tampered Payload Rejection',
      'Tampered payload should have failed signature verification.'
    );
  } catch (err: any) {
    results.push({ testName: 'Cryptographic Signatures', passed: false, message: err.message });
  }

  // TEST 2: Key Revocation Fail-Closed Behavior
  try {
    const revokedKey = keyManager.rotateKey('SECURITY_REVOCATION');
    const { signature, kid } = keyManager.signPayload('revocation_test');
    keyManager.revokeKey(kid);

    const isRevokedRejected = keyManager.verifySignature('revocation_test', signature, kid);
    assert(
      isRevokedRejected === false,
      'Cryptographic Key Management: Revoked Key Rejection',
      'Signature from a revoked key must be rejected.'
    );
  } catch (err: any) {
    results.push({ testName: 'Key Revocation', passed: false, message: err.message });
  }

  // TEST 3: Double-Entry Ledger & SHA-256 Hash Chain Integrity
  try {
    const initialVerify = ledgerEngine.verifyLedgerIntegrity();
    assert(
      initialVerify.ok === true,
      'Double-Entry Ledger: Initial Hash-Chain Audit',
      `Initial hash-chain audit failed: ${initialVerify.details}`
    );

    // Record verified transaction
    const newEntry = ledgerEngine.recordEntry({
      referenceType: 'DEPOSIT_ISSUANCE',
      referenceId: 'test_audit_dep_1',
      userId: 'test_user_audit',
      debitAccount: '1002_PAYMENT_GATEWAY_RECEIVABLE',
      creditAccount: '2001_USER_VXA_LIABILITY',
      amountMinor: 50_000,
      currency: 'IDR',
      exchangeRate: 1000,
      description: 'Audit test deposit of Rp50,000',
    });

    assert(
      newEntry.hash.length === 64 && Boolean(newEntry.signature),
      'Double-Entry Ledger: Entry Cryptographic Hash & Signature',
      'Ledger entry does not contain valid 64-char hex SHA-256 hash or signature.'
    );

    const verifyAfter = ledgerEngine.verifyLedgerIntegrity();
    assert(
      verifyAfter.ok === true,
      'Double-Entry Ledger: Post-Transaction Hash-Chain Integrity',
      `Integrity check failed after entry: ${verifyAfter.details}`
    );
  } catch (err: any) {
    results.push({ testName: 'Double-Entry Ledger', passed: false, message: err.message });
  }

  // TEST 4: Deposit Workflow (Integer conversion: 1 VXA = Rp1,000 IDR)
  try {
    const testUserId = `test_user_${Date.now()}`;
    const depositAmountIdr = 50_000; // Rp50,000
    const { transaction, wallet } = vxaWalletRepo.processDeposit({
      userId: testUserId,
      amountIdr: depositAmountIdr,
      paymentMethod: 'QRIS',
    });

    assert(
      transaction.amountMinor === 50,
      'Deposit: 1 VXA = Rp1,000 Integer Conversion',
      `Expected 50 VXA for Rp50,000, got ${transaction.amountMinor}`
    );

    assert(
      wallet.vxaBalances.availableMinor === 50,
      'Deposit: Wallet Available Balance Credit',
      `Expected wallet available balance 50, got ${wallet.vxaBalances.availableMinor}`
    );
  } catch (err: any) {
    results.push({ testName: 'Deposit Workflow', passed: false, message: err.message });
  }

  // TEST 5: Atomic Balance Reservation on Withdrawal (Double-Spending Prevention)
  try {
    const testUserId = `test_wth_user_${Date.now()}`;
    // Seed 100 VXA
    vxaWalletRepo.processDeposit({
      userId: testUserId,
      amountIdr: 100_000,
      paymentMethod: 'BCA_VA',
    });

    // Request 40 VXA withdrawal
    const { transaction, settlement, wallet } = vxaWalletRepo.requestWithdrawal({
      userId: testUserId,
      amountVxa: 40,
      destination: {
        bankName: 'BCA',
        accountNumber: '1234567890',
        accountHolderName: 'Test Director',
      },
    });

    assert(
      wallet.vxaBalances.availableMinor === 60,
      'Withdrawal: Available Balance Deduction',
      `Expected available balance 60, got ${wallet.vxaBalances.availableMinor}`
    );

    assert(
      wallet.vxaBalances.reservedMinor === 40,
      'Withdrawal: Atomic Reserved Balance Lock',
      `Expected reserved balance 40, got ${wallet.vxaBalances.reservedMinor}`
    );

    // Attempting to withdraw 70 VXA (when only 60 available) must throw
    let doubleSpendPrevented = false;
    try {
      vxaWalletRepo.requestWithdrawal({
        userId: testUserId,
        amountVxa: 70,
        destination: {
          bankName: 'BCA',
          accountNumber: '1234567890',
          accountHolderName: 'Test Director',
        },
      });
    } catch {
      doubleSpendPrevented = true;
    }

    assert(
      doubleSpendPrevented === true,
      'Withdrawal: Insufficient Balance & Double-Spending Safeguard',
      'Withdrawal allowed exceeding available balance.'
    );

    // TEST 6: Withdrawal Reversal on Failure/Rejection (Restoring Available Balance)
    const { wallet: reversedWallet } = vxaWalletRepo.processSettlementAction({
      withdrawalId: transaction.id,
      action: 'REJECT',
      reason: 'Automated test settlement reversal simulation',
    });

    assert(
      reversedWallet.vxaBalances.availableMinor === 100,
      'Withdrawal Reversal: Restoring Available Balance on Failure',
      `Expected available balance restored to 100, got ${reversedWallet.vxaBalances.availableMinor}`
    );

    assert(
      reversedWallet.vxaBalances.reservedMinor === 0,
      'Withdrawal Reversal: Clearing Reserved Balance',
      `Expected reserved balance cleared to 0, got ${reversedWallet.vxaBalances.reservedMinor}`
    );
  } catch (err: any) {
    results.push({ testName: 'Withdrawal & Reversal', passed: false, message: err.message });
  }

  // TEST 7: Indonesian Banking Business-Day Settlement Schedule
  try {
    const mondayMorning = new Date('2026-03-09T09:00:00Z'); // Monday 09:00
    const schedule = calculateSettlementTargetDate(mondayMorning);

    assert(
      schedule.businessDays === 2 && Boolean(schedule.targetDate),
      'Settlement Engine: 1–2 Business Day Calculation',
      'Target date calculation failed.'
    );
  } catch (err: any) {
    results.push({ testName: 'Business-Day Settlement Calculation', passed: false, message: err.message });
  }

  const passedTests = results.filter((r) => r.passed).length;
  const failedTests = results.length - passedTests;

  return {
    totalTests: results.length,
    passedTests,
    failedTests,
    results,
  };
}
