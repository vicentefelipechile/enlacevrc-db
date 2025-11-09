/**
 * @file        test/discord/list.spec.ts
 * @author      vicentefelipechile
 * @description Unit tests for the ListDiscordSettings function.
 */

import { env } from 'cloudflare:test';
import { describe, it, expect, vi } from 'vitest';
import { ListDiscordSettings } from '../../src/discord/list';

// Mock LogIt function
vi.mock('../../src/loglevel', () => ({
  LogIt: vi.fn(),
  LogLevel: {
    INFO: 3,
    WARNING: 4,
    ERROR: 5,
  }
}));

// =================================================================================================
// Mock Setup
// =================================================================================================

const mockDb = {
  prepare: vi.fn().mockReturnThis(),
  bind: vi.fn().mockReturnThis(),
  all: vi.fn(),
};

const localEnv = { ...env, DB: mockDb as any };

// =================================================================================================
// Test Suite
// =================================================================================================

describe('ListDiscordSettings Handler', () => {
  const mockUserId = 'stf_123e4567-e89b-12d3-a456-426614174000';

  it('should return all Discord settings successfully without filters', async () => {
    const testDate = new Date().toISOString();
    const mockSettings = [
      { 
        discord_setting_id: 'dst_123e4567-e89b-12d3-a456-426614174000',
        discord_server_id: '123456789', 
        setting_key: 'welcome_message', 
        setting_value: 'Welcome!',
        created_at: testDate,
        updated_at: testDate,
        updated_by: 'stf_updater',
      },
      { 
        discord_setting_id: 'dst_223e4567-e89b-12d3-a456-426614174001',
        discord_server_id: '987654321', 
        setting_key: 'prefix', 
        setting_value: '!',
        created_at: testDate,
        updated_at: testDate,
        updated_by: 'stf_updater',
      }
    ];
    
    mockDb.all.mockResolvedValue({ results: mockSettings });

    const request = new Request('http://localhost/discord-settings/list');
    const response = await ListDiscordSettings(request, localEnv, mockUserId);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(200);
    expect(responseBody.success).toBe(true);
    expect(responseBody.count).toBe(2);
    expect(responseBody.data).toHaveLength(2);
    expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('SELECT * FROM discord_setting WHERE 1=1'));
  });

  it('should return Discord settings with limit parameter', async () => {
    const testDate = new Date().toISOString();
    const mockSettings = [
      { 
        discord_setting_id: 'dst_123e4567-e89b-12d3-a456-426614174000',
        discord_server_id: '123456789', 
        setting_key: 'welcome_message', 
        setting_value: 'Welcome!',
        created_at: testDate,
        updated_at: testDate,
        updated_by: 'stf_updater',
      }
    ];
    
    mockDb.all.mockResolvedValue({ results: mockSettings });

    const request = new Request('http://localhost/discord-settings/list?limit=1');
    const response = await ListDiscordSettings(request, localEnv, mockUserId);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(200);
    expect(responseBody.success).toBe(true);
    expect(responseBody.count).toBe(1);
    expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('LIMIT ?'));
    expect(mockDb.bind).toHaveBeenCalledWith(1);
  });

  it('should return Discord settings with date filters', async () => {
    const testDate = new Date().toISOString();
    const mockSettings = [
      { 
        discord_setting_id: 'dst_123e4567-e89b-12d3-a456-426614174000',
        discord_server_id: '123456789', 
        setting_key: 'welcome_message', 
        setting_value: 'Welcome!',
        created_at: testDate,
        updated_at: testDate,
        updated_by: 'stf_updater',
      }
    ];
    
    mockDb.all.mockResolvedValue({ results: mockSettings });

    const startDate = '2024-01-01';
    const endDate = '2024-12-31';
    const request = new Request(`http://localhost/discord-settings/list?start_date=${startDate}&end_date=${endDate}`);
    const response = await ListDiscordSettings(request, localEnv, mockUserId);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(200);
    expect(responseBody.success).toBe(true);
    expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('created_at >= ?'));
    expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('created_at <= ?'));
    expect(mockDb.bind).toHaveBeenCalledWith(startDate, endDate);
  });

  it('should return Discord settings with created_by filter', async () => {
    const testDate = new Date().toISOString();
    const createdBy = 'stf_updater';
    const mockSettings = [
      { 
        discord_setting_id: 'dst_123e4567-e89b-12d3-a456-426614174000',
        discord_server_id: '123456789', 
        setting_key: 'welcome_message', 
        setting_value: 'Welcome!',
        created_at: testDate,
        updated_at: testDate,
        updated_by: createdBy,
      }
    ];
    
    mockDb.all.mockResolvedValue({ results: mockSettings });

    const request = new Request(`http://localhost/discord-settings/list?created_by=${createdBy}`);
    const response = await ListDiscordSettings(request, localEnv, mockUserId);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(200);
    expect(responseBody.success).toBe(true);
    expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('updated_by = ?'));
    expect(mockDb.bind).toHaveBeenCalledWith(createdBy);
  });

  it('should return error for invalid limit parameter', async () => {
    const request = new Request('http://localhost/discord-settings/list?limit=invalid');
    const response = await ListDiscordSettings(request, localEnv, mockUserId);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(400);
    expect(responseBody.success).toBe(false);
    expect(responseBody.error).toContain('Invalid limit parameter');
  });

  it('should return error for negative limit parameter', async () => {
    const request = new Request('http://localhost/discord-settings/list?limit=-1');
    const response = await ListDiscordSettings(request, localEnv, mockUserId);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(400);
    expect(responseBody.success).toBe(false);
    expect(responseBody.error).toContain('Invalid limit parameter');
  });

  it('should return empty array when no Discord settings found', async () => {
    mockDb.all.mockResolvedValue({ results: [] });

    const request = new Request('http://localhost/discord-settings/list');
    const response = await ListDiscordSettings(request, localEnv, mockUserId);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(200);
    expect(responseBody.success).toBe(true);
    expect(responseBody.count).toBe(0);
    expect(responseBody.data).toEqual([]);
  });

  it('should handle database errors gracefully', async () => {
    mockDb.all.mockRejectedValue(new Error('Database error'));

    const request = new Request('http://localhost/discord-settings/list');
    const response = await ListDiscordSettings(request, localEnv, mockUserId);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(500);
    expect(responseBody.success).toBe(false);
    expect(responseBody.error).toBe('Internal Server Error');
  });
});
