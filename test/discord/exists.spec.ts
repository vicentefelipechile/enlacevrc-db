/**
 * @file        test/discord/exists.spec.ts
 * @author      vicentefelipechile
 * @description Unit tests for the DiscordServerExists function.
 */

import { env } from 'cloudflare:test';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DiscordServerExists } from '../../src/discord/exists';

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

describe('DiscordServerExists Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return true when discord server exists', async () => {
    const discordServerId = 'server_123';

    mockDb.first.mockResolvedValue({ '1': 1 });

    const response = await DiscordServerExists(discordServerId, localEnv);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(200);
    expect(responseBody).toEqual({ success: true, data: { exists: true } });
    expect(mockDb.prepare).toHaveBeenCalledWith('SELECT 1 FROM discord_server WHERE server_id = ? LIMIT 1');
    expect(mockDb.bind).toHaveBeenCalledWith(discordServerId);
  });

  it('should return false when discord server does not exist', async () => {
    const discordServerId = 'server_999';

    mockDb.first.mockResolvedValue(null);

    const response = await DiscordServerExists(discordServerId, localEnv);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(200);
    expect(responseBody).toEqual({ success: true, data: { exists: false } });
    expect(mockDb.prepare).toHaveBeenCalledWith('SELECT 1 FROM discord_server WHERE server_id = ? LIMIT 1');
    expect(mockDb.bind).toHaveBeenCalledWith(discordServerId);
  });

  it('should return 400 for missing discord_server_id', async () => {
    const discordServerId = '';

    const response = await DiscordServerExists(discordServerId, localEnv);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(400);
    expect(responseBody).toEqual({ success: false, error: 'Missing required fields: discord_server_id' });
    expect(mockDb.prepare).not.toHaveBeenCalled();
    expect(mockDb.bind).not.toHaveBeenCalled();
  });

  it('should return 500 when database throws an unexpected error', async () => {
    const discordServerId = 'server_123';

    mockDb.first.mockRejectedValue(new Error('Database connection failed'));

    const response = await DiscordServerExists(discordServerId, localEnv);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(500);
    expect(responseBody).toEqual({ success: false, error: 'Internal Server Error' });
  });

  it('should handle server IDs with special characters', async () => {
    const discordServerId = 'server_123!@#$%';

    mockDb.first.mockResolvedValue({ '1': 1 });

    const response = await DiscordServerExists(discordServerId, localEnv);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(200);
    expect(responseBody).toEqual({ success: true, data: { exists: true } });
    expect(mockDb.bind).toHaveBeenCalledWith(discordServerId);
  });

  it('should handle very long server IDs', async () => {
    const discordServerId = 'server_' + '1'.repeat(1000);

    mockDb.first.mockResolvedValue(null);

    const response = await DiscordServerExists(discordServerId, localEnv);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(200);
    expect(responseBody).toEqual({ success: true, data: { exists: false } });
    expect(mockDb.bind).toHaveBeenCalledWith(discordServerId);
  });

  it('should return 500 for non-Error exceptions', async () => {
    const discordServerId = 'server_123';

    mockDb.first.mockRejectedValue('String error');

    const response = await DiscordServerExists(discordServerId, localEnv);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(500);
    expect(responseBody).toEqual({ success: false, error: 'Internal Server Error' });
  });

  it('should handle whitespace-only server IDs as invalid', async () => {
    const discordServerId = '   ';

    mockDb.first.mockResolvedValue(null);

    const response = await DiscordServerExists(discordServerId, localEnv);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(200);
    expect(responseBody).toEqual({ success: true, data: { exists: false } });
    expect(mockDb.prepare).toHaveBeenCalled();
  });

  it('should handle numeric server IDs', async () => {
    const discordServerId = '1234567890';

    mockDb.first.mockResolvedValue({ '1': 1 });

    const response = await DiscordServerExists(discordServerId, localEnv);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(200);
    expect(responseBody).toEqual({ success: true, data: { exists: true } });
    expect(mockDb.bind).toHaveBeenCalledWith(discordServerId);
  });

  it('should handle database timeout errors', async () => {
    const discordServerId = 'server_123';

    mockDb.first.mockRejectedValue(new Error('Query timeout'));

    const response = await DiscordServerExists(discordServerId, localEnv);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(500);
    expect(responseBody).toEqual({ success: false, error: 'Internal Server Error' });
  });

  it('should return consistent results for same server ID called multiple times', async () => {
    const discordServerId = 'server_123';

    mockDb.first.mockResolvedValue({ '1': 1 });

    const response1 = await DiscordServerExists(discordServerId, localEnv);
    const responseBody1 = await response1.json() as any;

    const response2 = await DiscordServerExists(discordServerId, localEnv);
    const responseBody2 = await response2.json() as any;

    expect(responseBody1).toEqual(responseBody2);
    expect(mockDb.prepare).toHaveBeenCalledTimes(2);
    expect(mockDb.bind).toHaveBeenCalledTimes(2);
  });
});
