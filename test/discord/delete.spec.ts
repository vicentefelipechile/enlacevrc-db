/**
 * @file        test/discord/delete.spec.ts
 * @author      vicentefelipechile
 * @description Unit tests for the DeleteDiscordSetting function.
 */

import { env } from 'cloudflare:test';
import { describe, it, expect, vi } from 'vitest';
import { DeleteDiscordSetting } from '../../src/discord/delete';

// =================================================================================================
// Mock Setup
// =================================================================================================

const mockDb = {
  prepare: vi.fn().mockReturnThis(),
  bind: vi.fn().mockReturnThis(),
  first: vi.fn(),
  run: vi.fn(),
};

const localEnv = { ...env, DB: mockDb as any };

// =================================================================================================
// Test Suite
// =================================================================================================

describe('DeleteDiscordSetting Handler', () => {
  it('should delete a discord setting successfully', async () => {
    const discordServerId = 'server_123';
    const requestData = { setting_key: 'prefix' };
    const existingSetting = { 
      id: 1, 
      discord_server_id: 'srv_internal_123', 
      setting_key: 'prefix', 
      setting_value: '!',
      created_at: new Date(),
      updated_at: new Date()
    };

    const request = new Request('http://example.com/discord-settings/server_123', {
      method: 'DELETE',
      body: JSON.stringify(requestData),
      headers: { 'Content-Type': 'application/json' },
    });

    // Mock server lookup first, then setting lookup
    mockDb.first.mockResolvedValueOnce({ server_id: 'srv_internal_123' }) // Server lookup
                  .mockResolvedValueOnce(existingSetting); // Setting exists
    mockDb.run.mockResolvedValueOnce({ success: true }) // Delete succeeds
             .mockResolvedValueOnce({ success: true }); // Log insert succeeds

    const response = await DeleteDiscordSetting(request, discordServerId, localEnv);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(200);
    expect(responseBody).toEqual({ success: true, message: 'Discord setting deleted' });
    expect(mockDb.prepare).toHaveBeenCalledWith('SELECT * FROM discord_settings WHERE discord_server_id = ? AND setting_key = ?');
    expect(mockDb.bind).toHaveBeenCalledWith('srv_internal_123', requestData.setting_key);
  });

  it('should return 404 if the setting does not exist', async () => {
    const discordServerId = 'server_999';
    const requestData = { setting_key: 'nonexistent' };

    const request = new Request('http://example.com/discord-settings/server_999', {
      method: 'DELETE',
      body: JSON.stringify(requestData),
      headers: { 'Content-Type': 'application/json' },
    });

    // Mock server lookup first, then setting lookup that returns null
    mockDb.first.mockResolvedValueOnce({ server_id: 'srv_internal_999' }) // Server exists
                  .mockResolvedValueOnce(null); // Setting doesn't exist

    const response = await DeleteDiscordSetting(request, discordServerId, localEnv);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(404);
    expect(responseBody).toEqual({ success: false, error: 'Discord setting not found' });
  });

  it('should return 400 for missing setting_key', async () => {
    const discordServerId = 'server_123';
    const requestData = {}; // Missing setting_key

    const request = new Request('http://example.com/discord-settings/server_123', {
      method: 'DELETE',
      body: JSON.stringify(requestData),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await DeleteDiscordSetting(request, discordServerId, localEnv);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(400);
    expect(responseBody).toEqual({ success: false, error: 'Missing required field: setting_key is required' });
  });

  it('should return 404 if database delete fails', async () => {
    const discordServerId = 'server_123';
    const requestData = { setting_key: 'prefix' };
    const existingSetting = { 
      id: 1, 
      discord_server_id: 'srv_internal_123', 
      setting_key: 'prefix', 
      setting_value: '!'
    };

    const request = new Request('http://example.com/discord-settings/server_123', {
      method: 'DELETE',
      body: JSON.stringify(requestData),
      headers: { 'Content-Type': 'application/json' },
    });

    // Mock server lookup first, setting exists, but delete fails
    mockDb.first.mockResolvedValueOnce({ server_id: 'srv_internal_123' }) // Server exists
                  .mockResolvedValueOnce(existingSetting); // Setting exists
    mockDb.run.mockResolvedValue({ success: false }); // Delete fails

    const response = await DeleteDiscordSetting(request, discordServerId, localEnv);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(404);
    expect(responseBody).toEqual({ success: false, error: 'Failed to delete Discord setting. It may not exist' });
  });

  it('should return 500 for invalid JSON', async () => {
    const discordServerId = 'server_123';
    const request = new Request('http://example.com/discord-settings/server_123', {
      method: 'DELETE',
      body: '{"invalid_json',
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await DeleteDiscordSetting(request, discordServerId, localEnv);
    const responseData = await response.json() as any;

    expect(response.status).toBe(500);
    expect(responseData).toEqual({ success: false, error: 'Failed to delete Discord setting' });
  });
});