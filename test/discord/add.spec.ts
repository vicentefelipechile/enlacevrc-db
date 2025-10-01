/**
 * @file        test/discord/add.spec.ts
 * @author      vicentefelipechile
 * @description Unit tests for the AddDiscordSetting function.
 */

import { env } from 'cloudflare:test';
import { describe, it, expect, vi } from 'vitest';
import { AddDiscordSetting } from '../../src/discord/add';

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

describe('AddDiscordSetting Handler', () => {
  it('should add a discord setting successfully', async () => {
    const newSetting = { setting_key: 'prefix', setting_value: '!' };
    const discordServerId = 'server_123';
    const request = new Request('http://example.com/discord-settings/server_123', {
      method: 'POST',
      body: JSON.stringify(newSetting),
      headers: { 'Content-Type': 'application/json' },
    });

    mockDb.run.mockResolvedValue({ success: true });

    const response = await AddDiscordSetting(request, discordServerId, localEnv);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(201);
    expect(responseBody.success).toEqual(true);
    expect(responseBody.message).toBe('Discord setting added successfully');
    expect(mockDb.prepare).toHaveBeenCalledWith('INSERT INTO discord_settings (discord_server_id, setting_key, setting_value) VALUES (?, ?, ?)');
    expect(mockDb.bind).toHaveBeenCalledWith(discordServerId, newSetting.setting_key, newSetting.setting_value);
  });

  it('should return 400 for missing setting_key', async () => {
    const newSetting = { setting_value: '!' }; // Missing setting_key
    const discordServerId = 'server_123';
    const request = new Request('http://example.com/discord-settings/server_123', {
      method: 'POST',
      body: JSON.stringify(newSetting),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await AddDiscordSetting(request, discordServerId, localEnv);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(400);
    expect(responseBody.success).toBe(false);
    expect(responseBody.error).toBe('Missing required fields: setting_key and setting_value are required');
  });

  it('should return 400 for missing setting_value', async () => {
    const newSetting = { setting_key: 'prefix' }; // Missing setting_value
    const discordServerId = 'server_123';
    const request = new Request('http://example.com/discord-settings/server_123', {
      method: 'POST',
      body: JSON.stringify(newSetting),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await AddDiscordSetting(request, discordServerId, localEnv);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(400);
    expect(responseBody.success).toBe(false);
    expect(responseBody.error).toBe('Missing required fields: setting_key and setting_value are required');
  });

  it('should return 409 for database failure', async () => {
    const newSetting = { setting_key: 'prefix', setting_value: '!' };
    const discordServerId = 'server_123';
    const request = new Request('http://example.com/discord-settings/server_123', {
      method: 'POST',
      body: JSON.stringify(newSetting),
      headers: { 'Content-Type': 'application/json' },
    });

    mockDb.run.mockResolvedValue({ success: false });

    const response = await AddDiscordSetting(request, discordServerId, localEnv);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(409);
    expect(responseBody.success).toBe(false);
    expect(responseBody.error).toBe('Failed to add Discord setting');
  });

  it('should return 500 for invalid JSON', async () => {
    const discordServerId = 'server_123';
    const request = new Request('http://example.com/discord-settings/server_123', {
      method: 'POST',
      body: '{"invalid_json',
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await AddDiscordSetting(request, discordServerId, localEnv);
    const responseData = await response.json() as any;

    expect(response.status).toBe(500);
    expect(responseData.success).toBe(false);
    expect(responseData.error).toMatch('Internal Server Error');
  });
});