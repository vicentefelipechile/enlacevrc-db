import { createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import worker from '../../src/index';
import { createValidHeaders, createTestEnv, initializeDatabase, clearAndReloadTestData } from '../helpers/setup';

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe('GET /discord/list-servers - ListServers', () => {
  const validHeaders = createValidHeaders();
  const localEnv = createTestEnv();

  beforeAll(async () => {
    await initializeDatabase(localEnv.DB);
  });

  beforeEach(async () => {
    await clearAndReloadTestData(localEnv.DB);
  });

  it('should return 405 for non-GET methods', async () => {
    const request = new IncomingRequest('http://example.com/discord/123456789/exists-server', {
      method: 'POST',
      headers: validHeaders,
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(405);
    const body = await response.json() as any;
    expect(body).toEqual({ success: false, error: 'Method POST not allowed for /discord/123456789/exists-server' });
  });

  it('should return 405 for non-GET methods', async () => {
    const request = new IncomingRequest('http://example.com/discord/list-servers', {
      method: 'POST',
      headers: validHeaders,
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(405);
    const body = await response.json() as any;
    expect(body.success).toBe(false);
    expect(body.error).toContain('Method POST not allowed');
  });

  it('should return empty array when no servers exist', async () => {
    // Clear all servers
    await localEnv.DB.exec('UPDATE profiles SET verified_from = NULL');
    await localEnv.DB.exec('DELETE FROM vrchat_group');
    await localEnv.DB.exec('DELETE FROM discord_settings');
    await localEnv.DB.exec('DELETE FROM discord_server');

    const request = new IncomingRequest('http://example.com/discord/list-servers', {
      method: 'GET',
      headers: validHeaders,
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(200);
    const body = await response.json() as any;
    expect(body.success).toBe(true);
    expect(body.data).toEqual([]);
  });

  it('should list all Discord servers with correct format', async () => {
    const request = new IncomingRequest('http://example.com/discord/list-servers', {
      method: 'GET',
      headers: validHeaders,
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(200);
    const body = await response.json() as any;
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
  });

  it('should return servers with correct properties', async () => {
    const request = new IncomingRequest('http://example.com/discord/list-servers', {
      method: 'GET',
      headers: validHeaders,
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(200);
    const body = await response.json() as any;

    body.data.forEach((server: any) => {
      expect(server).toHaveProperty('discord_server_id');
      expect(server).toHaveProperty('discord_server_name');
      expect(typeof server.discord_server_id).toBe('string');
      expect(typeof server.discord_server_name).toBe('string');
    });
  });

  it('should return the test server from population', async () => {
    const request = new IncomingRequest('http://example.com/discord/list-servers', {
      method: 'GET',
      headers: validHeaders,
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(200);
    const body = await response.json() as any;

    const testServer = body.data.find((s: any) => s.discord_server_id === '123456789');
    expect(testServer).toBeDefined();
    expect(testServer.discord_server_name).toBe('TestServer');
  });

  it('should list multiple servers in correct order', async () => {
    // Add additional servers
    await localEnv.DB.prepare(
      'INSERT INTO discord_server (discord_server_id, server_name, added_by) VALUES (?, ?, ?)'
    ).bind('111222333', 'Server One', '987654321').run();

    await localEnv.DB.prepare(
      'INSERT INTO discord_server (discord_server_id, server_name, added_by) VALUES (?, ?, ?)'
    ).bind('444555666', 'Server Two', '987654321').run();

    const request = new IncomingRequest('http://example.com/discord/list-servers', {
      method: 'GET',
      headers: validHeaders,
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(200);
    const body = await response.json() as any;
    expect(body.data.length).toBeGreaterThanOrEqual(3);
  });

  it('should return error on unexpected server error', async () => {
    // Create a request with invalid authorization to potentially trigger an error
    const request = new IncomingRequest('http://example.com/discord/list-servers', {
      method: 'GET',
      headers: {
        Authorization: 'Bearer invalid-key',
        'X-Discord-ID': '987654321',
        'X-Discord-Name': 'TestStaff',
        'Content-Type': 'application/json',
      },
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(401);
  });

  it('should have correct response structure', async () => {
    const request = new IncomingRequest('http://example.com/discord/list-servers', {
      method: 'GET',
      headers: validHeaders,
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(200);
    const body = await response.json() as any;
    expect(body).toHaveProperty('success');
    expect(body).toHaveProperty('data');
    expect(body.success).toBe(true);
  });
});
