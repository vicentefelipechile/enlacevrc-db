/**
 * @file        test/discord/get.spec.ts
 * @author      vicentefelipechile
 * @description Unit tests for the GetDiscordSetting function.
 */

import { env } from 'cloudflare:test';
import { describe, it, expect, vi } from 'vitest';
import { GetDiscordSetting } from '../../src/discord/get';
import { DiscordSetting3D } from '../../src/models';

// =================================================================================================
// Mock Setup
// =================================================================================================

const mockDb = {
  prepare: vi.fn().mockReturnThis(),
  bind: vi.fn().mockReturnThis(),
  first: vi.fn(),
};

const localEnv = { ...env, DB: mockDb as any };

// =================================================================================================
// Test Suite
// =================================================================================================

describe('GetDiscordSetting Handler', () => {
  it('should return a discord setting successfully', async () => {
    const settingKey = 'prefix';
    const discordServerId = 'server_123';
    const mockDate = new Date('2025-01-01T00:00:00.000Z');
    const mockSetting: DiscordSetting3D = { 
      id: 1,
      discord_server_id: 'server_123', 
      setting_key: 'prefix', 
      setting_value: '!',
      created_at: mockDate,
      updated_at: mockDate
    };
    const request = new Request(`http://example.com/discord-settings/${discordServerId}?setting_key=${settingKey}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    mockDb.first.mockResolvedValue(mockSetting);

    const response = await GetDiscordSetting(request, discordServerId, localEnv);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(200);
    expect(responseBody.success).toBe(true);
    expect(responseBody.data.id).toBe(mockSetting.id);
    expect(responseBody.data.discord_server_id).toBe(mockSetting.discord_server_id);
    expect(responseBody.data.setting_key).toBe(mockSetting.setting_key);
    expect(responseBody.data.setting_value).toBe(mockSetting.setting_value);
    expect(responseBody.data.created_at).toBe(mockSetting.created_at.toISOString());
    expect(responseBody.data.updated_at).toBe(mockSetting.updated_at.toISOString());
    expect(mockDb.prepare).toHaveBeenCalledWith('SELECT * FROM discord_settings WHERE discord_server_id = ? AND setting_key = ?');
    expect(mockDb.bind).toHaveBeenCalledWith(discordServerId, settingKey);
  });

  it('should return 404 if setting is not found', async () => {
    const discordServerId = 'server_999';
    const settingKey = 'nonexistent';
    const request = new Request(`http://example.com/discord-settings/${discordServerId}?setting_key=${settingKey}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    mockDb.first.mockResolvedValue(null);

    const response = await GetDiscordSetting(request, discordServerId, localEnv);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(404);
    expect(responseBody.success).toBe(false);
    expect(responseBody.error).toBe('Discord setting not found');
  });

  it('should return 400 for missing setting_key', async () => {
    const discordServerId = 'server_123';
    const request = new Request(`http://example.com/discord-settings/${discordServerId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await GetDiscordSetting(request, discordServerId, localEnv);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(400);
    expect(responseBody.success).toBe(false);
    expect(responseBody.error).toBe('Missing required query parameter: setting_key is required');
  });
});