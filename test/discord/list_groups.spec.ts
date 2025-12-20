import { createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import worker from '../../src/index';
import { initializeDatabase, clearAndReloadTestData, createTestEnv, createValidHeaders } from '../helpers/setup';

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe('GET /discord/{serverId}/list-groups - ListGroups', () => {
  const validHeaders = createValidHeaders();
  const localEnv = createTestEnv();

  beforeAll(async () => {
    await initializeDatabase(localEnv.DB);
  });

  beforeEach(async () => {
    await clearAndReloadTestData(localEnv.DB);
  });

  it('should return 405 for non-GET methods', async () => {
    const request = new IncomingRequest('http://example.com/discord/123456789/list-groups', {
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

  it('should return 404 when Discord server does not exist', async () => {
    const request = new IncomingRequest('http://example.com/discord/999999999/list-groups', {
      method: 'GET',
      headers: validHeaders,
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(404);
    const body = await response.json() as any;
    expect(body.success).toBe(false);
    expect(body.error).toBe('Discord server not found');
  });

  it('should list default test group from test.sql', async () => {
    const request = new IncomingRequest('http://example.com/discord/123456789/list-groups', {
      method: 'GET',
      headers: validHeaders,
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(200);
    const body = await response.json() as any;
    expect(body.success).toBe(true);
    expect(body.data.discord_server_id).toBe('123456789');
    expect(body.data.groups).toHaveLength(1);
    expect(body.data.groups[0].vrchat_group_id).toBe('grp_test_default');
    expect(body.data.total).toBe(1);
  });

  it('should list all groups for a server', async () => {
    // Add more groups (test.sql already has one)
    await localEnv.DB.batch([
      localEnv.DB.prepare('INSERT INTO vrchat_group (vrchat_group_id, discord_server_id, group_name, added_by) VALUES (?, ?, ?, ?)').bind('grp_1', '123456789', 'Group 1', '987654321'),
      localEnv.DB.prepare('INSERT INTO vrchat_group (vrchat_group_id, discord_server_id, group_name, added_by) VALUES (?, ?, ?, ?)').bind('grp_2', '123456789', 'Group 2', '987654321'),
      localEnv.DB.prepare('INSERT INTO vrchat_group (vrchat_group_id, discord_server_id, group_name, added_by) VALUES (?, ?, ?, ?)').bind('grp_3', '123456789', 'Group 3', '987654321'),
    ]);

    const request = new IncomingRequest('http://example.com/discord/123456789/list-groups', {
      method: 'GET',
      headers: validHeaders,
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(200);
    const body = await response.json() as any;
    expect(body.success).toBe(true);
    expect(body.data.discord_server_id).toBe('123456789');
    expect(body.data.groups).toHaveLength(4); // 1 from test.sql + 3 added
    expect(body.data.total).toBe(4);
    expect(body.data.groups[0].vrchat_group_id).toBeDefined();
    expect(body.data.groups[0].group_name).toBeDefined();
  });

  it('should not return groups from other servers', async () => {
    // First create second Discord server for foreign key constraint
    await localEnv.DB.prepare(
      'INSERT INTO discord_server (discord_server_id, server_name, added_by) VALUES (?, ?, ?)'
    ).bind('999888777', 'Server 2', '987654321').run();

    // Add groups to different servers
    await localEnv.DB.batch([
      localEnv.DB.prepare('INSERT INTO vrchat_group (vrchat_group_id, discord_server_id, group_name, added_by) VALUES (?, ?, ?, ?)').bind('grp_server1', '123456789', 'Server 1 Group', '987654321'),
      localEnv.DB.prepare('INSERT INTO vrchat_group (vrchat_group_id, discord_server_id, group_name, added_by) VALUES (?, ?, ?, ?)').bind('grp_server2', '999888777', 'Server 2 Group', '987654321'),
    ]);

    const request = new IncomingRequest('http://example.com/discord/123456789/list-groups', {
      method: 'GET',
      headers: validHeaders,
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, localEnv, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(200);
    const body = await response.json() as any;
    // Should have 2 groups: grp_test_default from test.sql + grp_server1 added here
    expect(body.data.groups).toHaveLength(2);
    const groupIds = body.data.groups.map((g: any) => g.vrchat_group_id);
    expect(groupIds).toContain('grp_test_default');
    expect(groupIds).toContain('grp_server1');
    expect(groupIds).not.toContain('grp_server2'); // Should not include server 2's group
  });
});
