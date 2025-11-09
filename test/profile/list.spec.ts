/**
 * @file        test/profile/list.spec.ts
 * @author      vicentefelipechile
 * @description Unit tests for the ListProfiles function.
 */

import { env } from 'cloudflare:test';
import { describe, it, expect, vi } from 'vitest';
import { ListProfiles } from '../../src/profile/list';

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

describe('ListProfiles Handler', () => {
  const mockUserId = 'stf_123e4567-e89b-12d3-a456-426614174000';

  it('should return all profiles successfully without filters', async () => {
    const testDate = new Date().toISOString();
    const mockProfiles = [
      { 
        profile_id: 'prf_123e4567-e89b-12d3-a456-426614174000',
        vrchat_id: 'usr_123', 
        discord_id: 'discord_456', 
        vrchat_name: 'Test User 1',
        added_at: testDate,
        updated_at: testDate,
        created_by: 'stf_creator',
        is_banned: 0,
        is_verified: 1,
        verification_id: 1,
      },
      { 
        profile_id: 'prf_223e4567-e89b-12d3-a456-426614174001',
        vrchat_id: 'usr_124', 
        discord_id: 'discord_457', 
        vrchat_name: 'Test User 2',
        added_at: testDate,
        updated_at: testDate,
        created_by: 'stf_creator',
        is_banned: 1,
        is_verified: 0,
        verification_id: 1,
      }
    ];
    
    mockDb.all.mockResolvedValue({ results: mockProfiles });

    const request = new Request('http://localhost/profiles/list');
    const response = await ListProfiles(request, localEnv, mockUserId);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(200);
    expect(responseBody.success).toBe(true);
    expect(responseBody.count).toBe(2);
    expect(responseBody.data).toHaveLength(2);
    expect(responseBody.data[0].is_banned).toBe(false);
    expect(responseBody.data[0].is_verified).toBe(true);
    expect(responseBody.data[1].is_banned).toBe(true);
    expect(responseBody.data[1].is_verified).toBe(false);
    expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('SELECT * FROM profiles WHERE 1=1'));
  });

  it('should return profiles with limit parameter', async () => {
    const testDate = new Date().toISOString();
    const mockProfiles = [
      { 
        profile_id: 'prf_123e4567-e89b-12d3-a456-426614174000',
        vrchat_id: 'usr_123', 
        discord_id: 'discord_456', 
        vrchat_name: 'Test User 1',
        added_at: testDate,
        updated_at: testDate,
        created_by: 'stf_creator',
        is_banned: 0,
        is_verified: 1,
        verification_id: 1,
      }
    ];
    
    mockDb.all.mockResolvedValue({ results: mockProfiles });

    const request = new Request('http://localhost/profiles/list?limit=1');
    const response = await ListProfiles(request, localEnv, mockUserId);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(200);
    expect(responseBody.success).toBe(true);
    expect(responseBody.count).toBe(1);
    expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('LIMIT ?'));
    expect(mockDb.bind).toHaveBeenCalledWith(1);
  });

  it('should return profiles with date filters', async () => {
    const testDate = new Date().toISOString();
    const mockProfiles = [
      { 
        profile_id: 'prf_123e4567-e89b-12d3-a456-426614174000',
        vrchat_id: 'usr_123', 
        discord_id: 'discord_456', 
        vrchat_name: 'Test User 1',
        added_at: testDate,
        updated_at: testDate,
        created_by: 'stf_creator',
        is_banned: 0,
        is_verified: 1,
        verification_id: 1,
      }
    ];
    
    mockDb.all.mockResolvedValue({ results: mockProfiles });

    const startDate = '2024-01-01';
    const endDate = '2024-12-31';
    const request = new Request(`http://localhost/profiles/list?start_date=${startDate}&end_date=${endDate}`);
    const response = await ListProfiles(request, localEnv, mockUserId);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(200);
    expect(responseBody.success).toBe(true);
    expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('added_at >= ?'));
    expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('added_at <= ?'));
    expect(mockDb.bind).toHaveBeenCalledWith(startDate, endDate);
  });

  it('should return profiles with created_by filter', async () => {
    const testDate = new Date().toISOString();
    const createdBy = 'stf_creator';
    const mockProfiles = [
      { 
        profile_id: 'prf_123e4567-e89b-12d3-a456-426614174000',
        vrchat_id: 'usr_123', 
        discord_id: 'discord_456', 
        vrchat_name: 'Test User 1',
        added_at: testDate,
        updated_at: testDate,
        created_by: createdBy,
        is_banned: 0,
        is_verified: 1,
        verification_id: 1,
      }
    ];
    
    mockDb.all.mockResolvedValue({ results: mockProfiles });

    const request = new Request(`http://localhost/profiles/list?created_by=${createdBy}`);
    const response = await ListProfiles(request, localEnv, mockUserId);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(200);
    expect(responseBody.success).toBe(true);
    expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('created_by = ?'));
    expect(mockDb.bind).toHaveBeenCalledWith(createdBy);
  });

  it('should return error for invalid limit parameter', async () => {
    const request = new Request('http://localhost/profiles/list?limit=invalid');
    const response = await ListProfiles(request, localEnv, mockUserId);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(400);
    expect(responseBody.success).toBe(false);
    expect(responseBody.error).toContain('Invalid limit parameter');
  });

  it('should return error for negative limit parameter', async () => {
    const request = new Request('http://localhost/profiles/list?limit=-1');
    const response = await ListProfiles(request, localEnv, mockUserId);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(400);
    expect(responseBody.success).toBe(false);
    expect(responseBody.error).toContain('Invalid limit parameter');
  });

  it('should return empty array when no profiles found', async () => {
    mockDb.all.mockResolvedValue({ results: [] });

    const request = new Request('http://localhost/profiles/list');
    const response = await ListProfiles(request, localEnv, mockUserId);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(200);
    expect(responseBody.success).toBe(true);
    expect(responseBody.count).toBe(0);
    expect(responseBody.data).toEqual([]);
  });

  it('should handle database errors gracefully', async () => {
    mockDb.all.mockRejectedValue(new Error('Database error'));

    const request = new Request('http://localhost/profiles/list');
    const response = await ListProfiles(request, localEnv, mockUserId);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(500);
    expect(responseBody.success).toBe(false);
    expect(responseBody.error).toBe('Internal Server Error');
  });
});
