/**
 * @file        test/discord/update.spec.ts
 * @author      vicentefelipechile
 * @description Unit tests for the UpdateDiscordSetting function.
 */

import { env } from 'cloudflare:test';
import { describe, it, expect, vi } from 'vitest';
import { UpdateDiscordSetting } from '../../src/discord/update';

// =================================================================================================
// Mock Setup
// =================================================================================================

const mockDb = {
  prepare: vi.fn().mockReturnThis(),
  bind: vi.fn().mockReturnThis(),
  run: vi.fn(),
  first: vi.fn(),
};

const localEnv = { ...env, DB: mockDb as any };

// =================================================================================================
// Test Suite
// =================================================================================================

describe('UpdateDiscordSetting Handler', () => {
  it('should update a discord setting successfully', async () => {
    const discordServerId = 'server_123';
    const updateData = { setting_key: 'prefix', setting_value: '?' };
    const request = new Request(`http://example.com/discord-settings/${discordServerId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
      headers: { 'Content-Type': 'application/json' },
    });

    mockDb.first.mockResolvedValueOnce({ '1': 1 }) // Server exists
                  .mockResolvedValueOnce({ '1': 1 }); // Setting exists
    mockDb.run.mockResolvedValue({ success: true });

    const response = await UpdateDiscordSetting(request, discordServerId, localEnv);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(200);
    expect(responseBody).toEqual({ success: true, message: 'Discord setting updated' });
    expect(mockDb.prepare).toHaveBeenCalledWith('UPDATE discord_settings SET setting_value = ?, updated_at = CURRENT_TIMESTAMP, updated_by = ? WHERE discord_server_id = ? AND setting_key = ?');
    expect(mockDb.bind).toHaveBeenCalledWith(updateData.setting_value, 'system', discordServerId, updateData.setting_key);
  });

  it('should return 400 for missing setting_key', async () => {
    const discordServerId = 'server_123';
    const updateData = { setting_value: '?' }; // Missing setting_key
    const request = new Request(`http://example.com/discord-settings/${discordServerId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await UpdateDiscordSetting(request, discordServerId, localEnv);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(400);
    expect(responseBody).toEqual({ success: false, error: 'Missing required fields: setting_key and setting_value are required' });
  });

  it('should return 400 for missing setting_value', async () => {
    const discordServerId = 'server_123';
    const updateData = { setting_key: 'prefix' }; // Missing setting_value
    const request = new Request(`http://example.com/discord-settings/${discordServerId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await UpdateDiscordSetting(request, discordServerId, localEnv);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(400);
    expect(responseBody).toEqual({ success: false, error: 'Missing required fields: setting_key and setting_value are required' });
  });

  it('should return 400 for invalid JSON', async () => {
    const discordServerId = 'server_123';
    const request = new Request(`http://example.com/discord-settings/${discordServerId}`, {
      method: 'PUT',
      body: '{"invalid_json',
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await UpdateDiscordSetting(request, discordServerId, localEnv);
    const responseData = await response.json() as any;

    expect(response.status).toBe(400);
    expect(responseData).toEqual({ success: false, error: 'Invalid JSON in request body' });
  });
});