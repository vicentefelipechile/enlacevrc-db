/**
 * @file        test/discord/get.spec.ts
 * @author      vicentefelipechile
 * @description Unit tests for the GetDiscordSetting function.
 */

import { env } from 'cloudflare:test';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetDiscordSetting } from '../../src/discord/get';

// =================================================================================================
// Mock Setup
// =================================================================================================

const mockDb = {
  prepare: vi.fn().mockReturnThis(),
  bind: vi.fn().mockReturnThis(),
  first: vi.fn(),
  all: vi.fn(),
};

const localEnv = { ...env, DB: mockDb as any };

// =================================================================================================
// Test Suite
// =================================================================================================

describe('GetDiscordSetting Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it('should return a discord setting successfully', async () => {
    const settingKey = 'prefix';
    const discordServerId = 'server_123';
    const mockSetting = { 
      setting_key: 'prefix', 
      setting_value: '!'
    };
    const request = new Request(`http://example.com/discord-settings/${discordServerId}?setting_key=${settingKey}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    mockDb.first.mockResolvedValue(mockSetting);

    const response = await GetDiscordSetting(request, discordServerId, localEnv);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(200);
    expect(responseBody).toEqual({ success: true, data: { [settingKey]: mockSetting.setting_value } });
    expect(mockDb.prepare).toHaveBeenCalledWith('SELECT setting_value FROM discord_settings WHERE discord_server_id = ? AND setting_key = ?');
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
    expect(responseBody).toEqual({ success: false, error: 'Discord setting not found' });
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
    expect(responseBody).toEqual({ success: false, error: 'Missing required query parameter: setting_key is required' });
  });

  it('should return all settings when getallsettings=true', async () => {
    const discordServerId = 'server_123';
    const mockSettings = [
      {
        setting_key: 'prefix',
        setting_value: '!'
      },
      {
        setting_key: 'welcome_channel',
        setting_value: '123456789'
      }
    ];
    const request = new Request(`http://example.com/discord-settings/${discordServerId}?getallsettings=true`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    mockDb.all.mockResolvedValue({ success: true, results: mockSettings });

    const response = await GetDiscordSetting(request, discordServerId, localEnv);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(200);
    expect(responseBody).toEqual({
      success: true,
      data: {
        'prefix': '!',
        'welcome_channel': '123456789'
      }
    });
    expect(mockDb.prepare).toHaveBeenCalledWith('SELECT setting_key, setting_value FROM discord_settings WHERE discord_server_id = ?');
    expect(mockDb.bind).toHaveBeenCalledWith(discordServerId);
  });

  it('should return 404 when no settings found with getallsettings=true', async () => {
    const discordServerId = 'server_999';
    const request = new Request(`http://example.com/discord-settings/${discordServerId}?getallsettings=true`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    mockDb.all.mockResolvedValue({ success: true, results: [] });

    const response = await GetDiscordSetting(request, discordServerId, localEnv);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(404);
    expect(responseBody).toEqual({ success: false, error: 'No Discord settings found for this server' });
  });

  it('should return 404 when database operation fails with getallsettings=true', async () => {
    const discordServerId = 'server_999';
    const request = new Request(`http://example.com/discord-settings/${discordServerId}?getallsettings=true`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    mockDb.all.mockResolvedValue({ success: false, results: [] });

    const response = await GetDiscordSetting(request, discordServerId, localEnv);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(404);
    expect(responseBody).toEqual({ success: false, error: 'No Discord settings found for this server' });
  });

  it('should return 500 when database throws an unexpected error', async () => {
    const discordServerId = 'server_123';
    const settingKey = 'prefix';
    const request = new Request(`http://example.com/discord-settings/${discordServerId}?setting_key=${settingKey}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    mockDb.first.mockRejectedValue(new Error('Database connection failed'));

    const response = await GetDiscordSetting(request, discordServerId, localEnv);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(500);
    expect(responseBody).toEqual({ success: false, error: 'Internal Server Error' });
  });

  it('should return 500 when database throws an unexpected error with getallsettings=true', async () => {
    const discordServerId = 'server_123';
    const request = new Request(`http://example.com/discord-settings/${discordServerId}?getallsettings=true`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    mockDb.all.mockRejectedValue(new Error('Database connection failed'));

    const response = await GetDiscordSetting(request, discordServerId, localEnv);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(500);
    expect(responseBody).toEqual({ success: false, error: 'Internal Server Error' });
  });

  it('should handle empty string values correctly', async () => {
    const settingKey = 'prefix';
    const discordServerId = 'server_123';
    const mockSetting = { 
      setting_key: 'prefix', 
      setting_value: ''
    };
    const request = new Request(`http://example.com/discord-settings/${discordServerId}?setting_key=${settingKey}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    mockDb.first.mockResolvedValue(mockSetting);

    const response = await GetDiscordSetting(request, discordServerId, localEnv);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(200);
    expect(responseBody).toEqual({ success: true, data: { [settingKey]: '' } });
  });

  it('should handle special characters in setting values', async () => {
    const settingKey = 'prefix';
    const discordServerId = 'server_123';
    const specialValue = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    const mockSetting = { 
      setting_key: 'prefix', 
      setting_value: specialValue
    };
    const request = new Request(`http://example.com/discord-settings/${discordServerId}?setting_key=${settingKey}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    mockDb.first.mockResolvedValue(mockSetting);

    const response = await GetDiscordSetting(request, discordServerId, localEnv);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(200);
    expect(responseBody).toEqual({ success: true, data: { [settingKey]: specialValue } });
  });

  it('should handle URL encoded setting keys', async () => {
    const settingKey = 'welcome%20message';
    const discordServerId = 'server_123';
    const mockSetting = { 
      setting_key: 'welcome message', 
      setting_value: 'Hello World!'
    };
    const request = new Request(`http://example.com/discord-settings/${discordServerId}?setting_key=${settingKey}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    mockDb.first.mockResolvedValue(mockSetting);

    const response = await GetDiscordSetting(request, discordServerId, localEnv);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(200);
    expect(responseBody).toEqual({ success: true, data: { 'welcome message': 'Hello World!' } });
    expect(mockDb.bind).toHaveBeenCalledWith(discordServerId, 'welcome message');
  });

  it('should handle case where getallsettings parameter has different values', async () => {
    const discordServerId = 'server_123';
    const settingKey = 'prefix';
    const mockSetting = { 
      setting_key: 'prefix', 
      setting_value: '!'
    };

    // Test with getallsettings=false (should behave like normal single setting query)
    const requestFalse = new Request(`http://example.com/discord-settings/${discordServerId}?setting_key=${settingKey}&getallsettings=false`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    mockDb.first.mockResolvedValue(mockSetting);

    const responseFalse = await GetDiscordSetting(requestFalse, discordServerId, localEnv);
    const responseBodyFalse = await responseFalse.json() as any;

    expect(responseFalse.status).toBe(200);
    expect(responseBodyFalse).toEqual({ success: true, data: { [settingKey]: '!' } });
    expect(mockDb.prepare).toHaveBeenCalledWith('SELECT setting_value FROM discord_settings WHERE discord_server_id = ? AND setting_key = ?');
  });
});