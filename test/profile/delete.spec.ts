/**
 * @file        test/profile/delete.spec.ts
 * @author      vicentefelipechile
 * @description Unit tests for the DeleteProfile function.
 */

import { env } from 'cloudflare:test';
import { describe, it, expect, vi } from 'vitest';
import { DeleteProfile } from '../../src/profile/delete';

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
  it('should delete a profile successfully by Discord ID', async () => {
    const profileId = 'discord_123';
    const existingProfile = { 
      discord_id: profileId, 
      vrchat_id: 'usr_abc', 
      vrchat_name: 'Test User',
      added_at: new Date(),
      updated_at: new Date(),
      is_banned: false,
      banned_at: null,
      banned_reason: null,
      is_verified: false,
      verified_at: null
    };

    mockDb.first.mockResolvedValue(existingProfile);
    mockDb.run.mockResolvedValue({ success: true });

    const response = await DeleteProfile(profileId, localEnv);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(200);
    expect(responseBody).toEqual({ success: true, message: 'Profile deleted successfully.' });
    expect(mockDb.prepare).toHaveBeenCalledWith('SELECT * FROM profiles WHERE discord_id = ?');
    expect(mockDb.bind).toHaveBeenCalledWith(profileId);
    expect(mockDb.prepare).toHaveBeenCalledWith('DELETE FROM profiles WHERE vrchat_id = ? OR discord_id = ?');
    expect(mockDb.bind).toHaveBeenCalledWith(existingProfile.vrchat_id, existingProfile.discord_id);
  });

  it('should delete a profile successfully by VRChat ID', async () => {
    const profileId = 'usr_123';
    const existingProfile = { 
      discord_id: 'discord_456', 
      vrchat_id: profileId, 
      vrchat_name: 'Test User'
    };

    // First call (Discord ID) returns null, second call (VRChat ID) returns profile
    mockDb.first.mockResolvedValueOnce(null).mockResolvedValueOnce(existingProfile);
    mockDb.run.mockResolvedValue({ success: true });

    const response = await DeleteProfile(profileId, localEnv);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(200);
    expect(responseBody).toEqual({ success: true, message: 'Profile deleted successfully.' });
    expect(mockDb.prepare).toHaveBeenCalledWith('SELECT * FROM profiles WHERE discord_id = ?');
    expect(mockDb.prepare).toHaveBeenCalledWith('SELECT * FROM profiles WHERE vrchat_id = ?');
    expect(mockDb.bind).toHaveBeenCalledWith(profileId);
  });

  it('should return 404 if the profile does not exist', async () => {
    const profileId = 'non_existent_id';

    mockDb.first.mockResolvedValue(null);

    const response = await DeleteProfile(profileId, localEnv);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(404);
    expect(responseBody).toEqual({ success: false, error: 'Profile not found.' });
  });

  it('should return 500 if database deletion fails', async () => {
    const profileId = 'discord_456';
    const existingProfile = { 
      discord_id: profileId, 
      vrchat_id: 'usr_def', 
      vrchat_name: 'Another User' 
    };

    mockDb.first.mockResolvedValue(existingProfile);
    mockDb.run.mockResolvedValue({ success: false });

    const response = await DeleteProfile(profileId, localEnv);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(500);
    expect(responseBody).toEqual({ success: false, error: 'Failed to delete profile.' });
  });

  it('should return 500 for an unexpected server error', async () => {
    const profileId = 'discord_789';
    const errorMessage = 'Database connection lost';

    mockDb.first.mockRejectedValue(new Error(errorMessage));

    const response = await DeleteProfile(profileId, localEnv);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(500);
    expect(responseBody).toEqual({ success: false, error: 'Internal Server Error' });
  });
});