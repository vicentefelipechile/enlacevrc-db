import { createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import worker from '../../src/index';
import { initializeDatabase, clearAndReloadTestData, createTestEnv, createValidHeaders } from '../helpers/setup';

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe('POST /group/add-group - AddGroup', () => {
  const validHeaders = createValidHeaders();
  const localEnv = createTestEnv();

  beforeAll(async () => {
    await initializeDatabase(localEnv.DB);
  });

  beforeEach(async () => {
    await clearAndReloadTestData(localEnv.DB);
  });

  it('should return 405 for non-POST methods', async () => {
    const request = new IncomingRequest('http://example.com/group/add-group', {
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

  it('should return 400 when missing required fields', async () => {
    const request = new IncomingRequest('http://example.com/group/add-group', {
      method: 'POST',
      headers: validHeaders,
      body: JSON.stringify({
        vrchat_group_id: 'grp_test123'
      }),
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(400);
    const body = await response.json() as any;
    expect(body.success).toBe(false);
    expect(body.error).toContain('Missing required fields');
  });

  it('should return 404 when Discord server does not exist', async () => {
    const request = new IncomingRequest('http://example.com/group/add-group', {
      method: 'POST',
      headers: validHeaders,
      body: JSON.stringify({
        vrchat_group_id: 'grp_test123',
        discord_server_id: '999999999',
        group_name: 'Test Group'
      }),
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(404);
    const body = await response.json() as any;
    expect(body.success).toBe(false);
    expect(body.error).toBe('Discord server does not exist');
  });

  it('should add group successfully', async () => {
    const request = new IncomingRequest('http://example.com/group/add-group', {
      method: 'POST',
      headers: validHeaders,
      body: JSON.stringify({
        vrchat_group_id: 'grp_test123',
        discord_server_id: '123456789',
        group_name: 'My VRChat Group'
      }),
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(201);
    const body = await response.json() as any;
    expect(body.success).toBe(true);
    expect(body.message).toContain('VRChat group added successfully');
    expect(body.data.vrchat_group_id).toBe('grp_test123');
    expect(body.data.discord_server_id).toBe('123456789');
    expect(body.data.group_name).toBe('My VRChat Group');
  });

  it('should return 409 when group already exists for server', async () => {
    // Add group first
    await localEnv.DB.prepare(
      'INSERT INTO vrchat_group (vrchat_group_id, discord_server_id, group_name, added_by) VALUES (?, ?, ?, ?)'
    ).bind('grp_duplicate', '123456789', 'Duplicate Group', '987654321').run();

    const request = new IncomingRequest('http://example.com/group/add-group', {
      method: 'POST',
      headers: validHeaders,
      body: JSON.stringify({
        vrchat_group_id: 'grp_duplicate',
        discord_server_id: '123456789',
        group_name: 'Another Name'
      }),
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(409);
    const body = await response.json() as any;
    expect(body.success).toBe(false);
    expect(body.error).toBe('VRChat group already exists for this Discord server');
  });

  it('should log the group addition action', async () => {
    const request = new IncomingRequest('http://example.com/group/add-group', {
      method: 'POST',
      headers: validHeaders,
      body: JSON.stringify({
        vrchat_group_id: 'grp_logged',
        discord_server_id: '123456789',
        group_name: 'Logged Group'
      }),
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(201);

    // Verify log entry was created
    const logs = await localEnv.DB.prepare(
      'SELECT log_message FROM log WHERE log_message LIKE ? ORDER BY log_id DESC LIMIT 1'
    ).bind('%VRChat group added%').first() as any;

    expect(logs).toBeDefined();
    expect(logs.log_message).toContain('grp_logged');
    expect(logs.log_message).toContain('Logged Group');
  });
});
