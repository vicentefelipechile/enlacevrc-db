/**
 * @file        test/profile/get.spec.ts
 * @author      vicentefelipechile
 * @description Unit tests for the GetProfile function.
 */

import { env } from 'cloudflare:test';
import { describe, it, expect, vi } from 'vitest';
import { GetProfile } from '../../src/profile/get';

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

describe('GetProfile Handler', () => {
  it('should return a profile successfully by VRChat ID', async () => {
    const profileId = 'usr_123';
    const mockProfile = { 
      vrchat_id: profileId, 
      discord_id: 'discord_456', 
      vrchat_name: 'Test User',
      added_at: new Date(),
      updated_at: new Date(),
      is_banned: 0,
      banned_at: null,
      banned_reason: null,
      is_verified: 1,
      verified_at: new Date()
    };
    
    mockDb.first.mockResolvedValue(mockProfile);

    const response = await GetProfile(profileId, localEnv);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(200);
    expect(responseBody.success).toBe(true);
    expect(responseBody.data.vrchat_id).toBe(profileId);
    expect(responseBody.data.is_banned).toBe(false); // Converted from 0 to false
    expect(responseBody.data.is_verified).toBe(true); // Converted from 1 to true
    expect(mockDb.prepare).toHaveBeenCalledWith('SELECT * FROM profiles WHERE vrchat_id = ?');
    expect(mockDb.bind).toHaveBeenCalledWith(profileId);
  });

  it('should return a profile by Discord ID if VRChat ID not found', async () => {
    const profileId = 'discord_456';
    const mockProfile = { 
      vrchat_id: 'usr_123', 
      discord_id: profileId, 
      vrchat_name: 'Test User',
      added_at: new Date(),
      updated_at: new Date(),
      is_banned: 0,
      banned_at: null,
      banned_reason: null,
      is_verified: 0,
      verified_at: null
    };
    
    // First call (VRChat ID) returns null, second call (Discord ID) returns profile
    mockDb.first.mockResolvedValueOnce(null).mockResolvedValueOnce(mockProfile);

    const response = await GetProfile(profileId, localEnv);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(200);
    expect(responseBody.success).toBe(true);
    expect(responseBody.data.discord_id).toBe(profileId);
    expect(responseBody.data.is_banned).toBe(false);
    expect(responseBody.data.is_verified).toBe(false);
    expect(mockDb.prepare).toHaveBeenCalledWith('SELECT * FROM profiles WHERE vrchat_id = ?');
    expect(mockDb.prepare).toHaveBeenCalledWith('SELECT * FROM profiles WHERE discord_id = ?');
  });

  it('should return 404 if profile is not found by either ID', async () => {
    const profileId = 'usr_not_found';
    mockDb.first.mockResolvedValue(null);

    const response = await GetProfile(profileId, localEnv);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(404);
    expect(responseBody.success).toBe(false);
    expect(responseBody.error).toBe('Profile not found');
  });

  it('should return 500 on database error', async () => {
    const profileId = 'usr_123';
    const errorMessage = 'Database connection failed';
    mockDb.first.mockRejectedValue(new Error(errorMessage));

    const response = await GetProfile(profileId, localEnv);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(500);
    expect(responseBody.success).toBe(false);
    expect(responseBody.error).toBe('Internal Server Error');
  });
});
