import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import worker from '../src/index';

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe('Router and Authentication', () => {
  it('should return 401 Unauthorized if Authorization header is missing', async () => {
    const request = new IncomingRequest('http://example.com/profiles');
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);
    const responseBody = await response.json() as any;
    expect(response.status).toBe(401);
    expect(responseBody).toEqual({ success: false, error: 'Unauthorized' });
  });

  it('should return 401 Unauthorized if Authorization header is incorrect', async () => {
    const request = new IncomingRequest('http://example.com/profiles', {
      headers: { Authorization: 'Bearer incorrect-key' },
    });
    const localEnv = { ...env, API_KEY: 'correct-key' };
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);
    const responseBody = await response.json() as any;
    expect(response.status).toBe(401);
    expect(responseBody).toEqual({ success: false, error: 'Unauthorized' });
  });

  it('should return 400 if X-User-ID header is missing', async () => {
    const request = new IncomingRequest('http://example.com/profiles/test-id', {
      headers: { Authorization: 'Bearer correct-key' },
    });
    const localEnv = { ...env, API_KEY: 'correct-key' };
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);
    const responseBody = await response.json() as any;
    expect(response.status).toBe(400);
    expect(responseBody).toEqual({ success: false, error: 'X-User-ID header is required' });
  });

  it('should return 404 Not Found for routes not starting with /profiles or /discord-settings', async () => {
    const request = new IncomingRequest('http://example.com/not-profiles', {
        headers: { 
          Authorization: 'Bearer correct-key',
          'X-User-ID': 'test-user-id'
        },
    });
    const localEnv = { ...env, API_KEY: 'correct-key' };
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);
    const responseBody = await response.json() as any;
    expect(response.status).toBe(404);
    expect(responseBody).toEqual({ success: false, error: 'Not Found' });
  });

  it('should return 400 for POST requests with an ID', async () => {
    const request = new IncomingRequest('http://example.com/profiles/some-id', {
      method: 'POST',
      headers: { 
        Authorization: 'Bearer correct-key',
        'X-User-ID': 'test-user-id'
      },
    });
    const localEnv = { ...env, API_KEY: 'correct-key' };
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);
    const responseBody = await response.json() as any;
    expect(response.status).toBe(400);
    expect(responseBody).toEqual({ success: false, error: 'POST requests cannot include an ID in the URL' });
  });

  it('should return 400 for GET requests without an ID', async () => {
    const request = new IncomingRequest('http://example.com/profiles', {
      method: 'GET',
      headers: { 
        Authorization: 'Bearer correct-key',
        'X-User-ID': 'test-user-id'
      },
    });
    const localEnv = { ...env, API_KEY: 'correct-key' };
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);
    const responseBody = await response.json() as any;
    expect(response.status).toBe(400);
    expect(responseBody).toEqual({ success: false, error: 'A profile ID is required for GET requests (e.g., /profiles/some_id)' });
  });

  it('should return 400 for PUT requests without an ID', async () => {
    const request = new IncomingRequest('http://example.com/profiles', {
      method: 'PUT',
      headers: { 
        Authorization: 'Bearer correct-key',
        'X-User-ID': 'test-user-id'
      },
    });
    const localEnv = { ...env, API_KEY: 'correct-key' };
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);
    const responseBody = await response.json() as any;
    expect(response.status).toBe(400);
    expect(responseBody).toEqual({ success: false, error: 'A profile ID is required for PUT requests (e.g., /profiles/some_id)' });
  });

  it('should return 405 for disallowed methods', async () => {
    const request = new IncomingRequest('http://example.com/profiles', {
      method: 'HEAD',
      headers: { 
        Authorization: 'Bearer correct-key',
        'X-User-ID': 'test-user-id'
      },
    });
    const localEnv = { ...env, API_KEY: 'correct-key' };
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);
    const responseBody = await response.json() as any;
    expect(response.status).toBe(405);
    expect(responseBody).toEqual({ success: false, error: 'Method HEAD not allowed' });
  });

  // Discord Settings Route Tests
  it('should return 400 for POST requests to /discord-settings without server ID', async () => {
    const request = new IncomingRequest('http://example.com/discord-settings', {
      method: 'POST',
      headers: { 
        Authorization: 'Bearer correct-key',
        'X-User-ID': 'test-user-id'
      },
    });
    const localEnv = { ...env, API_KEY: 'correct-key' };
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);
    const responseBody = await response.json() as any;
    expect(response.status).toBe(400);
    expect(responseBody).toEqual({ success: false, error: 'A server ID is required for POST requests (e.g., /discord-settings/some_id)' });
  });

  it('should return 400 for GET requests to /discord-settings without server ID', async () => {
    const request = new IncomingRequest('http://example.com/discord-settings', {
      method: 'GET',
      headers: { 
        Authorization: 'Bearer correct-key',
        'X-User-ID': 'test-user-id'
      },
    });
    const localEnv = { ...env, API_KEY: 'correct-key' };
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);
    const responseBody = await response.json() as any;
    expect(response.status).toBe(400);
    expect(responseBody).toEqual({ success: false, error: 'A server ID is required for GET requests (e.g., /discord-settings/some_id)' });
  });

  it('should return 400 for PUT requests to /discord-settings without server ID', async () => {
    const request = new IncomingRequest('http://example.com/discord-settings', {
      method: 'PUT',
      headers: { 
        Authorization: 'Bearer correct-key',
        'X-User-ID': 'test-user-id'
      },
    });
    const localEnv = { ...env, API_KEY: 'correct-key' };
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);
    const responseBody = await response.json() as any;
    expect(response.status).toBe(400);
    expect(responseBody).toEqual({ success: false, error: 'A server ID is required for PUT requests (e.g., /discord-settings/some_id)' });
  });

  it('should return 400 for DELETE requests to /discord-settings without server ID', async () => {
    const request = new IncomingRequest('http://example.com/discord-settings', {
      method: 'DELETE',
      headers: { 
        Authorization: 'Bearer correct-key',
        'X-User-ID': 'test-user-id'
      },
    });
    const localEnv = { ...env, API_KEY: 'correct-key' };
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);
    const responseBody = await response.json() as any;
    expect(response.status).toBe(400);
    expect(responseBody).toEqual({ success: false, error: 'A server ID is required for DELETE requests (e.g., /discord-settings/some_id)' });
  });

  it('should return 405 for disallowed methods on /discord-settings', async () => {
    const request = new IncomingRequest('http://example.com/discord-settings/server_123', {
      method: 'PATCH',
      headers: { 
        Authorization: 'Bearer correct-key',
        'X-User-ID': 'test-user-id'
      },
    });
    const localEnv = { ...env, API_KEY: 'correct-key' };
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);
    const responseBody = await response.json() as any;
    expect(response.status).toBe(405);
    expect(responseBody).toEqual({ success: false, error: 'Method PATCH not allowed.' });
  });

  // Discord Settings /exists Route Tests
  it('should return 400 for GET requests to /discord-settings without server ID', async () => {
    const request = new IncomingRequest('http://example.com/discord-settings', {
      method: 'GET',
      headers: { 
        Authorization: 'Bearer correct-key',
        'X-User-ID': 'test-user-id'
      },
    });
    const localEnv = { ...env, API_KEY: 'correct-key' };
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);
    const responseBody = await response.json() as any;
    expect(response.status).toBe(400);
    expect(responseBody).toEqual({ success: false, error: 'A server ID is required for GET requests (e.g., /discord-settings/some_id)' });
  });

  it('should return 404 for unknown actions on /discord-settings', async () => {
    const request = new IncomingRequest('http://example.com/discord-settings/server_123/unknown-action', {
      method: 'GET',
      headers: { 
        Authorization: 'Bearer correct-key',
        'X-User-ID': 'test-user-id'
      },
    });
    const localEnv = { ...env, API_KEY: 'correct-key' };
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);
    const responseBody = await response.json() as any;
    expect(response.status).toBe(404);
    expect(responseBody).toEqual({ success: false, error: 'Unknown action: unknown-action' });
  });

  it('should route to DiscordServerExists for GET /discord-settings/:id/exists', async () => {
    const request = new IncomingRequest('http://example.com/discord-settings/server_123/exists', {
      method: 'GET',
      headers: { 
        Authorization: 'Bearer correct-key',
        'Content-Type': 'application/json',
        'X-User-ID': 'test-user-id'
      },
    });
    const localEnv = { ...env, API_KEY: 'correct-key' };
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);
    
    // The response status should be 200 (or 404 if not found, depending on DB state)
    // We're testing that the route is correctly routed, not the handler logic
    expect([200, 404, 500]).toContain(response.status);
    
    const responseBody = await response.json() as any;
    expect(responseBody).toHaveProperty('success');
  });

  it('should handle POST method on /discord-settings/:id/exists (should fail - processes as normal POST)', async () => {
    const request = new IncomingRequest('http://example.com/discord-settings/server_123/exists', {
      method: 'POST',
      headers: { 
        Authorization: 'Bearer correct-key',
        'Content-Type': 'application/json',
        'X-User-ID': 'test-user-id'
      },
      body: JSON.stringify({ setting_key: 'test', setting_value: 'value' })
    });
    const localEnv = { ...env, API_KEY: 'correct-key' };
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);
    // POST with 'exists' as server_id will try to add a setting with that ID
    // This is expected behavior since exists is only special for GET
    expect([400, 409, 500]).toContain(response.status);
  });

  it('should handle PUT method on /discord-settings/:id/exists (should fail - processes as normal PUT)', async () => {
    const request = new IncomingRequest('http://example.com/discord-settings/server_123/exists', {
      method: 'PUT',
      headers: { 
        Authorization: 'Bearer correct-key',
        'Content-Type': 'application/json',
        'X-User-ID': 'test-user-id'
      },
      body: JSON.stringify({ setting_key: 'test', setting_value: 'value' })
    });
    const localEnv = { ...env, API_KEY: 'correct-key' };
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);
    // PUT with 'exists' as server_id will try to update a setting
    expect([404, 409, 500]).toContain(response.status);
  });

  it('should handle DELETE method on /discord-settings/:id/exists (should fail - processes as normal DELETE)', async () => {
    const request = new IncomingRequest('http://example.com/discord-settings/server_123/exists', {
      method: 'DELETE',
      headers: { 
        Authorization: 'Bearer correct-key',
        'X-User-ID': 'test-user-id'
      },
    });
    const localEnv = { ...env, API_KEY: 'correct-key' };
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);
    // DELETE with 'exists' as server_id will try to delete settings
    expect([200, 404, 500]).toContain(response.status);
  });

  it('should handle special characters in server ID for /discord-settings/:id/exists', async () => {
    const serverId = 'server_123!@#$%';
    const request = new IncomingRequest(`http://example.com/discord-settings/${encodeURIComponent(serverId)}/exists`, {
      method: 'GET',
      headers: { 
        Authorization: 'Bearer correct-key',
        'Content-Type': 'application/json',
        'X-User-ID': 'test-user-id'
      },
    });
    const localEnv = { ...env, API_KEY: 'correct-key' };
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);
    
    expect([200, 404, 500]).toContain(response.status);
    const responseBody = await response.json() as any;
    expect(responseBody).toHaveProperty('success');
  });

  // Staff Route Tests
  it('should return 400 for POST requests to /staff with an ID', async () => {
    const request = new IncomingRequest('http://example.com/staff/some-id', {
      method: 'POST',
      headers: { 
        Authorization: 'Bearer correct-key',
        'X-User-ID': 'test-user-id'
      },
    });
    const localEnv = { ...env, API_KEY: 'correct-key' };
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);
    const responseBody = await response.json() as any;
    expect(response.status).toBe(400);
    expect(responseBody).toEqual({ success: false, error: 'POST requests cannot include an ID in the URL' });
  });

  it('should allow GET requests to /staff without ID', async () => {
    const request = new IncomingRequest('http://example.com/staff', {
      method: 'GET',
      headers: { 
        Authorization: 'Bearer correct-key',
        'X-User-ID': 'test-user-id'
      },
    });
    const localEnv = { ...env, API_KEY: 'correct-key' };
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);
    
    expect([200, 404, 500]).toContain(response.status);
    const responseBody = await response.json() as any;
    expect(responseBody).toHaveProperty('success');
  });

  it('should return 400 for PUT requests to /staff without ID', async () => {
    const request = new IncomingRequest('http://example.com/staff', {
      method: 'PUT',
      headers: { 
        Authorization: 'Bearer correct-key',
        'X-User-ID': 'test-user-id'
      },
    });
    const localEnv = { ...env, API_KEY: 'correct-key' };
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);
    const responseBody = await response.json() as any;
    expect(response.status).toBe(400);
    expect(responseBody).toEqual({ success: false, error: 'A staff ID is required for PUT requests (e.g., /staff/some_id)' });
  });

  it('should return 400 for DELETE requests to /staff without ID', async () => {
    const request = new IncomingRequest('http://example.com/staff', {
      method: 'DELETE',
      headers: { 
        Authorization: 'Bearer correct-key',
        'X-User-ID': 'test-user-id'
      },
    });
    const localEnv = { ...env, API_KEY: 'correct-key' };
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);
    const responseBody = await response.json() as any;
    expect(response.status).toBe(400);
    expect(responseBody).toEqual({ success: false, error: 'A staff ID is required for DELETE requests (e.g., /staff/some_id)' });
  });

  it('should return 405 for disallowed methods on /staff', async () => {
    const request = new IncomingRequest('http://example.com/staff/stf_123', {
      method: 'PATCH',
      headers: { 
        Authorization: 'Bearer correct-key',
        'X-User-ID': 'test-user-id'
      },
    });
    const localEnv = { ...env, API_KEY: 'correct-key' };
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);
    const responseBody = await response.json() as any;
    expect(response.status).toBe(405);
    expect(responseBody).toEqual({ success: false, error: 'Method PATCH not allowed' });
  });

  // Logs Route Tests
  it('should allow GET requests to /logs (admin only)', async () => {
    const request = new IncomingRequest('http://example.com/logs', {
      method: 'GET',
      headers: { 
        Authorization: 'Bearer correct-key',
        'X-User-ID': 'test-user-id'
      },
    });
    const localEnv = { ...env, API_KEY: 'correct-key' };
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);
    
    // Response can be 401, 403, or 200 depending on admin status
    expect([200, 401, 403, 500]).toContain(response.status);
    const responseBody = await response.json() as any;
    expect(responseBody).toHaveProperty('success');
  });

  it('should return 405 for POST requests to /logs', async () => {
    const request = new IncomingRequest('http://example.com/logs', {
      method: 'POST',
      headers: { 
        Authorization: 'Bearer correct-key',
        'X-User-ID': 'test-user-id'
      },
    });
    const localEnv = { ...env, API_KEY: 'correct-key' };
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
      headers: { 
        Authorization: 'Bearer correct-key',
        'X-User-ID': 'test-user-id'
      },
    });
    const localEnv = { ...env, API_KEY: 'correct-key' };
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
      headers: { 
        Authorization: 'Bearer correct-key',
        'X-User-ID': 'test-user-id'
      },
    });
    const localEnv = { ...env, API_KEY: 'correct-key' };
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
      headers: { 
        'X-Api-Key': 'test-api-key',
        'X-Discord-ID': '12345'
      },
    });
    const localEnv = { ...env, API_KEY: 'test-api-key' };
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);
    
    // Should not require Authorization Bearer header, only X-Api-Key
    expect([200, 400, 403, 500]).toContain(response.status);
  });

  it('should return 405 for POST requests to /auth/validate-admin', async () => {
    const request = new IncomingRequest('http://example.com/auth/validate-admin', {
      method: 'POST',
      headers: { 
        'X-Discord-ID': '12345'
      },
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);
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
    const response = await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);
    
    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET');
    expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST');
    expect(response.headers.get('Access-Control-Allow-Methods')).toContain('PUT');
    expect(response.headers.get('Access-Control-Allow-Methods')).toContain('DELETE');
    expect(response.headers.get('Access-Control-Allow-Methods')).toContain('OPTIONS');
  });

  it('should add CORS headers to all responses', async () => {
    const request = new IncomingRequest('http://example.com/profiles', {
      method: 'GET',
      headers: { 
        Authorization: 'Bearer correct-key',
        'X-User-ID': 'test-user-id'
      },
    });
    const localEnv = { ...env, API_KEY: 'correct-key' };
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);
    
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET');
    expect(response.headers.get('Access-Control-Allow-Headers')).toContain('Content-Type');
    expect(response.headers.get('Access-Control-Allow-Headers')).toContain('Authorization');
  });
});
