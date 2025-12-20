import { createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import worker from '../../src/index';
import { createValidHeaders, createTestEnv, initializeDatabase, clearAndReloadTestData } from '../helpers/setup';

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe('POST /staff/new - NewStaff', () => {
  const validHeaders = createValidHeaders(undefined, '10203040');
  const localEnv = createTestEnv();

  beforeAll(async () => {
    await initializeDatabase(localEnv.DB);
  });

  beforeEach(async () => {
    await clearAndReloadTestData(localEnv.DB);
  });

  it('should return 405 for non-POST methods', async () => {
    const request = new IncomingRequest('http://example.com/staff/new', {
      method: 'GET',
      headers: validHeaders,
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(405);
    const body = await response.json() as any;
    expect(body).toEqual({ success: false, error: 'Method GET not allowed for /staff/new' });
  });

  it('should return 400 when missing required fields', async () => {
    const request = new IncomingRequest('http://example.com/staff/new', {
      method: 'POST',
      headers: validHeaders,
      body: JSON.stringify({}),
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(400);
    const body = await response.json() as any;
    expect(body).toEqual({ success: false, error: 'Missing required fields: discord_id' });
  });

  it('should create new staff member successfully', async () => {
    const request = new IncomingRequest('http://example.com/staff/new', {
      method: 'POST',
      headers: validHeaders,
      body: JSON.stringify({
        discord_id: '10987654321',
        discord_name: 'NewStaff',
      }),
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(201);
    const body = await response.json() as any;
    expect(body).toHaveProperty('success');
  });

  it('should return 403 for non-admin users', async () => {
    const nonAdminHeaders = {
      ...validHeaders,
      'X-Discord-ID': 'regular_user',
    };
    const request = new IncomingRequest('http://example.com/staff/new', {
      method: 'POST',
      headers: nonAdminHeaders,
      body: JSON.stringify({
        discord_id: '987654321',
        discord_name: 'NewStaff',
      }),
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(403);
  });
});
