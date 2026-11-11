/**
 * Automated Verification Suite for PosBot Developer API Integration
 * Run via: npx tsx src/server/__tests__/posbot.test.ts
 */

import assert from 'node:assert/strict';
import {
  DOCUMENTED_POSBOT_MODELS,
  MODEL_BY_KEY,
  isPublicHttpUrl,
  validateGeneratePayload,
  validateJobCode,
} from '../posbotSchema';
import {
  PosBotClient,
  getPosBotConfigStatus,
  redactSecret,
} from '../posbotClient';

async function runTests() {
  let passed = 0;

  function test(name: string, fn: () => void | Promise<void>) {
    return Promise.resolve(fn()).then(() => {
      passed++;
      console.log(`  ✓ ${name}`);
    });
  }

  console.log('=== PosBot Developer API v1 Verification Suite ===\n');

  // 1. Model Catalog Completeness
  await test('Catalog defines all 60+ documented models including Seedance 2.5 flagship models', () => {
    assert.ok(DOCUMENTED_POSBOT_MODELS.length >= 60, `Expected >=60 models, got ${DOCUMENTED_POSBOT_MODELS.length}`);
    const requiredKeys = [
      'seedance_25_15s',
      'seedance_25_30s',
      'seedance_25_15s_r2v',
      'seedance_25_30s_r2v',
      'krea2_2k',
      'gpt_image_25',
      'gpt_image_25_sunburst',
      'face_swap',
      'upscale_4k',
      'kling_30_15s',
      'wan_30_hd',
      'minimax_lipsync',
      'ltx_lipsync',
      'motion_control_pro',
      'betamotion_1080p_max',
      'upscale_2k_60fps',
      'watermark_remover',
      'google_tts',
      'suno_v6',
      'lyria_35',
    ];
    for (const key of requiredKeys) {
      assert.ok(MODEL_BY_KEY[key], `Missing model key: ${key}`);
    }
    assert.equal(MODEL_BY_KEY.seedance_25_15s.maxPromptLength, 8000);
    assert.equal(MODEL_BY_KEY.seedance_25_15s.maxImages, 9);
    assert.equal(MODEL_BY_KEY.seedance_25_30s.documentedCostGenerate, 7);
  });

  // 2. Public URL & SSRF Validation
  await test('isPublicHttpUrl rejects localhost, loopback, RFC1918 private IPs, and non-HTTP protocols', () => {
    assert.equal(isPublicHttpUrl('https://cdn.example.com/photo.jpg').valid, true);
    assert.equal(isPublicHttpUrl('http://localhost:3000/photo.jpg').valid, false);
    assert.equal(isPublicHttpUrl('http://127.0.0.1/photo.jpg').valid, false);
    assert.equal(isPublicHttpUrl('http://10.0.0.42/photo.jpg').valid, false);
    assert.equal(isPublicHttpUrl('http://192.168.1.100/photo.jpg').valid, false);
    assert.equal(isPublicHttpUrl('http://172.16.5.4/photo.jpg').valid, false);
    assert.equal(isPublicHttpUrl('http://169.254.169.254/latest/meta-data').valid, false);
    assert.equal(isPublicHttpUrl('file:///etc/passwd').valid, false);
  });

  // 3. Prompt Length Validation per Model
  await test('validateGeneratePayload enforces model-specific prompt length bounds', () => {
    // Seedance 2.5 allows up to 8000 chars, rejects > 8000
    const validSeedance = validateGeneratePayload({
      model: 'seedance_25_15s',
      prompt: 'A'.repeat(7900),
      aspect_ratio: '16:9',
    });
    assert.equal(validSeedance.valid, true);

    const tooLongSeedance = validateGeneratePayload({
      model: 'seedance_25_15s',
      prompt: 'A'.repeat(8001),
    });
    assert.equal(tooLongSeedance.valid, false);

    // Suno V6 allows up to 2000 chars, rejects > 2000
    const tooLongSuno = validateGeneratePayload({
      model: 'suno_v6',
      prompt: 'B'.repeat(2005),
    });
    assert.equal(tooLongSuno.valid, false);

    // GPT Image 2.5 allows up to 20000 chars
    const validGpt25 = validateGeneratePayload({
      model: 'gpt_image_25',
      prompt: 'C'.repeat(15000),
    });
    assert.equal(validGpt25.valid, true);
  });

  // 4. Required Media Field Validation
  await test('validateGeneratePayload enforces required media fields for Face Swap, LipSync, Motion, and R2V', () => {
    const missingSwap = validateGeneratePayload({
      model: 'face_swap',
      image_url: 'https://example.com/base.jpg',
    });
    assert.equal(missingSwap.valid, false);
    assert.ok(missingSwap.fieldErrors?.swap_image);

    const validSwap = validateGeneratePayload({
      model: 'face_swap',
      image_url: 'https://example.com/base.jpg',
      swap_image: 'https://example.com/face.jpg',
    });
    assert.equal(validSwap.valid, true);

    const missingLipSyncAudio = validateGeneratePayload({
      model: 'minimax_lipsync',
      video_url: 'https://example.com/clip.mp4',
    });
    assert.equal(missingLipSyncAudio.valid, false);
    assert.ok(missingLipSyncAudio.fieldErrors?.audio_url);

    const missingR2VRefs = validateGeneratePayload({
      model: 'seedance_25_15s_r2v',
      prompt: 'Cinematographic car pursuit sequence',
    });
    assert.equal(missingR2VRefs.valid, false);
    assert.ok(missingR2VRefs.fieldErrors?.reference_image_urls);
  });

  // 5. Multi-Image Reference Limit Validation
  await test('validateGeneratePayload enforces max reference image counts per model', () => {
    const tenUrls = Array.from({ length: 10 }, (_, i) => `https://example.com/ref_${i}.jpg`);
    const tooManyForSeedance = validateGeneratePayload({
      model: 'seedance_25_15s_r2v',
      prompt: 'Multi-shot tracking sequence',
      reference_image_urls: tenUrls,
    });
    assert.equal(tooManyForSeedance.valid, false);

    const nineUrls = tenUrls.slice(0, 9);
    const validNineForSeedance = validateGeneratePayload({
      model: 'seedance_25_15s_r2v',
      prompt: 'Multi-shot tracking sequence',
      reference_image_urls: nineUrls,
    });
    assert.equal(validNineForSeedance.valid, true);
  });

  // 6. Job Code Validation
  await test('validateJobCode blocks path traversal and injection characters', () => {
    assert.equal(validateJobCode('PB-20260417-ABCD1234').valid, true);
    assert.equal(validateJobCode('../../etc/passwd').valid, false);
    assert.equal(validateJobCode('job_123; rm -rf /').valid, false);
    assert.equal(validateJobCode('').valid, false);
  });

  // 7. Secret Redaction & Missing Credential Handling
  await test('Secret redaction strips POSBOT_API_KEY and posbot_live_ tokens from error messages', async () => {
    const prevKey = process.env.POSBOT_API_KEY;
    try {
      process.env.POSBOT_API_KEY = 'YOUR_NEW_ROTATED_API_KEY';
      const statusPlaceholder = getPosBotConfigStatus();
      assert.equal(statusPlaceholder.configured, false);

      const client = new PosBotClient();
      const balMissing = await client.getBalance();
      assert.equal(balMissing.ok, false);
      assert.equal(balMissing.status, 503);

      const genMissing = await client.submitGenerate({
        model: 'krea2_2k',
        prompt: 'Test prompt',
      });
      assert.equal(genMissing.ok, false);
      assert.equal(genMissing.status, 503);

      // Test redaction of live key pattern
      const fakeSecret = 'posbot_live_test_secret_token_999999';
      const leakedString = `Upstream failed with header Authorization: Bearer ${fakeSecret}`;
      const scrubbed = redactSecret(leakedString, fakeSecret);
      assert.ok(!scrubbed.includes(fakeSecret), 'Secret was not redacted');
      assert.ok(scrubbed.includes('[REDACTED_POSBOT_KEY]'));
    } finally {
      if (prevKey === undefined) {
        delete process.env.POSBOT_API_KEY;
      } else {
        process.env.POSBOT_API_KEY = prevKey;
      }
    }
  });

  console.log(`\nAll ${passed} PosBot verification tests passed!\n`);
}

runTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
