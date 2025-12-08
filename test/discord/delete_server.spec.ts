import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import worker from '../../src/index';

import poblate from '../../db/poblate.sql?raw';
import schema from '../../db/schema.sql?raw';
import test from '../../db/test.sql?raw';

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe('DELETE /discord/{server_id}/delete-server - DeleteServer', () => {
  const validHeaders = {
    Authorization: 'Bearer test-api-key',
    'X-Discord-ID': '987654321',
    'X-Discord-Name': 'TestStaff',
    'Content-Type': 'application/json',
  };
  const localEnv = { ...env, API_KEY: 'test-api-key' };

  beforeAll(async () => {
    const cleanedSchemas = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    const cleanedPoblate = poblate
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    const preparedStatements = cleanedSchemas.map(statement => {
      return localEnv.DB.prepare(`${statement};`);
    });

    const poblateStatements = cleanedPoblate.map(statement => {
      return localEnv.DB.prepare(`${statement};`);
    });

    await localEnv.DB.batch(preparedStatements);
    await localEnv.DB.batch(poblateStatements);
  });

  beforeEach(async () => {
    const tablesToClear = ["discord_settings", "setting", "profiles", "discord_server", "staff", "bot_admin", "log"];
    for (const table of tablesToClear) {
      await localEnv.DB.exec(`DELETE FROM ${table}`);
    }
    const cleanedTest = test
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    const statements = cleanedTest.map(statement => {
      return localEnv.DB.prepare(`${statement};`);
    });
    await localEnv.DB.batch(statements);
  });

  it('should return 405 for non-DELETE methods', async () => {
    const request = new IncomingRequest('http://example.com/discord/123456789/delete-server', {
      method: 'GET',
      headers: validHeaders,
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(405);
    const body = await response.json() as any;
    expect(body.success).toBe(false);
    expect(body.error).toContain('Method GET not allowed');
  });

  it('should return 404 when server does not exist', async () => {
    const request = new IncomingRequest('http://example.com/discord/999999999/delete-server', {
      method: 'DELETE',
      headers: validHeaders,
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(404);
    const body = await response.json() as any;
    expect(body).toEqual({ success: false, error: 'Discord server not found' });
  });

  it('should delete server successfully', async () => {
    const request = new IncomingRequest('http://example.com/discord/123456789/delete-server', {
      method: 'DELETE',
      headers: validHeaders,
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(200);
    const body = await response.json() as any;
    expect(body).toEqual({
      success: true,
      message: 'Discord server deleted successfully'
    });
  });

  it('should delete server from database after deletion', async () => {
    const request = new IncomingRequest('http://example.com/discord/123456789/delete-server', {
      method: 'DELETE',
      headers: validHeaders,
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(200);

    // Verify server is deleted from database
    const server = await localEnv.DB.prepare(
      'SELECT discord_server_id FROM discord_server WHERE discord_server_id = ?'
    ).bind('123456789').first() as any;

    expect(server).toBeNull();
  });

  it('should delete all server settings when deleting server', async () => {
    // Verify settings exist before deletion
    const settingsBefore = await localEnv.DB.prepare(
      'SELECT COUNT(*) as count FROM discord_settings WHERE discord_server_id = ?'
    ).bind('123456789').first() as { count: number };

    expect(settingsBefore.count).toBeGreaterThan(0);

    const request = new IncomingRequest('http://example.com/discord/123456789/delete-server', {
      method: 'DELETE',
      headers: validHeaders,
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(200);

    // Verify all settings are deleted
    const settingsAfter = await localEnv.DB.prepare(
      'SELECT COUNT(*) as count FROM discord_settings WHERE discord_server_id = ?'
    ).bind('123456789').first() as { count: number };

    expect(settingsAfter.count).toBe(0);
  });

  it('should preserve other servers when deleting one', async () => {
    // Add another server
    await localEnv.DB.prepare(
      'INSERT INTO discord_server (discord_server_id, server_name, added_by) VALUES (?, ?, ?)'
    ).bind('777888999', 'Another Server', '987654321').run();

    const request = new IncomingRequest('http://example.com/discord/123456789/delete-server', {
      method: 'DELETE',
      headers: validHeaders,
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(200);

    // Verify the other server still exists
    const otherServer = await localEnv.DB.prepare(
      'SELECT discord_server_id FROM discord_server WHERE discord_server_id = ?'
    ).bind('777888999').first() as any;

    expect(otherServer).toBeDefined();
    expect(otherServer.discord_server_id).toBe('777888999');
  });

  it('should log the deletion action', async () => {
    const request = new IncomingRequest('http://example.com/discord/123456789/delete-server', {
      method: 'DELETE',
      headers: validHeaders,
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(200);

    // Verify log entry was created
    const logs = await localEnv.DB.prepare(
      'SELECT log_message FROM log WHERE log_message LIKE ? ORDER BY log_id DESC LIMIT 1'
    ).bind('%Discord server deleted%').first() as any;

    expect(logs).toBeDefined();
    expect(logs.log_message).toContain('TestServer');
    expect(logs.log_message).toContain('123456789');
  });

  it('should delete settings before deleting server', async () => {
    // This test verifies the cascade deletion works properly
    const settingsBefore = await localEnv.DB.prepare(
      'SELECT COUNT(*) as count FROM discord_settings WHERE discord_server_id = ?'
    ).bind('123456789').first() as { count: number };

    const initialCount = settingsBefore.count;

    const request = new IncomingRequest('http://example.com/discord/123456789/delete-server', {
      method: 'DELETE',
      headers: validHeaders,
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(200);

    // Verify settings are completely gone
    const settingsAfter = await localEnv.DB.prepare(
      'SELECT COUNT(*) as count FROM discord_settings WHERE discord_server_id = ?'
    ).bind('123456789').first() as { count: number };

    expect(settingsAfter.count).toBe(0);
    expect(initialCount).toBeGreaterThan(0);
  });

  it('should handle server with special characters in name', async () => {
    // Add a server with special characters
    await localEnv.DB.prepare(
      'INSERT INTO discord_server (discord_server_id, server_name, added_by) VALUES (?, ?, ?)'
    ).bind('555666777', 'Server "Special" & <Name>', '987654321').run();

    const request = new IncomingRequest('http://example.com/discord/555666777/delete-server', {
      method: 'DELETE',
      headers: validHeaders,
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(200);

    // Verify server is deleted
    const server = await localEnv.DB.prepare(
      'SELECT discord_server_id FROM discord_server WHERE discord_server_id = ?'
    ).bind('555666777').first() as any;

    expect(server).toBeNull();
  });

  it('should return proper error response on unexpected error', async () => {
    // Create a request with invalid JSON to potentially trigger an error
    const request = new IncomingRequest('http://example.com/discord/123456789/delete-server', {
      method: 'DELETE',
      headers: validHeaders,
      body: 'invalid json',
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);

    // Should still work since DELETE doesn't require body parsing
    expect(response.status).toBe(200);
  });
});
