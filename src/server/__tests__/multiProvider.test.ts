/**
 * VAIURE — Multi-Provider AI Video Generation Integration & Unit Test Suite
 * Verifies:
 * 1. Exact 16-cell MUAPI Seedance 2.5 Spicy USD Pricing Matrix + separated App Markup
 * 2. Strict non-downgrading capability validation
 * 3. Strict 10-key MUAPI payload builder + draft 480p force + finalization payload
 * 4. Draft -> Finalize Draft orchestration & parent_draft_job_id linkage
 * 5. MUAPI response/status/output/error normalization + API secret redaction
 * 6. Live Express router behavior (/api/providers, /api/generations/estimate, auth boundaries)
 */

import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import {
  MUAPI_SEEDANCE_25_SPICY_MODEL_ID,
  MUAPI_SPICY_USD_PRICING_MATRIX,
} from '../multiProvider/config/pricing.config';
import {
  DEFAULT_MUAPI_MODELS,
  validateCapabilitySelection,
} from '../multiProvider/config/model.capabilities';
import {
  buildMuapiPayload,
  extractMuapiError,
  extractMuapiOutputs,
  MuapiProviderAdapter,
  normalizeMuapiStatus,
  redactMuapiSecrets,
} from '../multiProvider/providers/muapi.provider';
import { calculateAuthoritativeEstimate } from '../multiProvider/services/pricing.service';
import { generationJobsStore } from '../multiProvider/firebase/firestore.service';
import { prepareFinalizeDraftInput } from '../multiProvider/services/draft.service';
import { createMultiProviderRouter } from '../multiProvider/routes/multiProviderRoutes';
import {
  buildSignedMuapiWebhookUrl,
  signMuapiWebhookToken,
  verifyMuapiWebhookToken,
} from '../multiProvider/services/realtimeEvents.service';
import { providerConfigStore } from '../multiProvider/config/provider.config';
import { runRealtimeBackendConnectionTest } from '../multiProvider/services/connectionTest.service';
import { UnifiedGenerationJob } from '../../types/multiProvider';

