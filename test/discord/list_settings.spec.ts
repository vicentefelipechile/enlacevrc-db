import { createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import worker from '../../src/index';
import { initializeDatabase, clearAndReloadTestData, createTestEnv, createValidHeaders } from '../helpers/setup';

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe('GET /discord/{SERVER_ID}/list-settings - ListSettings', () => {
  const validHeaders = createValidHeaders();
  const localEnv = createTestEnv();

  beforeAll(async () => {
    await initializeDatabase(localEnv.DB);
  });

  beforeEach(async () => {
    await clearAndReloadTestData(localEnv.DB);
  });

  it('should return 405 for non-GET methods', async () => {
    const request = new IncomingRequest('http://example.com/discord/1234567890/list-settings', {
      method: 'POST',
      headers: validHeaders,
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(405);
    const body = await response.json() as any;
    expect(body).toEqual({ success: false, error: 'Method POST not allowed for /discord/1234567890/list-settings' });
  });

  it('should list all settings for a specific server', async () => {
    const request = new IncomingRequest('http://example.com/discord/1234567890/list-settings', {
      method: 'GET',
      headers: validHeaders,
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(200);
    const body = await response.json() as any;
    expect(body).toHaveProperty('success');
    if (body.success) {
      expect(body).toHaveProperty('data');
      expect(Array.isArray(body.data)).toBe(true);
    }
  });

  it('should list settings with limit parameter', async () => {
    const request = new IncomingRequest('http://example.com/discord/1234567890/list-settings?limit=5', {
      method: 'GET',
      headers: validHeaders,
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(200);
    const body = await response.json() as any;
    expect(body).toHaveProperty('success');
  });

  it('should list settings with date filters', async () => {
    const request = new IncomingRequest('http://example.com/discord/1234567890/list-settings?start_date=2024-01-01&end_date=2024-12-31', {
      method: 'GET',
      headers: validHeaders,
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(200);
    const body = await response.json() as any;
    expect(body).toHaveProperty('success');
  });
});