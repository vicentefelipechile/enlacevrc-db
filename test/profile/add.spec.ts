import { env, createExecutionContext } from 'cloudflare:test';
import { describe, it, expect, vi } from 'vitest';
import { AddProfile } from '../../src/profile/add';

// Mock the D1 database
const mockDb = {
  prepare: vi.fn().mockReturnThis(),
  bind: vi.fn().mockReturnThis(),
  run: vi.fn(),
};

const localEnv = { ...env, enlacevrc_db: mockDb as any };

describe('AddProfile Handler', () => {
  it('should add a profile successfully', async () => {
    const newProfile = { vrchat_id: 'usr_123', discord_id: 'discord_456', name: 'Test User' };
    const request = new Request('http://example.com/profiles', {
      method: 'POST',
      body: JSON.stringify(newProfile),
      headers: { 'Content-Type': 'application/json' },
    });

    mockDb.run.mockResolvedValue({ success: true });

    const response = await AddProfile(request, localEnv);

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ success: true, message: 'Profile created successfully.' });
    expect(mockDb.prepare).toHaveBeenCalledWith('INSERT INTO profiles (vrchat_id, discord_id, name) VALUES (?, ?, ?)');
    expect(mockDb.bind).toHaveBeenCalledWith(newProfile.vrchat_id, newProfile.discord_id, newProfile.name);
  });

  it('should return 400 for missing required fields', async () => {
    const newProfile = { vrchat_id: 'usr_123', name: 'Test User' }; // Missing discord_id
    const request = new Request('http://example.com/profiles', {
      method: 'POST',
      body: JSON.stringify(newProfile),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await AddProfile(request, localEnv);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ success: false, error: 'Missing required fields: vrchat_id, discord_id, name' });
  });

  it('should return 400 for invalid JSON', async () => {
    const request = new Request('http://example.com/profiles', {
      method: 'POST',
      body: '{"invalid_json'
    });

    const response = await AddProfile(request, localEnv);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ success: false, error: 'Invalid JSON in request body.' });
  });

  it('should return 409 if the profile already exists', async () => {
    const newProfile = { vrchat_id: 'usr_123', discord_id: 'discord_456', name: 'Test User' };
    const request = new Request('http://example.com/profiles', {
      method: 'POST',
      body: JSON.stringify(newProfile),
      headers: { 'Content-Type': 'application/json' },
    });

    mockDb.run.mockResolvedValue({ success: false });

    const response = await AddProfile(request, localEnv);

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ success: false, error: 'Failed to create profile. It may already exist.' });
  });
});