async function runTests() {
  console.log('--- Running VAIURE Multi-Provider Video Generation Tests ---');

  // 1. Exact 16-cell MUAPI Seedance 2.5 Spicy USD Pricing Matrix
  const expectedMatrix: Record<string, Record<number, number>> = {
    '480p': { 5: 0.94, 10: 1.87, 20: 3.74, 30: 5.61 },
    '720p': { 5: 1.87, 10: 3.74, 20: 7.48, 30: 11.22 },
    '1080p': { 5: 4.67, 10: 9.35, 20: 18.7, 30: 28.05 },
    '4K': { 5: 9.35, 10: 18.7, 20: 37.4, 30: 56.1 },
  };

  for (const [res, durations] of Object.entries(expectedMatrix)) {
    for (const [durStr, expectedUsd] of Object.entries(durations)) {
      const dur = Number(durStr);
      assert.equal(
        MUAPI_SPICY_USD_PRICING_MATRIX[res][dur],
        expectedUsd,
        `Pricing mismatch at ${res}/${dur}s`
      );
      const est = calculateAuthoritativeEstimate({
        provider: 'muapi',
        modelId: MUAPI_SEEDANCE_25_SPICY_MODEL_ID,
        resolution: res as any,
        duration: dur,
        draft: false,
      });
      assert.equal(est.currency, 'USD');
      assert.equal(est.providerCostUsd, expectedUsd);
      assert.equal(est.finalPriceUsd, expectedUsd);
    }
  }
  console.log('✓ Test 1 Passed: Exact 16-cell MUAPI USD pricing matrix verified');

  // 2. App Markup Separation & Draft 480p Price Lock
  const adapter = new MuapiProviderAdapter();
  const muapiModelClone = JSON.parse(JSON.stringify(DEFAULT_MUAPI_MODELS[0]));
  muapiModelClone.appMarkupPercent = 15;
  muapiModelClone.appMarkupFlatUsd = 0.5;
  const markedUp = adapter.calculateEstimatedPrice(muapiModelClone, {
    resolution: '4K',
    duration: 30,
    draft: false,
  });
  assert.equal(markedUp.providerCostUsd, 56.1);
  assert.equal(markedUp.appMarkupUsd, 8.92); // roundUsd(56.10 * 0.15 + 0.50 = 8.915 -> 8.92)
  assert.equal(markedUp.finalPriceUsd, 65.02);

  const draftEst = calculateAuthoritativeEstimate({
    provider: 'muapi',
    modelId: MUAPI_SEEDANCE_25_SPICY_MODEL_ID,
    resolution: '4K',
    duration: 5,
    draft: true,
  });
  assert.equal(draftEst.effectiveResolution, '480p');
  assert.equal(draftEst.providerCostUsd, 0.94);
  console.log('✓ Test 2 Passed: Separated App Markup & Draft 480p price lock verified');

  // 3. Strict Non-Downgrading Capability Validation
  const restrictedModel = JSON.parse(JSON.stringify(DEFAULT_MUAPI_MODELS[0]));
  restrictedModel.enabledResolutions = ['480p', '720p', '1080p'];
  const invalidCheck = validateCapabilitySelection(restrictedModel, '4K', 5);
  assert.equal(invalidCheck.valid, false);
  assert.ok(invalidCheck.error?.includes('4K'));
  const validCheck = validateCapabilitySelection(restrictedModel, '1080p', 30);
  assert.equal(validCheck.valid, true);
  console.log('✓ Test 3 Passed: Strict capability enforcement without silent downgrades');

  // 4. Strict 10-Key MUAPI Payload Builder
  const builtDraft = buildMuapiPayload({
    provider: 'muapi',
    model_id: MUAPI_SEEDANCE_25_SPICY_MODEL_ID,
    prompt: 'Volcanic obsidian glass runway dolly tracking shot',
    image_url: 'https://example.com/start.jpg',
    last_image: '',
    resolution: '4K', // Draft must force 480p
    duration: 5,
    generate_audio: true,
    camera_fixed: false,
    high_bitrate: false,
    draft: true,
    aspect_ratio: '16:9',
    physics_priority: true,
  } as any);
  assert.equal(builtDraft.valid, true);
  assert.ok(builtDraft.payload);
  assert.equal(builtDraft.payload!.resolution, '480p');
  assert.equal(builtDraft.payload!.draft, true);
  assert.equal('last_image' in builtDraft.payload!, false);
  assert.equal('draft_request_id' in builtDraft.payload!, false);
  assert.equal('aspect_ratio' in (builtDraft.payload as any), false);
  assert.equal('physics_priority' in (builtDraft.payload as any), false);

  const built4kFinal = buildMuapiPayload({
    provider: 'muapi',
    model_id: MUAPI_SEEDANCE_25_SPICY_MODEL_ID,
    prompt: '4K lava obsidian runway shot',
    image_url: 'https://example.com/start.jpg',
    resolution: '4K',
    duration: 10,
    draft: false,
  });
  assert.equal(built4kFinal.valid, true);
  assert.equal(built4kFinal.payload!.resolution, '4k');

  const builtBlockedLocal = buildMuapiPayload({
    provider: 'muapi',
    model_id: MUAPI_SEEDANCE_25_SPICY_MODEL_ID,
    prompt: 'Test SSRF guard',
    image_url: 'http://127.0.0.1:8080/internal.png',
    resolution: '720p',
    duration: 5,
  });
  assert.equal(builtBlockedLocal.valid, false);
  console.log('✓ Test 4 Passed: Strict 10-key MUAPI payload builder (4k wire + SSRF URL protection)');

  // 5. Draft -> Finalize Draft Orchestration
  const testDraftJobId = `test_draft_${Date.now()}`;
  const draftJob: UnifiedGenerationJob = {
    job_id: testDraftJobId,
    user_id: 'user_test_alpha',
    provider: 'muapi',
    model_id: MUAPI_SEEDANCE_25_SPICY_MODEL_ID,
    model_name: 'Seedance 2.5 Spicy',
    request_id: 'muapi_req_draft_987',
    parent_draft_job_id: null,
    prompt: 'Monochrome fashion editorial walk',
    image_url: 'https://example.com/frame1.png',
    last_image: 'https://example.com/frame2.png',
    resolution: '480p',
    duration: 10,
    generate_audio: true,
    camera_fixed: true,
    high_bitrate: false,
    draft: true,
    draft_request_id: null,
    estimated_cost: 1.87,
    provider_cost_usd: 1.87,
    markup_usd: 0,
    currency: 'USD',
    status: 'completed',
    progress: 100,
    provider_output_url: 'https://cdn.example.com/draft.mp4',
    firebase_storage_path: null,
    playback_url: 'https://cdn.example.com/draft.mp4',
    error: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
  };

  generationJobsStore.upsertJob(draftJob);
  try {
    assert.throws(
      () =>
        prepareFinalizeDraftInput({
          draftJobId: testDraftJobId,
          userId: 'other_user',
          isAdmin: false,
        }),
      /Access denied/
    );

    const prepared = prepareFinalizeDraftInput({
      draftJobId: testDraftJobId,
      userId: 'user_test_alpha',
      isAdmin: false,
    });
    assert.equal(prepared.input.draft, false);
    assert.equal(prepared.input.draft_request_id, 'muapi_req_draft_987');
    assert.equal(prepared.input.parent_draft_job_id, testDraftJobId);
    assert.equal(prepared.input.resolution, '1080p');
    assert.equal(prepared.input.duration, 10);
    assert.equal(prepared.input.image_url, 'https://example.com/frame1.png');
    assert.equal(prepared.input.last_image, 'https://example.com/frame2.png');
  } finally {
    generationJobsStore.deleteJob(testDraftJobId, 'user_test_alpha', true);
  }
  console.log('✓ Test 5 Passed: 2-stage Draft -> Finalize 1080p ownership & inheritance verified');

  // 6. Status Normalization, Output Extraction & Secret Redaction
  assert.equal(normalizeMuapiStatus('completed'), 'completed');
  assert.equal(normalizeMuapiStatus('in_progress'), 'processing');
  assert.equal(normalizeMuapiStatus('REJECTED'), 'failed');
  assert.equal(normalizeMuapiStatus('queued'), 'pending');

  const outputs = extractMuapiOutputs({
    status: 'completed',
    outputs: ['https://cdn.muapi.ai/video.mp4'],
  });
  assert.deepEqual(outputs, ['https://cdn.muapi.ai/video.mp4']);
  assert.equal(extractMuapiError({ error: { message: 'Safety check rejected' } }), 'Safety check rejected');

  const redacted = redactMuapiSecrets(
    'Failed header x-api-key: super_secret_test_key_123456 Bearer secret_tok',
    'super_secret_test_key_123456'
  );
  assert.equal(redacted.includes('super_secret_test_key_123456'), false);
  assert.equal(redacted.includes('secret_tok'), false);
  console.log('✓ Test 6 Passed: Status/output extraction & secret redaction verified');

  // 7. Express Router Contract (/api/providers, /api/generations/estimate, Auth Guards)
  const app = express();
  app.use(express.json());
  app.use('/api', createMultiProviderRouter());

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address() as { port: number };
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    const provRes = await fetch(`${baseUrl}/api/providers`);
    assert.equal(provRes.status, 200);
    const provData = (await provRes.json()) as any;
    assert.equal(provData.ok, true);
    assert.ok(Array.isArray(provData.providers));
    const provJsonText = JSON.stringify(provData);
    assert.equal(provJsonText.includes('MUAPIAPP_API_KEY'), false);
    const hasMuapi = provData.providers.find((p: any) => p.providerId === 'muapi');
    const hasBytedance = provData.providers.find((p: any) => p.providerId === 'bytedance');
    assert.ok(hasMuapi && hasBytedance);
    assert.equal(hasMuapi.pollIntervalMs, 3000);

    const estRes = await fetch(`${baseUrl}/api/generations/estimate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: 'muapi',
        model_id: MUAPI_SEEDANCE_25_SPICY_MODEL_ID,
        resolution: '4K',
        duration: 30,
        draft: false,
      }),
    });
    assert.equal(estRes.status, 200);
    const estData = (await estRes.json()) as any;
    assert.equal(estData.estimate.finalPriceUsd, 56.1);

    const unauthSubmit = await fetch(`${baseUrl}/api/generations/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'Unauth test' }),
    });
    assert.equal(unauthSubmit.status, 401);

    const unauthAdmin = await fetch(`${baseUrl}/api/admin/providers`);
    assert.equal(unauthAdmin.status, 401);

    const unauthSse = await fetch(`${baseUrl}/api/generations/events`);
    assert.equal(unauthSse.status, 401);

    const unauthConnTest = await fetch(`${baseUrl}/api/providers/connection-test/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target: 'all', mode: 'simulate_pipeline' }),
    });
    assert.equal(unauthConnTest.status, 401);

    // Webhook signature rejection (403) + valid signed webhook trace recording
    const testWebhookJobId = `test_wh_${Date.now()}`;
    generationJobsStore.upsertJob({
      job_id: testWebhookJobId,
      user_id: 'user_webhook_test',
      provider: 'muapi',
      model_id: MUAPI_SEEDANCE_25_SPICY_MODEL_ID,
      model_name: 'Seedance 2.5 Spicy',
      request_id: 'muapi_req_wh_1',
      parent_draft_job_id: null,
      prompt: 'Webhook test',
      image_url: null,
      last_image: null,
      resolution: '720p',
      duration: 5,
      generate_audio: true,
      camera_fixed: false,
      high_bitrate: false,
      draft: false,
      draft_request_id: null,
      estimated_cost: 1.87,
      currency: 'USD',
      status: 'processing',
      progress: 25,
      provider_output_url: null,
      firebase_storage_path: null,
      playback_url: null,
      error: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      completed_at: null,
    });
    try {
      const badWhRes = await fetch(
        `${baseUrl}/api/webhooks/muapi/${testWebhookJobId}?token=invalid_sig`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'processing' }),
        }
      );
      assert.equal(badWhRes.status, 403);

      const signedToken = signMuapiWebhookToken(testWebhookJobId);
      assert.equal(verifyMuapiWebhookToken(testWebhookJobId, signedToken), true);
      const signedPublicWh = buildSignedMuapiWebhookUrl(
        'https://ais-dev-mwimdbvagpgdqljyqxrbuw-513296942322.asia-northeast1.run.app',
        testWebhookJobId
      );
      assert.ok(signedPublicWh?.includes(`/api/webhooks/muapi/${testWebhookJobId}?token=`));
      assert.equal(buildSignedMuapiWebhookUrl('http://localhost:3000', testWebhookJobId), undefined);

      const goodWhRes = await fetch(
        `${baseUrl}/api/webhooks/muapi/${testWebhookJobId}?token=${signedToken}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: 'muapi_req_wh_1',
            status: 'processing',
          }),
        }
      );
      assert.equal(goodWhRes.status, 200);
      const updatedJob = generationJobsStore.getJob(testWebhookJobId);
      assert.ok(updatedJob?.backend_traces?.some((t) => t.stage === 'WEBHOOK'));
    } finally {
      generationJobsStore.deleteJob(testWebhookJobId, 'user_webhook_test', true);
    }

    // MUAPI_API_KEY env fallback check (when MUAPIAPP_API_KEY absent)
    const prevAppKey = process.env.MUAPIAPP_API_KEY;
    const prevKey = process.env.MUAPI_API_KEY;
    try {
      delete process.env.MUAPIAPP_API_KEY;
      process.env.MUAPI_API_KEY = 'muapi_test_fallback_key_999';
      assert.equal(providerConfigStore.getProviderLiveApiKey('muapi'), 'muapi_test_fallback_key_999');
    } finally {
      if (prevAppKey === undefined) delete process.env.MUAPIAPP_API_KEY;
      else process.env.MUAPIAPP_API_KEY = prevAppKey;
      if (prevKey === undefined) delete process.env.MUAPI_API_KEY;
      else process.env.MUAPI_API_KEY = prevKey;
    }
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
  console.log('✓ Test 7 Passed: Live Express routes, HMAC webhook push, SSE auth & MUAPI_API_KEY fallback verified');

  // 8. Real-Time Connection Test & Dry-Run Pipeline Simulator
  const capturedEvents: string[] = [];
  const simResult = await runRealtimeBackendConnectionTest(
    {
      target: 'all',
      mode: 'simulate_pipeline',
      publicOrigin: 'https://ais-dev-mwimdbvagpgdqljyqxrbuw-513296942322.asia-northeast1.run.app',
      resolution: '4K',
      duration: 10,
      draft: false,
    },
    (evt) => {
      capturedEvents.push(evt.type);
    }
  );
  assert.ok(capturedEvents.includes('start'));
  assert.ok(capturedEvents.includes('step'));
  assert.ok(capturedEvents.includes('provider_summary'));
  assert.ok(capturedEvents.includes('complete'));
  assert.equal(simResult.summaries.length, 2);
  const muapiPayloadStep = simResult.steps.find(
    (s) => s.provider === 'muapi' && s.phase === 'PAYLOAD_BUILD'
  );
  assert.ok(muapiPayloadStep);
  assert.equal((muapiPayloadStep!.requestPreview as any)?.resolution, '4k');
  assert.equal(muapiPayloadStep!.simulated, true);
  assert.equal(
    JSON.stringify(simResult).includes('MUAPIAPP_API_KEY_SECRET_LEAK'),
    false
  );
  console.log('✓ Test 8 Passed: Real-time connection diagnostics & dry-run 4K simulation verified');

  // 9. API key header prefix sanitization & Sandbox Mode vault switching (non-destructive)
  const prevEnvSandbox = process.env.MUAPI_SANDBOX_API_KEY;
  try {
    process.env.MUAPI_SANDBOX_API_KEY = '  "x-api-key: sandbox_sanitized_key_abc123"  ';
    assert.equal(
      providerConfigStore.getProviderSandboxApiKey('muapi'),
      'sandbox_sanitized_key_abc123'
    );
  } finally {
    if (prevEnvSandbox === undefined) delete process.env.MUAPI_SANDBOX_API_KEY;
    else process.env.MUAPI_SANDBOX_API_KEY = prevEnvSandbox;
  }
  console.log('✓ Test 9 Passed: API key quote/header sanitization & sandbox key resolution verified');
  console.log('\nALL MULTI-PROVIDER TESTS PASSED.');
}

runTests().catch((err) => {
  console.error('❌ Multi-provider test failure:', err);
  process.exit(1);
});
