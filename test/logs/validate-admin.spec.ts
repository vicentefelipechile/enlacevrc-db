/**
 * @file        test/logs/validate-admin.spec.ts
 * @author      vicentefelipechile
 * @description Unit tests for the ValidateAdminAccess function.
 */

import { env } from 'cloudflare:test';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ValidateAdminAccess } from '../../src/logs/validate-admin';

// Mock middleware functions
vi.mock('../../src/middleware/auth', () => ({
  validateApiKey: vi.fn(),
  validateAdmin: vi.fn(),
}));

import { validateApiKey, validateAdmin } from '../../src/middleware/auth';

// =================================================================================================
// Mock Setup
// =================================================================================================

const localEnv = { ...env, API_KEY: 'test-api-key' };

// =================================================================================================
// Test Suite
// =================================================================================================

describe('ValidateAdminAccess Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 if API key is missing', async () => {
    const request = new Request('http://example.com/auth/validate-admin', {
      headers: {
        'X-Discord-ID': '12345'
      },
    });

    vi.mocked(validateApiKey).mockResolvedValue(false);

    const response = await ValidateAdminAccess(request, localEnv);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(401);
    expect(responseBody).toEqual({ success: false, error: 'Unauthorized: Invalid or missing API key' });
  });

  it('should return 401 if API key is invalid', async () => {
    const request = new Request('http://example.com/auth/validate-admin', {
      headers: {
        'X-Api-Key': 'invalid-key',
        'X-Discord-ID': '12345'
      },
    });

    vi.mocked(validateApiKey).mockResolvedValue(false);

    const response = await ValidateAdminAccess(request, localEnv);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(401);
    expect(responseBody).toEqual({ success: false, error: 'Unauthorized: Invalid or missing API key' });
  });

  it('should return 400 if X-Discord-ID header is missing', async () => {
    const request = new Request('http://example.com/auth/validate-admin', {
      headers: {
        'X-Api-Key': 'test-api-key'
      },
    });

    vi.mocked(validateApiKey).mockResolvedValue(true);

    const response = await ValidateAdminAccess(request, localEnv);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(400);
    expect(responseBody).toEqual({ success: false, error: 'Missing header: X-Discord-ID' });
  });

  it('should return success with is_admin true for valid admin user', async () => {
    const request = new Request('http://example.com/auth/validate-admin', {
      headers: {
        'X-Api-Key': 'test-api-key',
        'X-Discord-ID': '12345'
      },
    });

    vi.mocked(validateApiKey).mockResolvedValue(true);
    vi.mocked(validateAdmin).mockResolvedValue(true);

    const response = await ValidateAdminAccess(request, localEnv);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(200);
    expect(responseBody).toEqual({
      success: true,
      data: {
        discord_id: '12345',
        is_admin: true,
        has_access: true
      }
    });
  });

  it('should return success with is_admin false for non-admin user', async () => {
    const request = new Request('http://example.com/auth/validate-admin', {
      headers: {
        'X-Api-Key': 'test-api-key',
        'X-Discord-ID': '67890'
      },
    });

    vi.mocked(validateApiKey).mockResolvedValue(true);
    vi.mocked(validateAdmin).mockResolvedValue(false);

    const response = await ValidateAdminAccess(request, localEnv);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(200);
    expect(responseBody).toEqual({
      success: true,
      data: {
        discord_id: '67890',
        is_admin: false,
        has_access: false
      }
    });
  });

  it('should return 500 on unexpected error', async () => {
    const request = new Request('http://example.com/auth/validate-admin', {
      headers: {
        'X-Api-Key': 'test-api-key',
        'X-Discord-ID': '12345'
      },
    });

    vi.mocked(validateApiKey).mockResolvedValue(true);
    vi.mocked(validateAdmin).mockRejectedValue(new Error('Database error'));

    const response = await ValidateAdminAccess(request, localEnv);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(500);
    expect(responseBody).toEqual({ success: false, error: 'Internal Server Error' });
  });

  it('should validate API key correctly', async () => {
    const request = new Request('http://example.com/auth/validate-admin', {
      headers: {
        'X-Api-Key': 'test-api-key',
        'X-Discord-ID': '12345'
      },
    });

    vi.mocked(validateApiKey).mockResolvedValue(true);
    vi.mocked(validateAdmin).mockResolvedValue(true);

    await ValidateAdminAccess(request, localEnv);

    expect(validateApiKey).toHaveBeenCalledWith(request, localEnv);
  });

  it('should validate admin status correctly', async () => {
    const request = new Request('http://example.com/auth/validate-admin', {
      headers: {
        'X-Api-Key': 'test-api-key',
        'X-Discord-ID': '12345'
      },
    });

    vi.mocked(validateApiKey).mockResolvedValue(true);
    vi.mocked(validateAdmin).mockResolvedValue(true);

    await ValidateAdminAccess(request, localEnv);

    expect(validateAdmin).toHaveBeenCalledWith('12345', localEnv);
  });

  it('should handle different Discord IDs correctly', async () => {
    const testDiscordIds = ['111', '222', '333'];

    for (const discordId of testDiscordIds) {
      const request = new Request('http://example.com/auth/validate-admin', {
        headers: {
          'X-Api-Key': 'test-api-key',
          'X-Discord-ID': discordId
        },
      });

      vi.mocked(validateApiKey).mockResolvedValue(true);
      vi.mocked(validateAdmin).mockResolvedValue(true);

      const response = await ValidateAdminAccess(request, localEnv);
      const responseBody = await response.json() as any;

      expect(response.status).toBe(200);
      expect(responseBody.data.discord_id).toBe(discordId);
    }
  });
});
