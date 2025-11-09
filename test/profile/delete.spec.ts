/**
 * @file        test/profile/delete.spec.ts
 * @author      vicentefelipechile
 * @description Unit tests for the DeleteProfile function.
 */

import { env } from 'cloudflare:test';
import { describe, it, expect, vi } from 'vitest';
import { DeleteProfile } from '../../src/profile/delete';

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
  run: vi.fn(),
};

const localEnv = { ...env, DB: mockDb as any };

// =================================================================================================
// Test Suite
// =================================================================================================

describe('DeleteProfile Handler', () => {
  const mockUserId = 'usr_123e4567-e89b-12d3-a456-426614174000';

  it('should delete a profile successfully by Discord ID', async () => {
    const profileId = 'discord_123';
    const existingProfile = { 
      profile_id: 'prf_123e4567-e89b-12d3-a456-426614174000',
      discord_id: profileId, 
      vrchat_id: 'usr_abc', 
      vrchat_name: 'Test User',
      added_at: new Date(),
      updated_at: new Date(),
      created_by: 'stf_creator',
      is_banned: 0, // This should be 0 (false) to allow deletion
      banned_at: null,
      banned_reason: null,
      banned_by: null,
      is_verified: 1,
      verification_id: 1,
      verified_at: new Date(),
      verified_from: null,
      verified_by: null
    };

    mockDb.first.mockResolvedValue(existingProfile);
    mockDb.run.mockResolvedValue({ success: true });

    const response = await DeleteProfile(profileId, localEnv, mockUserId);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(200);
    expect(responseBody).toEqual({ success: true, message: 'Profile deleted successfully' });
    expect(mockDb.prepare).toHaveBeenCalledWith('SELECT * FROM profiles WHERE discord_id = ?');
    expect(mockDb.bind).toHaveBeenCalledWith(profileId);
    expect(mockDb.prepare).toHaveBeenCalledWith('DELETE FROM profiles WHERE vrchat_id = ? OR discord_id = ?');
    expect(mockDb.bind).toHaveBeenCalledWith(existingProfile.vrchat_id, existingProfile.discord_id);
  });

  it('should delete a profile successfully by VRChat ID', async () => {
    const profileId = 'usr_123';
    const existingProfile = { 
      profile_id: 'prf_123e4567-e89b-12d3-a456-426614174000',
      discord_id: 'discord_456', 
      vrchat_id: profileId, 
      vrchat_name: 'Test User',
      is_banned: 0 // Ensure user is not banned
    };

    // First call (Discord ID) returns null, second call (VRChat ID) returns profile
    mockDb.first.mockResolvedValueOnce(null).mockResolvedValueOnce(existingProfile);
    mockDb.run.mockResolvedValue({ success: true });

    const response = await DeleteProfile(profileId, localEnv, mockUserId);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(200);
    expect(responseBody).toEqual({ success: true, message: 'Profile deleted successfully' });
    expect(mockDb.prepare).toHaveBeenCalledWith('SELECT * FROM profiles WHERE discord_id = ?');
    expect(mockDb.prepare).toHaveBeenCalledWith('SELECT * FROM profiles WHERE vrchat_id = ?');
    expect(mockDb.bind).toHaveBeenCalledWith(profileId);
  });

  it('should return 404 if the profile does not exist', async () => {
    const profileId = 'non_existent_id';

    mockDb.first.mockResolvedValue(null);

    const response = await DeleteProfile(profileId, localEnv, mockUserId);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(404);
    expect(responseBody).toEqual({ success: false, error: 'Profile not found' });
  });

  it('should return 403 for banned users', async () => {
    const profileId = 'discord_456';
    const bannedProfile = { 
      profile_id: 'prf_123e4567-e89b-12d3-a456-426614174000',
      discord_id: profileId, 
      vrchat_id: 'usr_def', 
      vrchat_name: 'Banned User',
      is_banned: 1 // User is banned
    };

    mockDb.first.mockResolvedValue(bannedProfile);

    const response = await DeleteProfile(profileId, localEnv, mockUserId);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(403);
    expect(responseBody).toEqual({ success: false, error: 'Banned users cannot delete their profile' });
  });

  it('should return 500 if database deletion fails', async () => {
    const profileId = 'discord_456';
    const existingProfile = { 
      profile_id: 'prf_123e4567-e89b-12d3-a456-426614174000',
      discord_id: profileId, 
      vrchat_id: 'usr_def', 
      vrchat_name: 'Another User',
      is_banned: 0
    };

    mockDb.first.mockResolvedValue(existingProfile);
    mockDb.run.mockResolvedValue({ success: false });

    const response = await DeleteProfile(profileId, localEnv, mockUserId);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(500);
    expect(responseBody).toEqual({ success: false, error: 'Failed to delete profile' });
  });

  it('should return 500 for an unexpected server error', async () => {
    const profileId = 'discord_789';
    const errorMessage = 'Database connection lost';

    mockDb.first.mockRejectedValue(new Error(errorMessage));

    const response = await DeleteProfile(profileId, localEnv, mockUserId);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(500);
    expect(responseBody).toEqual({ success: false, error: 'Internal Server Error' });
  });
});