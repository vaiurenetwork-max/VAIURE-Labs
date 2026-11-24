/**
 * Automated Verification Suite for ByteDance BytePlus ModelArk API v3 Integration
 * Run via: npx tsx src/server/__tests__/bytedance.test.ts
 */

import assert from 'node:assert/strict';
import {
  DOCUMENTED_BYTEDANCE_MODELS,
  MODEL_BY_KEY,
  isPublicHttpUrl,
  resolveUpstreamByteDanceModel,
  validateGeneratePayload,
  validateJobCode,
} from '../bytedanceSchema';
import {
  ByteDanceClient,
  buildByteDanceVideoTaskPayload,
  getByteDanceConfigStatus,
  redactSecret,
} from '../bytedanceClient';

async function runTests() {
  let passed = 0;

  function test(name: string, fn: () => void | Promise<void>) {
    return Promise.resolve(fn()).then(() => {
      passed++;
      console.log(`  ✓ ${name}`);
    });
  }

  console.log('=== ByteDance BytePlus ModelArk API v3 Verification Suite ===\n');

  // 1. Model Catalog & Aliases
  await test('Catalog defines Seedance 2.5, Seedance 2.0, 1.5 Pro, and Seedream 5.0 models', () => {
    assert.ok(DOCUMENTED_BYTEDANCE_MODELS.length >= 8);
    for (const key of [
      'seedance_25_15s',
      'seedance_25_30s',
      'seedance_25_15s_r2v',
      'seedance_25_30s_r2v',
      'seedream_50_2k',
      'seedream_50_4k',
    ]) {
      assert.ok(MODEL_BY_KEY[key], `Missing model key: ${key}`);
    }
    assert.equal(MODEL_BY_KEY.seedance_25_15s.maxPromptLength, 8000);
    assert.equal(MODEL_BY_KEY.seedance_25_15s.maxImages, 9);
    assert.equal(resolveUpstreamByteDanceModel('seedance_25_15s'), 'seedance-2-5-260628');
  });

  // 2. Public URL & SSRF Validation
  await test('isPublicHttpUrl blocks private/loopback networks and allows public HTTPS URLs', () => {
    assert.equal(isPublicHttpUrl('https://cdn.example.com/ref.jpg').valid, true);
    assert.equal(isPublicHttpUrl('http://localhost:3000/ref.jpg').valid, false);
    assert.equal(isPublicHttpUrl('http://127.0.0.1/ref.jpg').valid, false);
    assert.equal(isPublicHttpUrl('http://10.0.0.5/ref.jpg').valid, false);
    assert.equal(isPublicHttpUrl('http://192.168.1.10/ref.jpg').valid, false);
    assert.equal(isPublicHttpUrl('file:///etc/passwd').valid, false);
  });

  // 3. ByteDance ModelArk v3 Video Task Payload Builder
  await test('buildByteDanceVideoTaskPayload constructs official v3 content array with text & roles', () => {
    const validated = validateGeneratePayload({
      model: 'seedance_25_15s_r2v',
      prompt: 'Cinematic tracking shot through obsidian gallery',
      aspect_ratio: '16:9',
      resolution: '720P',
      sound_enabled: true,
      reference_image_urls: [
        'https://cdn.example.com/char.jpg',
        'https://cdn.example.com/outfit.jpg',
      ],
    });
    assert.equal(validated.valid, true);
    const body = buildByteDanceVideoTaskPayload(validated.sanitizedPayload!, validated.modelDef);
    assert.equal(body.model, 'seedance-2-5-260628');
    assert.equal(body.ratio, '16:9');
    assert.equal(body.duration, 15);
    assert.equal(body.resolution, '720p');
    assert.equal(body.generate_audio, true);
    assert.equal(body.watermark, false);
    assert.equal(body.content[0].type, 'text');
    assert.equal(body.content[1].type, 'image_url');
    assert.equal(body.content[1].role, 'reference_image');
    assert.equal(body.content[2].role, 'reference_image');
  });

  // 4. First-Frame I2V Role Mapping
  await test('buildByteDanceVideoTaskPayload maps image_url and end_image_url to first_frame and last_frame', () => {
    const validated = validateGeneratePayload({
      model: 'seedance_25_15s',
      prompt: 'Smooth transition between frames',
      image_url: 'https://cdn.example.com/start.jpg',
      end_image_url: 'https://cdn.example.com/end.jpg',
    });
    assert.equal(validated.valid, true);
    const body = buildByteDanceVideoTaskPayload(validated.sanitizedPayload!, validated.modelDef);
    assert.equal(body.content.find((c) => c.role === 'first_frame')?.image_url?.url, 'https://cdn.example.com/start.jpg');
    assert.equal(body.content.find((c) => c.role === 'last_frame')?.image_url?.url, 'https://cdn.example.com/end.jpg');
  });

  // 5. Validation Bounds
  await test('validateGeneratePayload enforces 8,000 char limit, max 9 images, and R2V required images', () => {
    const tooLong = validateGeneratePayload({
      model: 'seedance_25_15s',
      prompt: 'A'.repeat(8001),
    });
    assert.equal(tooLong.valid, false);

    const missingRefs = validateGeneratePayload({
      model: 'seedance_25_15s_r2v',
      prompt: 'Valid prompt',
    });
    assert.equal(missingRefs.valid, false);
    assert.ok(missingRefs.fieldErrors?.reference_image_urls);

    const tenUrls = Array.from({ length: 10 }, (_, i) => `https://cdn.example.com/${i}.jpg`);
    const tooManyRefs = validateGeneratePayload({
      model: 'seedance_25_15s_r2v',
      prompt: 'Valid prompt',
      reference_image_urls: tenUrls,
    });
    assert.equal(tooManyRefs.valid, false);
  });

  // 6. Task ID Validation
  await test('validateJobCode accepts ModelArk task IDs and blocks path traversal', () => {
    assert.equal(validateJobCode('cgt-20261115120000-abcde').valid, true);
    assert.equal(validateJobCode('../../etc/passwd').valid, false);
    assert.equal(validateJobCode('').valid, false);
  });

  // 7. Secret Redaction & Missing Credential Guard
  await test('Secret redaction strips BYTEDANCE_API_KEY and client returns 503 when unconfigured', async () => {
    const prevBd = process.env.BYTEDANCE_API_KEY;
    const prevArk = process.env.ARK_API_KEY;
    try {
      process.env.BYTEDANCE_API_KEY = 'YOUR_BYTEDANCE_ARK_API_KEY';
      delete process.env.ARK_API_KEY;
      const status = getByteDanceConfigStatus();
      assert.equal(status.configured, false);

      const client = new ByteDanceClient();
      const health = await client.checkHealth();
      assert.equal(health.ok, false);
      assert.equal(health.status, 503);

      const gen = await client.submitGenerate({
        model: 'seedance_25_15s',
        prompt: 'Test cinematic render',
      });
      assert.equal(gen.ok, false);
      assert.equal(gen.status, 503);

      const fakeKey = 'ark-test-secret-9988776655443322';
      const scrubbed = redactSecret(`Authorization: Bearer ${fakeKey}`, fakeKey);
      assert.ok(!scrubbed.includes(fakeKey));
      assert.ok(scrubbed.includes('[REDACTED_BYTEDANCE_KEY]'));
    } finally {
      if (prevBd === undefined) delete process.env.BYTEDANCE_API_KEY;
      else process.env.BYTEDANCE_API_KEY = prevBd;
      if (prevArk !== undefined) process.env.ARK_API_KEY = prevArk;
    }
  });

  console.log(`\nAll ${passed} ByteDance ModelArk verification tests passed!\n`);
}

runTests().catch((err) => {
  console.error('ByteDance verification suite failed:', err);
  process.exit(1);
});
