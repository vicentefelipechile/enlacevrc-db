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

    mockDb.run.mockResolvedValue({ success: true });

    const response = await UpdateDiscordSetting(request, discordServerId, localEnv);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(200);
    expect(responseBody.success).toBe(true);
    expect(responseBody.message).toBe('Discord setting updated');
    expect(mockDb.prepare).toHaveBeenCalledWith('UPDATE discord_settings SET setting_value = ?, updated_at = CURRENT_TIMESTAMP WHERE discord_server_id = ? AND setting_key = ?');
    expect(mockDb.bind).toHaveBeenCalledWith(updateData.setting_value, discordServerId, updateData.setting_key);
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
    expect(responseBody.success).toBe(false);
    expect(responseBody.error).toBe('Missing required fields: setting_key and setting_value are required');
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
    expect(responseBody.success).toBe(false);
    expect(responseBody.error).toBe('Missing required fields: setting_key and setting_value are required');
  });

  it('should return 500 for invalid JSON', async () => {
    const discordServerId = 'server_123';
    const request = new Request(`http://example.com/discord-settings/${discordServerId}`, {
      method: 'PUT',
      body: '{"invalid_json',
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await UpdateDiscordSetting(request, discordServerId, localEnv);

    expect(response.status).toBe(500);
    const responseData = await response.json() as any;
    expect(responseData.success).toBe(false);
    expect(responseData.error).toMatch(/unexpected end of JSON input/i);
  });
});