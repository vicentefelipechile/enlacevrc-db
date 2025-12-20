import { createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import worker from '../../src/index';
import { initializeDatabase, clearAndReloadTestData, createTestEnv, createValidHeaders } from '../helpers/setup';

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe('DELETE /group/{groupId}/delete-group - DeleteGroup', () => {
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

  it('should return 405 for non-DELETE methods', async () => {
    const request = new IncomingRequest('http://example.com/group/grp_test123/delete-group', {
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

  it('should return 404 when group does not exist', async () => {
    const request = new IncomingRequest('http://example.com/group/grp_nonexistent/delete-group', {
      method: 'DELETE',
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

  it('should delete group successfully', async () => {
    const request = new IncomingRequest('http://example.com/group/grp_test123/delete-group', {
      method: 'DELETE',
      headers: validHeaders,
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(200);
    const body = await response.json() as any;
    expect(body.success).toBe(true);
    expect(body.message).toContain('VRChat group deleted successfully');
    expect(body.data.vrchat_group_id).toBe('grp_test123');

    // Verify group was deleted
    const group = await localEnv.DB.prepare(
      'SELECT * FROM vrchat_group WHERE vrchat_group_id = ?'
    ).bind('grp_test123').first();
    expect(group).toBeNull();
  });

  it('should log the deletion action', async () => {
    const request = new IncomingRequest('http://example.com/group/grp_test123/delete-group', {
      method: 'DELETE',
      headers: validHeaders,
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(200);

    // Verify log entry
    const logs = await localEnv.DB.prepare(
      'SELECT log_message FROM log WHERE log_message LIKE ? ORDER BY log_id DESC LIMIT 1'
    ).bind('%VRChat group deleted%').first() as any;

    expect(logs).toBeDefined();
    expect(logs.log_message).toContain('grp_test123');
  });
});
