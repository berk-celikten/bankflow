import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const base = process.env.BANKFLOW_BASE_URL || 'http://127.0.0.1:8080';
if (!['localhost', '127.0.0.1', '::1'].includes(new URL(base).hostname)) {
  throw new Error('This stateful demo check only runs against localhost.');
}
const password = process.env.BANKFLOW_DEMO_PASSWORD;
if (!password) throw new Error('BANKFLOW_DEMO_PASSWORD must be set from your local .env.');

class Session {
  cookies = new Map();
  csrf;
  async request(path, { method = 'GET', body, key, form, noCsrf = false } = {}) {
    const headers = new Headers();
    if (this.cookies.size) headers.set('Cookie', [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; '));
    if (method !== 'GET' && this.csrf && !noCsrf) headers.set(this.csrf.headerName, this.csrf.token);
    if (key) headers.set('Idempotency-Key', key);
    let payload;
    if (form) {
      headers.set('Content-Type', 'application/x-www-form-urlencoded');
      payload = new URLSearchParams(form);
    } else if (body !== undefined) {
      headers.set('Content-Type', 'application/json');
      payload = JSON.stringify(body);
    }
    const response = await fetch(base + path, { method, headers, body: payload, redirect: 'manual', signal: AbortSignal.timeout(20000) });
    for (const cookie of response.headers.getSetCookie()) {
      const [pair] = cookie.split(';');
      const separator = pair.indexOf('=');
      this.cookies.set(pair.slice(0, separator), pair.slice(separator + 1));
    }
    const raw = await response.text();
    let data;
    try { data = raw ? JSON.parse(raw) : undefined; } catch { data = raw; }
    return { status: response.status, data };
  }
  async refresh() {
    const result = await this.request('/api/auth/csrf');
    assert.equal(result.status, 200, 'CSRF endpoint');
    this.csrf = result.data;
  }
  async login(username) {
    await this.refresh();
    const response = await this.request('/api/auth/login', { method: 'POST', form: { username, password } });
    assert.equal(response.status, 200, `Login for ${username}`);
    await this.refresh();
    this.user = response.data;
    return this;
  }
  async accounts() {
    const response = await this.request('/api/accounts');
    assert.equal(response.status, 200);
    return response.data;
  }
}
function cents(value) {
  assert.match(value, /^\d+\.\d{2}$/);
  return BigInt(value.replace('.', ''));
}
function ok(result, description) {
  assert.ok(result.status >= 200 && result.status < 300, `${description}: HTTP ${result.status}, ${result.data?.code || ''}`);
  return result.data;
}
let passed = 0;
async function check(label, fn) {
  await fn();
  passed++;
  console.log(`PASS ${label}`);
}

const guest = new Session();
await check('Unauthenticated account access is rejected', async () => {
  assert.equal((await guest.request('/api/accounts')).status, 401);
});
const ayse = await new Session().login('ayse');
const mehmet = await new Session().login('mehmet');
const operator = await new Session().login('operator');
const supervisor = await new Session().login('supervisor');
let source = (await ayse.accounts())[0];
const recipient = (await mehmet.accounts())[0];

await check('Customer data isolation', async () => {
  const result = await ayse.request(`/api/accounts/${recipient.id}/transactions`);
  assert.ok([403, 404].includes(result.status));
});
const transferBody = () => ({ sourceAccountId: source.id, targetAccountNumber: recipient.accountNumber, amount: '12.34', description: 'Local end-to-end verification' });
await check('CSRF protection rejects an unauthenticated mutation token', async () => {
  const result = await ayse.request('/api/transfers', { method: 'POST', body: transferBody(), key: randomUUID(), noCsrf: true });
  assert.equal(result.status, 403);
});
await check('Transfer is exact and duplicate request does not spend twice', async () => {
  const beforeSource = cents((await ayse.accounts()).find(a => a.id === source.id).balance);
  const beforeRecipient = cents((await mehmet.accounts()).find(a => a.id === recipient.id).balance);
  const key = randomUUID();
  const body = transferBody();
  const first = ok(await ayse.request('/api/transfers', { method: 'POST', body, key }), 'Create transfer');
  assert.equal(first.status, 'COMPLETED');
  const duplicate = ok(await ayse.request('/api/transfers', { method: 'POST', body, key }), 'Repeat transfer');
  assert.equal(duplicate.id, first.id);
  assert.equal(cents((await ayse.accounts()).find(a => a.id === source.id).balance), beforeSource - 1234n);
  assert.equal(cents((await mehmet.accounts()).find(a => a.id === recipient.id).balance), beforeRecipient + 1234n);
  const mismatch = await ayse.request('/api/transfers', { method: 'POST', body: { ...body, amount: '12.35' }, key });
  assert.equal(mismatch.status, 409);
});
await check('Invalid monetary precision is rejected', async () => {
  const result = await ayse.request('/api/transfers', { method: 'POST', body: { ...transferBody(), amount: '1.001' }, key: randomUUID() });
  assert.equal(result.status, 422);
});
await check('Concurrent retries create only one transfer', async () => {
  const key = randomUUID();
  const body = { ...transferBody(), amount: '2.00' };
  const before = cents((await ayse.accounts()).find(a => a.id === source.id).balance);
  const responses = await Promise.all(Array.from({ length: 4 }, () => ayse.request('/api/transfers', { method: 'POST', body, key })));
  const ids = responses.map(response => ok(response, 'Concurrent retry').id);
  assert.equal(new Set(ids).size, 1);
  assert.equal(cents((await ayse.accounts()).find(a => a.id === source.id).balance), before - 200n);
});
await check('Independent approval and repeated-decision protection', async () => {
  const account = (await operator.accounts())[0];
  const before = cents(account.balance);
  const pending = ok(await operator.request('/api/transfers', { method: 'POST', key: randomUUID(), body: { sourceAccountId: account.id, targetAccountNumber: recipient.accountNumber, amount: '10000.00', description: 'Approval verification' } }), 'Create pending transfer');
  assert.equal(pending.status, 'PENDING_APPROVAL');
  assert.equal(cents((await operator.accounts())[0].balance), before);
  assert.equal((await operator.request(`/api/operations/transfers/${pending.id}/approve`, { method: 'POST', body: {} })).status, 403);
  const approved = ok(await supervisor.request(`/api/operations/transfers/${pending.id}/approve`, { method: 'POST', body: {} }), 'Independent approval');
  assert.equal(approved.status, 'COMPLETED');
  assert.equal(cents((await operator.accounts())[0].balance), before - 1000000n);
  assert.equal((await supervisor.request(`/api/operations/transfers/${pending.id}/approve`, { method: 'POST', body: {} })).status, 409);
});
await check('Rejection preserves balance and is audited', async () => {
  source = (await ayse.accounts())[0];
  const before = cents(source.balance);
  const pending = ok(await ayse.request('/api/transfers', { method: 'POST', key: randomUUID(), body: { ...transferBody(), amount: '10000.00' } }), 'Create rejected transfer');
  const rejected = ok(await supervisor.request(`/api/operations/transfers/${pending.id}/reject`, { method: 'POST', body: { reason: 'Local verification rejection' } }), 'Reject transfer');
  assert.equal(rejected.status, 'REJECTED');
  assert.equal(cents((await ayse.accounts()).find(a => a.id === source.id).balance), before);
  const events = ok(await supervisor.request('/api/operations/audit'), 'Audit list');
  assert.ok(events.some(event => event.reference === pending.reference));
});
await check('Logout invalidates the session', async () => {
  assert.equal((await ayse.request('/api/auth/logout', { method: 'POST' })).status, 204);
  assert.equal((await ayse.request('/api/auth/me')).status, 401);
});
console.log(`${passed} live API checks passed. Data changes apply only to the local synthetic demo.`);
