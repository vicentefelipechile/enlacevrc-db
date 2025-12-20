import { createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import worker from '../src/index';
import { createValidHeaders, createTestEnv, initializeDatabase, clearAndReloadTestData } from './helpers/setup';

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe('Router and Authentication', () => {
  const validHeaders = createValidHeaders();
  const localEnv = createTestEnv();

  beforeAll(async () => {
    await initializeDatabase(localEnv.DB);
  });

  beforeEach(async () => {
    await clearAndReloadTestData(localEnv.DB);
  });

  it('should return 401 Unauthorized if Authorization header is missing', async () => {
    const request = new IncomingRequest('http://example.com/profiles');
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);
    const responseBody = await response.json() as any;
    expect(response.status).toBe(401);
    expect(responseBody).toEqual({ success: false, error: 'Unauthorized' });
  });

  it('should return 401 Unauthorized if Authorization header is incorrect', async () => {
    const request = new IncomingRequest('http://example.com/profiles', {
      headers: { ...validHeaders, Authorization: 'Bearer incorrect-key' },
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);
    const responseBody = await response.json() as any;
    expect(response.status).toBe(401);
    expect(responseBody).toEqual({ success: false, error: 'Unauthorized' });
  });

  it('should return 400 if X-Discord-ID header is missing', async () => {
    const customHeaders = createValidHeaders();
    // @ts-ignore
    delete customHeaders['X-Discord-ID'];

    const request = new IncomingRequest('http://example.com/profiles/test-id', {
      headers: customHeaders,
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);
    const responseBody = await response.json() as any;
    expect(response.status).toBe(400);
    expect(responseBody).toEqual({ success: false, error: 'X-Discord-ID header is required' });
  });

  it('should return 404 Not Found for routes not starting with /profile, /discord, or /staff', async () => {
    const request = new IncomingRequest('http://example.com/not-valid-route', {
      headers: validHeaders,
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);
    const responseBody = await response.json() as any;
    expect(response.status).toBe(404);
    expect(responseBody).toEqual({ success: false, error: 'Not Found' });
  });

  // Profile Route Tests
  it('should return 400 for missing action on /profile without profileId', async () => {
    const request = new IncomingRequest('http://example.com/profile', {
      headers: validHeaders,
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);
    const body = await response.json() as any;
    expect(response.status).toBe(400);
    expect(body).toEqual({ success: false, error: 'Invalid profile endpoint' });
  });

  it('should return 404 for unknown action on /profile', async () => {
    const request = new IncomingRequest('http://example.com/profile/some-id/unknown-action', {
      method: 'GET',
      headers: validHeaders,
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);
    const responseBody = await response.json() as any;
    expect(response.status).toBe(404);
    expect(responseBody).toEqual({ success: false, error: 'Unknown action' });
  });

  it('should return 405 for wrong method on /profile/{id}/get', async () => {
    const request = new IncomingRequest('http://example.com/profile/usr_test/get', {
      method: 'POST',
      headers: validHeaders,
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);
    const responseBody = await response.json() as any;
    expect(response.status).toBe(405);
    expect(responseBody).toEqual({ success: false, error: 'Method POST not allowed for /profile/usr_test/get' });
  });

  // Discord Settings Route Tests
  it('should return 400 for missing server ID on /discord without action', async () => {
    const request = new IncomingRequest('http://example.com/discord', {
      method: 'GET',
      headers: validHeaders,
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);
    const responseBody = await response.json() as any;
    expect(response.status).toBe(400);
    expect(responseBody).toEqual({ success: false, error: 'Invalid discord endpoint' });
  });

  it('should return 404 for unknown action on /discord', async () => {
    const request = new IncomingRequest('http://example.com/discord/123456789/unknown-action', {
      method: 'GET',
      headers: validHeaders,
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);
    const responseBody = await response.json() as any;
    expect(response.status).toBe(404);
    expect(responseBody).toEqual({ success: false, error: 'Unknown action' });
  });

  it('should return 405 for wrong method on /discord/{id}/exists-server', async () => {
    const request = new IncomingRequest('http://example.com/discord/123456789/exists-server', {
      method: 'POST',
      headers: validHeaders,
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);
    const responseBody = await response.json() as any;
    expect(response.status).toBe(405);
    expect(responseBody).toEqual({ success: false, error: 'Method POST not allowed for /discord/123456789/exists-server' });
  });

  // Staff Route Tests
  it('should return 400 for missing staff ID on /staff without action', async () => {
    const request = new IncomingRequest('http://example.com/staff', {
      method: 'GET',
      headers: validHeaders,
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);
    const responseBody = await response.json() as any;
    expect(response.status).toBe(400);
    expect(responseBody).toEqual({ success: false, error: 'Invalid staff endpoint' });
  });

  it('should return 404 for unknown action on /staff', async () => {
    const request = new IncomingRequest('http://example.com/staff/987654321/unknown-action', {
      method: 'GET',
      headers: validHeaders,
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);
    const responseBody = await response.json() as any;
    expect(response.status).toBe(404);
    expect(responseBody).toEqual({ success: false, error: 'Unknown action: unknown-action. Valid actions are: get, update_name, delete. Use /staff/new or /staff/list for other operations' });
  });

  it('should return 405 for wrong method on /staff/{id}/update_name', async () => {
    const request = new IncomingRequest('http://example.com/staff/987654321/update_name', {
      method: 'POST',
      headers: validHeaders,
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);
    const responseBody = await response.json() as any;
    expect(response.status).toBe(405);
    expect(responseBody).toEqual({ success: false, error: 'Method POST not allowed for /staff/987654321/update_name' });
  });

  // Logs Route Tests
  it('should allow GET requests to /logs (admin only)', async () => {
    const adminHeaders = { ...validHeaders, 'X-Discord-ID': '10203040' };
    const request = new IncomingRequest('http://example.com/logs', {
      method: 'GET',
      headers: adminHeaders,
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(200);
    const responseBody = await response.json() as any;
    expect(responseBody).toHaveProperty('success');
  });

  it('should return 405 for POST requests to /logs', async () => {
    const request = new IncomingRequest('http://example.com/logs', {
      method: 'POST',
      headers: validHeaders,
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);
    const responseBody = await response.json() as any;
    expect(response.status).toBe(405);
    expect(responseBody).toEqual({ success: false, error: 'Method POST not allowed' });
  });

  it('should return 405 for PUT requests to /logs', async () => {
    const request = new IncomingRequest('http://example.com/logs', {
      method: 'PUT',
      headers: validHeaders,
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);
    const responseBody = await response.json() as any;
    expect(response.status).toBe(405);
    expect(responseBody).toEqual({ success: false, error: 'Method PUT not allowed' });
  });

  it('should return 405 for DELETE requests to /logs', async () => {
    const request = new IncomingRequest('http://example.com/logs', {
      method: 'DELETE',
      headers: validHeaders,
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);
    const responseBody = await response.json() as any;
    expect(response.status).toBe(405);
    expect(responseBody).toEqual({ success: false, error: 'Method DELETE not allowed' });
  });

  // Auth Validate Admin Route Tests (Public Endpoint)
  it('should allow GET requests to /auth/validate-admin without Authorization Bearer token', async () => {
    const request = new IncomingRequest('http://example.com/auth/validate-admin', {
      method: 'GET',
      headers: validHeaders,
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);

    // Should not require Authorization Bearer header, only X-Api-Key
    expect(response.status).toBe(200);
  });

  it('should return 405 for POST requests to /auth/validate-admin', async () => {
    const request = new IncomingRequest('http://example.com/auth/validate-admin', {
      method: 'POST',
      headers: {
        'X-Discord-ID': '12345'
      },
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);
    const responseBody = await response.json() as any;
    expect(response.status).toBe(405);
    expect(responseBody).toEqual({ success: false, error: 'Method POST not allowed' });
  });

  it('should handle CORS preflight OPTIONS requests', async () => {
    const request = new IncomingRequest('http://example.com/profiles', {
      method: 'OPTIONS',
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(204);

    const accessControlAllowMethods = response.headers.get('Access-Control-Allow-Methods');

    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(accessControlAllowMethods).toContain('GET');
    expect(accessControlAllowMethods).toContain('POST');
    expect(accessControlAllowMethods).toContain('PUT');
    expect(accessControlAllowMethods).toContain('DELETE');
    expect(accessControlAllowMethods).toContain('OPTIONS');
  });

  it('should add CORS headers to all responses', async () => {
    const request = new IncomingRequest('http://example.com/profiles', {
      method: 'GET',
      headers: validHeaders,
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);

    const accessControlAllowHeaders = response.headers.get('Access-Control-Allow-Headers');

    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET');
    expect(accessControlAllowHeaders).toContain('Content-Type');
    expect(accessControlAllowHeaders).toContain('Authorization');
  });
});
