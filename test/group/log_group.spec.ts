import { createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import worker from '../../src/index';
import { initializeDatabase, clearAndReloadTestData, createTestEnv, createValidHeaders } from '../helpers/setup';

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe('POST /group/log-group - LogGroup', () => {
    const validHeaders = createValidHeaders();
    const localEnv = createTestEnv();

    beforeAll(async () => {
        await initializeDatabase(localEnv.DB);
    });

    beforeEach(async () => {
        await clearAndReloadTestData(localEnv.DB);
    });

    it('should return 405 for non-POST methods', async () => {
        const request = new IncomingRequest('http://example.com/group/log-group', {
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
        const request = new IncomingRequest('http://example.com/group/log-group', {
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

    it('should return 404 when VRChat group does not exist for Discord server', async () => {
        const request = new IncomingRequest('http://example.com/group/log-group', {
            method: 'POST',
            headers: validHeaders,
            body: JSON.stringify({
                vrchat_group_id: 'grp_nonexistent',
                discord_server_id: '123456789',
                action_description: 'Test action'
            }),
        });
        const ctx = createExecutionContext();
        const response = await worker.fetch(request, localEnv, ctx);
        await waitOnExecutionContext(ctx);

        expect(response.status).toBe(404);
        const body = await response.json() as any;
        expect(body.success).toBe(false);
        expect(body.error).toBe('VRChat group does not exist for this Discord server');
    });

    it('should create log entry successfully with log_id = 1 for first log', async () => {
        // First, add a group
        await localEnv.DB.prepare(
            'INSERT INTO vrchat_group (vrchat_group_id, discord_server_id, group_name, added_by) VALUES (?, ?, ?, ?)'
        ).bind('grp_test001', '123456789', 'Test Group', '987654321').run();

        const request = new IncomingRequest('http://example.com/group/log-group', {
            method: 'POST',
            headers: validHeaders,
            body: JSON.stringify({
                vrchat_group_id: 'grp_test001',
                discord_server_id: '123456789',
                action_description: 'First test action'
            }),
        });
        const ctx = createExecutionContext();
        const response = await worker.fetch(request, localEnv, ctx);
        await waitOnExecutionContext(ctx);

        expect(response.status).toBe(201);
        const body = await response.json() as any;
        expect(body.success).toBe(true);
        expect(body.message).toContain('Log entry created successfully');
        expect(body.data.log_id).toBe(1);
        expect(body.data.vrchat_group_id).toBe('grp_test001');
        expect(body.data.discord_server_id).toBe('123456789');
        expect(body.data.action_description).toBe('First test action');
    });

    it('should increment log_id for same group and server combination', async () => {
        const AddGroup = new IncomingRequest('http://example.com/group/add-group', {
            method: 'POST',
            headers: validHeaders,
            body: JSON.stringify({
                vrchat_group_id: 'grp_test002',
                discord_server_id: '123456789',
                group_name: 'Test Group 2',
                added_by: '987654321'
            }),
        });

        // Add second log entry via endpoint
        const request = new IncomingRequest('http://example.com/group/log-group', {
            method: 'POST',
            headers: validHeaders,
            body: JSON.stringify({
                vrchat_group_id: 'grp_test002',
                discord_server_id: '123456789',
                action_description: 'Second action'
            }),
        });
        const ctx = createExecutionContext();
        await worker.fetch(AddGroup, localEnv, ctx);
        await waitOnExecutionContext(ctx);

        const response = await worker.fetch(request, localEnv, ctx);
        await waitOnExecutionContext(ctx);

        expect(response.status).toBe(201);
        const body = await response.json() as any;
        expect(body.data.log_id).toBe(2);
    });

    it('should maintain separate log_id sequences for different group-server combinations', async () => {
        // Add two groups - using different group IDs since vrchat_group_id is PRIMARY KEY
        const addGroupA = new IncomingRequest('http://example.com/group/add-group', {
            method: 'POST',
            headers: validHeaders,
            body: JSON.stringify({
                vrchat_group_id: 'grp_test003_a',
                discord_server_id: '123456789',
                group_name: 'Group A',
                added_by: '987654321'
            }),
        });

        const addGroupB = new IncomingRequest('http://example.com/group/add-group', {
            method: 'POST',
            headers: validHeaders,
            body: JSON.stringify({
                vrchat_group_id: 'grp_test003_b',
                discord_server_id: '123456789',
                group_name: 'Group B',
                added_by: '987654321'
            }),
        });

        // Add log for second group - should start at 1
        const request = new IncomingRequest('http://example.com/group/log-group', {
            method: 'POST',
            headers: validHeaders,
            body: JSON.stringify({
                vrchat_group_id: 'grp_test003_b',
                discord_server_id: '123456789',
                action_description: 'Action on group B'
            }),
        });
        const ctx = createExecutionContext();
        await worker.fetch(addGroupA, localEnv, ctx);
        await waitOnExecutionContext(ctx);
        const r = await worker.fetch(addGroupB, localEnv, ctx);
        await waitOnExecutionContext(ctx);

        const response = await worker.fetch(request, localEnv, ctx);
        await waitOnExecutionContext(ctx);

        expect(response.status).toBe(201);
        const body = await response.json() as any;
        expect(body.data.log_id).toBe(2); // Should be 2, not 1

        // Verify first group still can increment to 6
        const request2 = new IncomingRequest('http://example.com/group/log-group', {
            method: 'POST',
            headers: validHeaders,
            body: JSON.stringify({
                vrchat_group_id: 'grp_test003_a',
                discord_server_id: '123456789',
                action_description: 'Another action on group A'
            }),
        });
        const ctx2 = createExecutionContext();
        const response2 = await worker.fetch(request2, localEnv, ctx2);
        await waitOnExecutionContext(ctx2);

        expect(response2.status).toBe(201);
        const body2 = await response2.json() as any;
        expect(body2.data.log_id).toBe(2);
    });

    it('should log the action to the general log', async () => {
        // Add a group
        await localEnv.DB.prepare(
            'INSERT INTO vrchat_group (vrchat_group_id, discord_server_id, group_name, added_by) VALUES (?, ?, ?, ?)'
        ).bind('grp_logged', '123456789', 'Logged Group', '987654321').run();

        const request = new IncomingRequest('http://example.com/group/log-group', {
            method: 'POST',
            headers: validHeaders,
            body: JSON.stringify({
                vrchat_group_id: 'grp_logged',
                discord_server_id: '123456789',
                action_description: 'This is a logged action'
            }),
        });
        const ctx = createExecutionContext();
        const response = await worker.fetch(request, localEnv, ctx);
        await waitOnExecutionContext(ctx);

        expect(response.status).toBe(201);

        // Verify log entry was created in the general log table
        const logs = await localEnv.DB.prepare(
            'SELECT log_message FROM log WHERE log_message LIKE ? ORDER BY log_id DESC LIMIT 1'
        ).bind('%Log entry created for VRChat group%').first() as any;

        expect(logs).toBeDefined();
        expect(logs.log_message).toContain('grp_logged');
        expect(logs.log_message).toContain('Logged Group');
    });
});
