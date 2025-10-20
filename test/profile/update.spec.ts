/**
 * @file        test/profile/update.spec.ts
 * @author      vicentefelipechile
 * @description Unit tests for the UpdateProfile function.
 */

import { env } from 'cloudflare:test';
import { describe, it, expect, vi } from 'vitest';
import { UpdateProfile } from '../../src/profile/update';

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

  it('should update a profile name successfully', async () => {
    const updateData = { vrchat_name: 'New Name' };
    const request = new Request(`http://example.com/profiles/${profileId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 'Content-Type': 'application/json' },
    });

    mockDb.first.mockResolvedValue({ vrchat_id: profileId });
    mockDb.run.mockResolvedValue({ success: true });

    const response = await UpdateProfile(request, profileId, localEnv);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(200);
    expect(responseBody).toEqual({ success: true, message: 'Profile updated successfully' });
    expect(mockDb.prepare).toHaveBeenCalledWith(`UPDATE profiles SET vrchat_name = ?, updated_at = CURRENT_TIMESTAMP WHERE vrchat_id = ?`);
    expect(mockDb.bind).toHaveBeenCalledWith(updateData.vrchat_name, profileId);
  });

  it('should update verification status successfully', async () => {
    const updateData = { is_verified: true };
    const request = new Request(`http://example.com/profiles/${profileId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 'Content-Type': 'application/json' },
    });

    mockDb.first.mockResolvedValue({ vrchat_id: profileId });
    mockDb.run.mockResolvedValue({ success: true });

    const response = await UpdateProfile(request, profileId, localEnv);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(200);
    expect(responseBody).toEqual({ success: true, message: 'Profile updated successfully' });
    expect(mockDb.prepare).toHaveBeenCalledWith(`UPDATE profiles SET is_verified = ?, verified_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE vrchat_id = ?`);
    expect(mockDb.bind).toHaveBeenCalledWith('1', profileId);
  });

  it('should update ban status successfully', async () => {
    const updateData = { is_banned: true };
    const request = new Request(`http://example.com/profiles/${profileId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 'Content-Type': 'application/json' },
    });

    mockDb.first.mockResolvedValue({ vrchat_id: profileId });
    mockDb.run.mockResolvedValue({ success: true });

    const response = await UpdateProfile(request, profileId, localEnv);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(200);
    expect(responseBody).toEqual({ success: true, message: 'Profile updated successfully' });
    expect(mockDb.prepare).toHaveBeenCalledWith(`UPDATE profiles SET is_banned = ?, banned_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE vrchat_id = ?`);
    expect(mockDb.bind).toHaveBeenCalledWith('1', profileId);
  });

  it('should return 400 if no fields are provided for update', async () => {
    const request = new Request(`http://example.com/profiles/${profileId}`, {
      method: 'PUT',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await UpdateProfile(request, profileId, localEnv);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(400);
    expect(responseBody).toEqual({ success: false, error: 'No fields provided to update' });
  });

  it('should return 404 if the profile to update does not exist', async () => {
    const updateData = { vrchat_name: 'New Name' };
    const request = new Request(`http://example.com/profiles/${profileId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
      headers: { 'Content-Type': 'application/json' },
    });

    mockDb.first.mockResolvedValue(null);

    const response = await UpdateProfile(request, profileId, localEnv);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(404);
    expect(responseBody).toEqual({ success: false, error: 'Profile not found' });
  });

  it('should return 500 on database update failure', async () => {
    const updateData = { vrchat_name: 'New Name' };
    const request = new Request(`http://example.com/profiles/${profileId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
      headers: { 'Content-Type': 'application/json' }
    });

    mockDb.first.mockResolvedValue({ vrchat_id: profileId });
    mockDb.run.mockResolvedValue({ success: false });

    const response = await UpdateProfile(request, profileId, localEnv);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(500);
    expect(responseBody).toEqual({ success: false, error: 'Failed to update profile' });
  });

  it('should return 400 for invalid JSON', async () => {
    const request = new Request(`http://example.com/profiles/${profileId}`, {
      method: 'PUT',
      body: '{"invalid_json',
      headers: { 'Content-Type': 'application/json' }
    });

    const response = await UpdateProfile(request, profileId, localEnv);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(400);
    expect(responseBody).toEqual({ success: false, error: 'Invalid JSON in request body' });
  });

  it('should return 500 for unexpected errors', async () => {
    const updateData = { vrchat_name: 'New Name' };
    const request = new Request(`http://example.com/profiles/${profileId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
      headers: { 'Content-Type': 'application/json' }
    });

    mockDb.first.mockRejectedValue(new Error('Database connection failed'));

    const response = await UpdateProfile(request, profileId, localEnv);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(500);
    expect(responseBody).toEqual({ success: false, error: 'Internal Server Error' });
  });
});
