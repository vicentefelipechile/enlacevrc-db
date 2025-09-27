import { env } from 'cloudflare:test';
import { describe, it, expect, vi } from 'vitest';
import { GetProfile } from '../../src/profile/get';

// Mock the D1 database
const mockDb = {
  prepare: vi.fn().mockReturnThis(),
  bind: vi.fn().mockReturnThis(),
  first: vi.fn(),
};

const localEnv = { ...env, enlacevrc_db: mockDb as any };

describe('GetProfile Handler', () => {
  it('should return a profile successfully', async () => {
    const profileId = 'usr_123';
    const mockProfile = { vrchat_id: profileId, discord_id: 'discord_456', vrchat_name: 'Test User' };
    
    mockDb.first.mockResolvedValue(mockProfile);

    const response = await GetProfile(profileId, localEnv);
    const responseBody = await response.json();

    expect(response.status).toBe(200);
    expect(responseBody).toEqual({ success: true, data: mockProfile });
    expect(mockDb.prepare).toHaveBeenCalledWith('SELECT * FROM profiles WHERE vrchat_id = ?');
    expect(mockDb.bind).toHaveBeenCalledWith(profileId);
  });

  it('should return 404 if profile is not found', async () => {
    const profileId = 'usr_not_found';
    mockDb.first.mockResolvedValue(null);

    const response = await GetProfile(profileId, localEnv);
    const responseBody = await response.json();

    expect(response.status).toBe(404);
    expect(responseBody).toEqual({ success: false, error: 'Profile not found' });
  });

  it('should return 500 on database error', async () => {
    const profileId = 'usr_123';
    const errorMessage = 'Database connection failed';
    mockDb.first.mockRejectedValue(new Error(errorMessage));

    const response = await GetProfile(profileId, localEnv);
    const responseBody = await response.json();

    expect(response.status).toBe(500);
    expect(responseBody).toEqual({ success: false, error: 'Internal Server Error' });
  });
});
