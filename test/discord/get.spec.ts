/**
 * @file        test/discord/get.spec.ts
 * @author      vicentefelipechile
 * @description Unit tests for the GetDiscordSetting function.
 */

import { env } from 'cloudflare:test';
import { describe, it, expect, vi } from 'vitest';
import { GetDiscordSetting } from '../../src/discord/get';

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
    const discordServerId = 'server_123';
    const requestBody = { setting_key: 'prefix' };
    const mockSetting = { 
      id: 1, 
      discord_server_id: 'server_123', 
      setting_key: 'prefix', 
      setting_value: '!',
      created_at: new Date(),
      updated_at: new Date()
    };
    const request = new Request('http://example.com/discord-settings/server_123', {
      method: 'GET',
      body: JSON.stringify(requestBody),
      headers: { 'Content-Type': 'application/json' },
    });

    mockDb.first.mockResolvedValue(mockSetting);

    const response = await GetDiscordSetting(request, discordServerId, localEnv);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(200);
    expect(responseBody.success).toBe(true);
    expect(responseBody.data).toEqual(mockSetting);
    expect(mockDb.prepare).toHaveBeenCalledWith('SELECT * FROM discord_settings WHERE discord_server_id = ? AND setting_key = ?');
    expect(mockDb.bind).toHaveBeenCalledWith(discordServerId, requestBody.setting_key);
  });

  it('should return 404 if setting is not found', async () => {
    const discordServerId = 'server_999';
    const requestBody = { setting_key: 'nonexistent' };
    const request = new Request('http://example.com/discord-settings/server_999', {
      method: 'GET',
      body: JSON.stringify(requestBody),
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
    const requestBody = {}; // Missing setting_key
    const request = new Request('http://example.com/discord-settings/server_123', {
      method: 'GET',
      body: JSON.stringify(requestBody),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await GetDiscordSetting(request, discordServerId, localEnv);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(400);
    expect(responseBody.success).toBe(false);
    expect(responseBody.error).toBe('Missing required field: setting_key is required');
  });

  it('should return 500 for invalid JSON', async () => {
    const discordServerId = 'server_123';
    const request = new Request('http://example.com/discord-settings/server_123', {
      method: 'GET',
      body: '{"invalid_json',
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await GetDiscordSetting(request, discordServerId, localEnv);

    expect(response.status).toBe(500);
    const responseData = await response.json() as any;
    expect(responseData.success).toBe(false);
    expect(responseData.error).toMatch(/unexpected end of JSON input/i);
  });
});