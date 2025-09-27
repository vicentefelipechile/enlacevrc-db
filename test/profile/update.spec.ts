import { env } from 'cloudflare:test';
import { describe, it, expect, vi } from 'vitest';
import { UpdateProfile } from '../../src/profile/update';

// Mock the D1 database
const mockDb = {
  prepare: vi.fn().mockReturnThis(),
  bind: vi.fn().mockReturnThis(),
  first: vi.fn(),
  run: vi.fn(),
};

const localEnv = { ...env, enlacevrc_db: mockDb as any };

describe('UpdateProfile Handler', () => {
  const profileId = 'usr_123';

  it('should update a profile name successfully', async () => {
    const updateData = { name: 'New Name' };
    const request = new Request(`http://example.com/profiles/${profileId}`,
      {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 'Content-Type': 'application/json' },
      });

    mockDb.first.mockResolvedValue({ vrchat_id: profileId }); // Profile exists
    mockDb.run.mockResolvedValue({ success: true });

    const response = await UpdateProfile(request, profileId, localEnv);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true, message: 'Profile updated successfully.' });
    expect(mockDb.prepare).toHaveBeenCalledWith(`UPDATE profiles SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE vrchat_id = ?`);
    expect(mockDb.bind).toHaveBeenCalledWith(updateData.name, profileId);
  });

  it('should return 400 if no fields are provided for update', async () => {
    const request = new Request(`http://example.com/profiles/${profileId}`,
    {
      method: 'PUT',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await UpdateProfile(request, profileId, localEnv);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ success: false, error: 'At least one field (name or discord_id) must be provided for update.' });
  });

  it('should return 404 if the profile to update does not exist', async () => {
    const updateData = { name: 'New Name' };
    const request = new Request(`http://example.com/profiles/${profileId}`,
    {
      method: 'PUT',
      body: JSON.stringify(updateData),
      headers: { 'Content-Type': 'application/json' },
    });

    mockDb.first.mockResolvedValue(null); // Profile does not exist

    const response = await UpdateProfile(request, profileId, localEnv);

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ success: false, error: `Profile with vrchat_id ${profileId} not found.` });
  });

  it('should return 500 on database update failure', async () => {
    const updateData = { name: 'New Name' };
    const request = new Request(`http://example.com/profiles/${profileId}`,
    {
      method: 'PUT',
      body: JSON.stringify(updateData),
      headers: { 'Content-Type': 'application/json' },
    });

    mockDb.first.mockResolvedValue({ vrchat_id: profileId }); // Profile exists
    mockDb.run.mockResolvedValue({ success: false }); // DB update fails

    const response = await UpdateProfile(request, profileId, localEnv);

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ success: false, error: 'Failed to update profile.' });
  });
});
