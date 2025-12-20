import { createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import worker from '../../src/index';
import { initializeDatabase, clearAndReloadTestData, createTestEnv, createValidHeaders } from '../helpers/setup';

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe('GET /group/{groupId}/get-group - GetGroup', () => {
  const validHeaders = createValidHeaders();
  const localEnv = createTestEnv();

  beforeAll(async () => {
    await initializeDatabase(localEnv.DB);
  });

  beforeEach(async () => {
    await clearAndReloadTestData(localEnv.DB);

    // Add test group
    await localEnv.DB.prepare(
      'INSERT INTO vrchat_group (vrchat_group_id, discord_server_id, group_name, added_by) VALUES (?, ?, ?, ?)'
    ).bind('grp_test123', '123456789', 'Test Group', '987654321').run();
  });

  it('should return 405 for non-GET methods', async () => {
    const request = new IncomingRequest('http://example.com/group/grp_test123/get-group', {
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

  it('should return 404 when group does not exist', async () => {
    const request = new IncomingRequest('http://example.com/group/grp_nonexistent/get-group', {
      method: 'GET',
      headers: validHeaders,
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(404);
    const body = await response.json() as any;
    expect(body.success).toBe(false);
    expect(body.error).toBe('VRChat group not found');
  });

  it('should get group successfully with server info', async () => {
    const request = new IncomingRequest('http://example.com/group/grp_test123/get-group', {
      method: 'GET',
      headers: validHeaders,
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(200);
    const body = await response.json() as any;
    expect(body.success).toBe(true);
    expect(body.data.vrchat_group_id).toBe('grp_test123');
    expect(body.data.group_name).toBe('Test Group');
    expect(body.data.discord_server_id).toBe('123456789');
    expect(body.data.server_name).toBe('TestServer');
  });
});
