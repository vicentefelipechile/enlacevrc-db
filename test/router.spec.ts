import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import worker from '../src/index';
import { ErrorResponse } from '../src/responses';

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe('Router and Authentication', () => {
  it('should return 401 Unauthorized if Authorization header is missing', async () => {
    const request = new IncomingRequest('http://example.com/profiles');
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ success: false, error: 'Unauthorized' });
  });

  it('should return 401 Unauthorized if Authorization header is incorrect', async () => {
    const request = new IncomingRequest('http://example.com/profiles', {
      headers: { Authorization: 'Bearer incorrect-key' },
    });
    const localEnv = { ...env, PRIVATE_KEY: 'correct-key' };
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ success: false, error: 'Unauthorized' });
  });

  it('should return 404 Not Found for routes not starting with /profiles', async () => {
    const request = new IncomingRequest('http://example.com/not-profiles', {
        headers: { Authorization: 'Bearer correct-key' },
    });
    const localEnv = { ...env, PRIVATE_KEY: 'correct-key' };
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ success: false, error: 'Not Found' });
  });

  it('should return 400 for POST requests with an ID', async () => {
    const request = new IncomingRequest('http://example.com/profiles/some-id', {
      method: 'POST',
      headers: { Authorization: 'Bearer correct-key' },
    });
    const localEnv = { ...env, PRIVATE_KEY: 'correct-key' };
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ success: false, error: 'POST requests cannot include an ID in the URL.' });
  });

  it('should return 400 for GET requests without an ID', async () => {
    const request = new IncomingRequest('http://example.com/profiles', {
      method: 'GET',
      headers: { Authorization: 'Bearer correct-key' },
    });
    const localEnv = { ...env, PRIVATE_KEY: 'correct-key' };
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ success: false, error: 'A profile ID is required for GET requests (e.g., /profiles/some_id).' });
  });

  it('should return 400 for PUT requests without an ID', async () => {
    const request = new IncomingRequest('http://example.com/profiles', {
      method: 'PUT',
      headers: { Authorization: 'Bearer correct-key' },
    });
    const localEnv = { ...env, PRIVATE_KEY: 'correct-key' };
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ success: false, error: 'A profile ID is required for PUT requests (e.g., /profiles/some_id).' });
  });

  it('should return 405 for disallowed methods', async () => {
    const request = new IncomingRequest('http://example.com/profiles', {
      method: 'HEAD',
      headers: { Authorization: 'Bearer correct-key' },
    });
    const localEnv = { ...env, PRIVATE_KEY: 'correct-key' };
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(405);
    expect(await response.json()).toEqual({ success: false, error: 'Method DELETE not allowed.' });
  });
});
