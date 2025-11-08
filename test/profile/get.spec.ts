/**
 * @file        test/profile/get.spec.ts
 * @author      vicentefelipechile
 * @description Unit tests for the GetProfile function.
 */

import { env } from 'cloudflare:test';
import { describe, it, expect, vi } from 'vitest';
import { GetProfile } from '../../src/profile/get';

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
  first: vi.fn(),
};

const localEnv = { ...env, DB: mockDb as any };

// =================================================================================================
// Test Suite
// =================================================================================================

describe('GetProfile Handler', () => {
  const mockUserId = 'stf_123e4567-e89b-12d3-a456-426614174000';

  it('should return a profile successfully by VRChat ID', async () => {
    const profileId = 'usr_123';
    const testDate = new Date().toISOString(); // Use string format
    const mockProfile = { 
      profile_id: 'prf_123e4567-e89b-12d3-a456-426614174000',
      vrchat_id: profileId, 
      discord_id: 'discord_456', 
      vrchat_name: 'Test User',
      added_at: testDate,
      updated_at: testDate,
      created_by: 'stf_creator',
      is_banned: 0,
      banned_at: null,
      banned_reason: null,
      banned_by: null,
      is_verified: 1,
      verification_method: 1,
      verified_at: testDate,
      verified_from: null,
      verified_by: null
    };
    
    mockDb.first.mockResolvedValue(mockProfile);

    const response = await GetProfile(profileId, localEnv, mockUserId);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(200);
    expect(responseBody).toEqual({
      success: true,
      data: {
        ...mockProfile,
        is_banned: false, // Converted from 0 to false
        is_verified: true // Converted from 1 to true
      }
    });
    expect(mockDb.prepare).toHaveBeenCalledWith('SELECT * FROM profiles WHERE vrchat_id = ?');
    expect(mockDb.bind).toHaveBeenCalledWith(profileId);
  });

  it('should return a profile successfully by Discord ID when VRChat ID not found', async () => {
    const profileId = 'discord_456';
    const mockProfile = { 
      profile_id: 'prf_123e4567-e89b-12d3-a456-426614174000',
      vrchat_id: 'usr_123', 
      discord_id: profileId, 
      vrchat_name: 'Test User',
      added_at: new Date(),
      updated_at: new Date(),
      created_by: 'stf_creator',
      is_banned: 0,
      banned_at: null,
      banned_reason: null,
      banned_by: null,
      is_verified: 1,
      verification_method: 1,
      verified_at: new Date(),
      verified_from: null,
      verified_by: null
    };
    
    // First call (VRChat ID) returns null, second call (Discord ID) returns the profile
    mockDb.first
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(mockProfile);

    const response = await GetProfile(profileId, localEnv, mockUserId);
    const responseBody = await response.json() as any;
  });

  it('should return a profile successfully by Discord ID when VRChat ID not found', async () => {
    const profileId = 'discord_456';
    const testDate = new Date().toISOString(); // Use string format
    const mockProfile = { 
      profile_id: 'prf_123e4567-e89b-12d3-a456-426614174000',
      vrchat_id: 'usr_123', 
      discord_id: profileId, 
      vrchat_name: 'Test User',
      added_at: testDate,
      updated_at: testDate,
      created_by: 'stf_creator',
      is_banned: 0,
      banned_at: null,
      banned_reason: null,
      banned_by: null,
      is_verified: 0,
      verification_method: 1,
      verified_at: null,
      verified_from: null,
      verified_by: null
    };
    
    // First call (VRChat ID) returns null, second call (Discord ID) returns profile
    mockDb.first.mockResolvedValueOnce(null).mockResolvedValueOnce(mockProfile);

    const response = await GetProfile(profileId, localEnv, mockUserId);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(200);
    expect(responseBody).toEqual({
      success: true,
      data: {
        ...mockProfile,
        is_banned: false, // Converted from 0 to false
        is_verified: false // Converted from 0 to false
      }
    });
    expect(mockDb.prepare).toHaveBeenCalledWith('SELECT * FROM profiles WHERE vrchat_id = ?');
    expect(mockDb.prepare).toHaveBeenCalledWith('SELECT * FROM profiles WHERE discord_id = ?');
  });

  it('should return 404 if profile is not found by either ID', async () => {
    const profileId = 'usr_not_found';
    mockDb.first.mockResolvedValue(null);

    const response = await GetProfile(profileId, localEnv, mockUserId);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(404);
    expect(responseBody).toEqual({ success: false, error: 'Profile not found' });
  });

  it('should return 500 on database error', async () => {
    const profileId = 'usr_123';
    const errorMessage = 'Database connection failed';
    mockDb.first.mockRejectedValue(new Error(errorMessage));

    const response = await GetProfile(profileId, localEnv, mockUserId);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(500);
    expect(responseBody).toEqual({ success: false, error: 'Internal Server Error' });
  });
});
