import { createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import worker from '../../src/index';
import { initializeDatabase, clearAndReloadTestData, createTestEnv, createValidHeaders } from '../helpers/setup';

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe('GET /profile/list - ListProfiles', () => {
  const validHeaders = createValidHeaders();
  const localEnv = createTestEnv();

  beforeAll(async () => {
    await initializeDatabase(localEnv.DB);
  });

  beforeEach(async () => {
    await clearAndReloadTestData(localEnv.DB);
  });

  it('should return 405 for non-GET methods', async () => {
    const request = new IncomingRequest('http://example.com/profile/list', {
      method: 'POST',
      headers: validHeaders,
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(405);
    const body = await response.json() as any;
    expect(body).toEqual({ success: false, error: 'Method POST not allowed for /profile/list' });
  });

  it('should list all profiles', async () => {
    const request = new IncomingRequest('http://example.com/profile/list', {
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

  it('should list profiles with limit parameter', async () => {
    const request = new IncomingRequest('http://example.com/profile/list?limit=5', {
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

  it('should return 400 for invalid limit parameter', async () => {
    const request = new IncomingRequest('http://example.com/profile/list?limit=invalid', {
      method: 'GET',
      headers: validHeaders,
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(400);
  });

  it('should list profiles with date filters', async () => {
    const today = new Date();
    const startDateToday = today.toISOString().split('T')[0];
    const endDateToday = today.toISOString().split('T')[0];
    const request = new IncomingRequest(`http://example.com/profile/list?startDate=${startDateToday}&endDate=${endDateToday}`, {
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

  it('should return 403 for non-staff users', async () => {
    const nonStaffHeaders = {
      Authorization: 'Bearer test-api-key',
      'X-Discord-ID': '111111111',
      'X-Discord-Name': 'RegularUser',
      'Content-Type': 'application/json',
    };
    const request = new IncomingRequest('http://example.com/profile/list', {
      method: 'GET',
      headers: nonStaffHeaders,
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(403);
    const body = await response.json() as any;
    expect(body).toEqual({ success: false, error: 'Forbidden: Staff privileges required' });
  });


});
