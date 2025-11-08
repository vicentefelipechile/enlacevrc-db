/**
 * @file        test/profile/update.spec.ts
 * @author      vicentefelipechile
 * @description Unit tests for the UpdateProfile function.
 */

import { env } from 'cloudflare:test';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpdateProfile } from '../../src/profile/update';

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

describe('UpdateProfile Handler', () => {
  const profileId = 'usr_123';
  const staffUserId = 'stf_123e4567-e89b-12d3-a456-426614174000';
  const nonStaffUserId = 'usr_123e4567-e89b-12d3-a456-426614174000';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 400 for unsupported field updates', async () => {
    const updateData = { vrchat_name: 'New Name' }; // This field update is not supported
    const request = new Request(`http://example.com/profiles/${profileId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 'Content-Type': 'application/json' },
    });

    const existingProfile = { 
      profile_id: 'prf_123e4567-e89b-12d3-a456-426614174000',
      vrchat_id: profileId,
      discord_id: 'discord_456',
      vrchat_name: 'Old Name'
    };

    mockDb.first.mockResolvedValue(existingProfile);

    const response = await UpdateProfile(request, profileId, localEnv, staffUserId);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(400);
    expect(responseBody).toEqual({ success: false, error: 'No valid fields provided to update' });
  });

  it('should return 403 for non-staff users', async () => {
    const updateData = { vrchat_name: 'New Name' };
    const request = new Request(`http://example.com/profiles/${profileId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 'Content-Type': 'application/json' },
    });

    const response = await UpdateProfile(request, profileId, localEnv, nonStaffUserId);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(403);
    expect(responseBody).toEqual({ success: false, error: 'Only staff members can update profiles' });
  });

  it('should ban a profile successfully', async () => {
    const updateData = { is_banned: true, banned_reason: 1 };
    const request = new Request(`http://example.com/profiles/${profileId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 'Content-Type': 'application/json' },
    });

    const existingProfile = { 
      profile_id: 'prf_123e4567-e89b-12d3-a456-426614174000',
      vrchat_id: profileId 
    };

    mockDb.first
      .mockResolvedValueOnce(existingProfile) // Profile exists
      .mockResolvedValueOnce({ ban_reason_id: 1 }); // Ban reason exists
    mockDb.run.mockResolvedValue({ success: true });

    const response = await UpdateProfile(request, profileId, localEnv, staffUserId);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(200);
    expect(responseBody).toEqual({ success: true, message: 'Profile banned successfully' });
  });

  it('should return 400 when banning without reason', async () => {
    const updateData = { is_banned: true }; // Missing banned_reason
    const request = new Request(`http://example.com/profiles/${profileId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 'Content-Type': 'application/json' },
    });

    const existingProfile = { 
      profile_id: 'prf_123e4567-e89b-12d3-a456-426614174000',
      vrchat_id: profileId 
    };

    mockDb.first.mockResolvedValue(existingProfile);

    const response = await UpdateProfile(request, profileId, localEnv, staffUserId);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(400);
    expect(responseBody).toEqual({ success: false, error: 'Banned reason is required when banning a profile' });
  });

  it('should return 400 when trying to ban and verify at the same time', async () => {
    const updateData = { is_banned: true, is_verified: true, banned_reason: 1 };
    const request = new Request(`http://example.com/profiles/${profileId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 'Content-Type': 'application/json' },
    });

    const response = await UpdateProfile(request, profileId, localEnv, staffUserId);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(400);
    expect(responseBody).toEqual({ success: false, error: 'Cannot ban and verify a profile at the same time. Choose one action.' });
  });

  it('should return 400 if no fields are provided for update', async () => {
    const request = new Request(`http://example.com/profiles/${profileId}`, {
      method: 'PUT',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await UpdateProfile(request, profileId, localEnv, staffUserId);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(400);
    expect(responseBody).toEqual({ success: false, error: 'No fields provided to update' });
  });

  it('should return 404 if the profile to update does not exist', async () => {
    const updateData = { is_banned: true, banned_reason: 1 };
    const request = new Request(`http://example.com/profiles/${profileId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
      headers: { 'Content-Type': 'application/json' },
    });

    mockDb.first.mockResolvedValue(null);

    const response = await UpdateProfile(request, profileId, localEnv, staffUserId);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(404);
    expect(responseBody).toEqual({ success: false, error: 'Profile not found' });
  });

  it('should return 409 on database ban operation failure', async () => {
    const updateData = { is_banned: true, banned_reason: 1 };
    const request = new Request(`http://example.com/profiles/${profileId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
      headers: { 'Content-Type': 'application/json' }
    });

    const existingProfile = { 
      profile_id: 'prf_123e4567-e89b-12d3-a456-426614174000',
      vrchat_id: profileId 
    };

    mockDb.first
      .mockResolvedValueOnce(existingProfile) // Profile exists
      .mockResolvedValueOnce({ ban_reason_id: 1 }); // Ban reason exists
    mockDb.run.mockResolvedValue({ success: false }); // Database operation fails

    const response = await UpdateProfile(request, profileId, localEnv, staffUserId);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(409);
    expect(responseBody).toEqual({ success: false, error: 'Failed to ban profile' });
  });

  it('should return 400 for invalid JSON', async () => {
    const request = new Request(`http://example.com/profiles/${profileId}`, {
      method: 'PUT',
      body: '{"invalid_json',
      headers: { 'Content-Type': 'application/json' }
    });

    const response = await UpdateProfile(request, profileId, localEnv, staffUserId);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(400);
    expect(responseBody).toEqual({ success: false, error: 'Invalid JSON in request body' });
  });

  it('should return 500 for unexpected errors', async () => {
    const updateData = { is_banned: true, banned_reason: 1 };
    const request = new Request(`http://example.com/profiles/${profileId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
      headers: { 'Content-Type': 'application/json' }
    });

    mockDb.first.mockRejectedValue(new Error('Database connection failed'));

    const response = await UpdateProfile(request, profileId, localEnv, staffUserId);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(500);
    expect(responseBody).toEqual({ success: false, error: 'Internal Server Error' });
  });
});
