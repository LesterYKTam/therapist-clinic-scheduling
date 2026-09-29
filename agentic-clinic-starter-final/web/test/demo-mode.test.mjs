import test from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server.js';
import { isDemoMode, demoModeStatus, DEMO_MODE_PRODUCTION_MESSAGE } from '../lib/demo-mode.mjs';
import { GET, POST } from '../app/api/clinic/route.ts';
import { GET as GET_PDF } from '../app/api/clinic/report/route.ts';

test('demo mode helper: only the flag outside production enables it, production plus flag fails closed', () => {
  assert.equal(isDemoMode({ CLINIC_DEMO_MODE: '1', NODE_ENV: 'development' }), true);
  assert.equal(isDemoMode({ CLINIC_DEMO_MODE: '1', NODE_ENV: 'test' }), true);
  assert.equal(isDemoMode({ CLINIC_DEMO_MODE: '1' }), true);
  assert.equal(isDemoMode({ NODE_ENV: 'production' }), false);
  assert.equal(isDemoMode({ CLINIC_DEMO_MODE: '0', NODE_ENV: 'production' }), false);
  assert.equal(isDemoMode({}), false);
  assert.equal(demoModeStatus({ CLINIC_DEMO_MODE: '1', NODE_ENV: 'production' }), 'forbidden');
  assert.throws(() => isDemoMode({ CLINIC_DEMO_MODE: '1', NODE_ENV: 'production' }), /not allowed in a production build/);
});

test('routes refuse with 503 and no clinic data when demo mode is set in a production build', async () => {
  const previous = { mode: process.env.CLINIC_DEMO_MODE, env: process.env.NODE_ENV };
  process.env.CLINIC_DEMO_MODE = '1';
  process.env.NODE_ENV = 'production';
  try {
    const get = await GET(new NextRequest('http://localhost:3000/api/clinic'));
    assert.equal(get.status, 503);
    assert.deepEqual(await get.json(), { error: DEMO_MODE_PRODUCTION_MESSAGE });
    const post = await POST(new NextRequest('http://localhost:3000/api/clinic', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'begin-draft', pod: 'a', revision: 0 }) }));
    assert.equal(post.status, 503);
    assert.deepEqual(await post.json(), { error: DEMO_MODE_PRODUCTION_MESSAGE });
    const pdf = await GET_PDF(new NextRequest('http://localhost:3000/api/clinic/report?staff=a-t1&month=2026-09'));
    assert.equal(pdf.status, 503);
    assert.deepEqual(await pdf.json(), { error: DEMO_MODE_PRODUCTION_MESSAGE });
  } finally {
    if (previous.mode === undefined) delete process.env.CLINIC_DEMO_MODE; else process.env.CLINIC_DEMO_MODE = previous.mode;
    if (previous.env === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previous.env;
  }
});
