import { env } from 'cloudflare:test';
import { describe, it, expect, vi } from 'vitest';
import { DeleteProfile } from '../../src/profile/delete';

// Mock de la base de datos D1
const mockDb = {
  prepare: vi.fn().mockReturnThis(),
  bind: vi.fn().mockReturnThis(),
  first: vi.fn(),
  run: vi.fn(),
};

// Se clona el 'env' de prueba y se sobreescribe la base de datos con nuestro mock
const localEnv = { ...env, enlacevrc_db: mockDb as any };

describe('DeleteProfile Handler', () => {
  it('should delete a profile successfully', async () => {
    const discordId = 'discord_123';
    const existingProfile = { discord_id: discordId, vrchat_id: 'usr_abc', vrchat_name: 'Test User' };

    mockDb.first.mockResolvedValue(existingProfile);
    mockDb.run.mockResolvedValue({ success: true });

    const response = await DeleteProfile(discordId, localEnv);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true, message: 'Profile deleted successfully.' });

    expect(mockDb.prepare).toHaveBeenCalledWith('SELECT * FROM profiles WHERE discord_id = ?');
    expect(mockDb.bind).toHaveBeenCalledWith(discordId);

    expect(mockDb.prepare).toHaveBeenCalledWith('DELETE FROM profiles WHERE discord_id = ?');
    expect(mockDb.bind).toHaveBeenCalledWith(discordId);
  });

  it('should return 404 if the profile does not exist', async () => {
    const discordId = 'non_existent_id';

    mockDb.first.mockResolvedValue(null);

    const response = await DeleteProfile(discordId, localEnv);

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ success: false, error: 'Profile not found.' });

    expect(mockDb.prepare).toHaveBeenCalledWith('SELECT * FROM profiles WHERE discord_id = ?');
    expect(mockDb.bind).toHaveBeenCalledWith(discordId);
  });

  it('should return 500 if database deletion fails', async () => {
    const discordId = 'discord_456';
    const existingProfile = { discord_id: discordId, vrchat_id: 'usr_def', vrchat_name: 'Another User' };

    mockDb.first.mockResolvedValue(existingProfile);
    mockDb.run.mockResolvedValue({ success: false });

    const response = await DeleteProfile(discordId, localEnv);

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ success: false, error: 'Failed to delete profile.' });
  });

  it('should return 500 for an unexpected server error', async () => {
    const discordId = 'discord_789';

    const errorMessage = 'Database connection lost';
    mockDb.first.mockRejectedValue(new Error(errorMessage));

    const response = await DeleteProfile(discordId, localEnv);

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ success: false, error: 'Internal Server Error' });
  });
});