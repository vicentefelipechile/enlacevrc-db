/**
 * @file        test/profile/add.spec.ts
 * @author      vicentefelipechile
 * @description Unit tests for the AddProfile function.
 */

import { env } from 'cloudflare:test';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AddProfile } from '../../src/profile/add';

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
  run: vi.fn(),
};

const localEnv = { ...env, DB: mockDb as any };

// Mock crypto.randomUUID
beforeEach(() => {
  vi.stubGlobal('crypto', {
    randomUUID: vi.fn(() => '123e4567-e89b-12d3-a456-426614174000'),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// =================================================================================================
// Test Suite
// =================================================================================================

describe('AddProfile Handler', () => {
  const mockUserId = 'stf_123e4567-e89b-12d3-a456-426614174000';

  it('should add a profile successfully', async () => {
    const newProfile = { 
      vrchat_id: 'usr_123', 
      discord_id: 'discord_456', 
      vrchat_name: 'Test User',
      verification_method: 1
    };
    const request = new Request('http://example.com/profiles', {
      method: 'POST',
      body: JSON.stringify(newProfile),
      headers: { 'Content-Type': 'application/json' },
    });

    mockDb.run.mockResolvedValue({ success: true });

    const response = await AddProfile(request, localEnv, mockUserId);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(201);
    expect(responseBody).toEqual({ success: true, message: 'Profile created successfully' });
    expect(mockDb.prepare).toHaveBeenCalledWith(`
            INSERT INTO profiles (
                profile_id, vrchat_id, discord_id, vrchat_name, verification_method, created_by
            ) VALUES (?, ?, ?, ?, ?, ?)
        `);
    expect(mockDb.bind).toHaveBeenCalledWith('prf_123e4567-e89b-12d3-a456-426614174000', newProfile.vrchat_id, newProfile.discord_id, newProfile.vrchat_name, newProfile.verification_method, mockUserId);
  });

  it('should return 400 for missing required fields', async () => {
    const newProfile = { vrchat_id: 'usr_123', vrchat_name: 'Test User' }; // Missing discord_id and verification_method
    const request = new Request('http://example.com/profiles', {
      method: 'POST',
      body: JSON.stringify(newProfile),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await AddProfile(request, localEnv, mockUserId);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(400);
    expect(responseBody).toEqual({ success: false, error: 'Missing required fields: vrchat_id, discord_id, vrchat_name, and verification_method are required' });
  });

  it('should return 400 for invalid JSON', async () => {
    const request = new Request('http://example.com/profiles', {
      method: 'POST',
      body: '{"invalid_json',
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await AddProfile(request, localEnv, mockUserId);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(400);
    expect(responseBody).toEqual({ success: false, error: 'Invalid JSON in request body' });
  });

  it('should return 409 if the profile already exists', async () => {
    const newProfile = { 
      vrchat_id: 'usr_123', 
      discord_id: 'discord_456', 
      vrchat_name: 'Test User',
      verification_method: 1
    };
    const request = new Request('http://example.com/profiles', {
      method: 'POST',
      body: JSON.stringify(newProfile),
      headers: { 'Content-Type': 'application/json' },
    });

    mockDb.run.mockResolvedValue({ success: false });

    const response = await AddProfile(request, localEnv, mockUserId);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(409);
    expect(responseBody).toEqual({ success: false, error: 'Failed to create profile. It may already exist' });
  });

  it('should return 500 for unexpected errors', async () => {
    const newProfile = { 
      vrchat_id: 'usr_123', 
      discord_id: 'discord_456', 
      vrchat_name: 'Test User', 
      verification_method: 1
    };
    const request = new Request('http://example.com/profiles', {
      method: 'POST',
      body: JSON.stringify(newProfile),
      headers: { 'Content-Type': 'application/json' },
    });

    // Mock an unexpected error
    mockDb.run.mockRejectedValue(new Error('Database connection failed'));

    const response = await AddProfile(request, localEnv, mockUserId);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(500);
    expect(responseBody).toEqual({ success: false, error: 'Internal Server Error' });
  });
});
