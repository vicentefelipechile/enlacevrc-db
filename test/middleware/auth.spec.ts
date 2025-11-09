/**
 * @file        test/middleware/auth.spec.ts
 * @author      vicentefelipechile
 * @description Unit tests for the authentication middleware functions.
 */

import { env } from 'cloudflare:test';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateApiKey, validateAdmin, requireAuth, extractDiscordId } from '../../src/middleware/auth';

// =================================================================================================
// Mock Setup
// =================================================================================================

const mockDb = {
  prepare: vi.fn().mockReturnThis(),
  bind: vi.fn().mockReturnThis(),
  first: vi.fn(),
};

const localEnv = { ...env, DB: mockDb as any, API_KEY: 'test-api-key' };

// =================================================================================================
// Test Suite: validateApiKey
// =================================================================================================

describe('validateApiKey', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return true for valid API key', async () => {
    const request = new Request('http://example.com', {
      headers: { 'X-Api-Key': 'test-api-key' },
    });

    const result = await validateApiKey(request, localEnv);

    expect(result).toBe(true);
  });

  it('should return false for invalid API key', async () => {
    const request = new Request('http://example.com', {
      headers: { 'X-Api-Key': 'invalid-key' },
    });

    const result = await validateApiKey(request, localEnv);

    expect(result).toBe(false);
  });

  it('should return false when API key header is missing', async () => {
    const request = new Request('http://example.com');

    const result = await validateApiKey(request, localEnv);

    expect(result).toBe(false);
  });

  it('should return false for empty API key', async () => {
    const request = new Request('http://example.com', {
      headers: { 'X-Api-Key': '' },
    });

    const result = await validateApiKey(request, localEnv);

    expect(result).toBe(false);
  });
});

// =================================================================================================
// Test Suite: validateAdmin
// =================================================================================================

describe('validateAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return true if user is in bot_admin table', async () => {
    mockDb.first.mockResolvedValueOnce({ admin_id: 1 });

    const result = await validateAdmin('12345', localEnv);

    expect(result).toBe(true);
    expect(mockDb.prepare).toHaveBeenCalledWith(
      'SELECT admin_id FROM bot_admin WHERE discord_id = ? LIMIT 1'
    );
    expect(mockDb.bind).toHaveBeenCalledWith('12345');
  });

  it('should return true if user is in staff table', async () => {
    mockDb.first.mockResolvedValueOnce(null);
    mockDb.first.mockResolvedValueOnce({ staff_id: 'stf_123' });

    const result = await validateAdmin('67890', localEnv);

    expect(result).toBe(true);
    expect(mockDb.prepare).toHaveBeenCalledWith(
      'SELECT staff_id FROM staff WHERE discord_id = ? LIMIT 1'
    );
  });

  it('should return false if user is not in bot_admin or staff tables', async () => {
    mockDb.first.mockResolvedValueOnce(null);
    mockDb.first.mockResolvedValueOnce(null);

    const result = await validateAdmin('99999', localEnv);

    expect(result).toBe(false);
  });

  it('should return false on database error', async () => {
    mockDb.first.mockRejectedValueOnce(new Error('Database error'));

    const result = await validateAdmin('12345', localEnv);

    expect(result).toBe(false);
  });

  it('should check bot_admin first before staff', async () => {
    mockDb.first.mockResolvedValueOnce({ admin_id: 1 });

    await validateAdmin('12345', localEnv);

    // Should only call prepare once for bot_admin (not staff)
    expect(mockDb.prepare).toHaveBeenCalledTimes(1);
    expect(mockDb.prepare).toHaveBeenCalledWith(
      'SELECT admin_id FROM bot_admin WHERE discord_id = ? LIMIT 1'
    );
  });
});

// =================================================================================================
// Test Suite: requireAuth
// =================================================================================================

describe('requireAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return error if API key is invalid', async () => {
    const request = new Request('http://example.com', {
      headers: {
        'X-Api-Key': 'invalid-key',
        'X-Discord-ID': '12345'
      },
    });

    const response = await requireAuth(request, localEnv);

    expect(response).not.toBeNull();
    const responseBody = await response!.json() as any;
    expect(response!.status).toBe(401);
    expect(responseBody).toEqual({ success: false, error: 'Unauthorized: Invalid or missing API key' });
  });

  it('should return error if Discord ID is missing', async () => {
    const request = new Request('http://example.com', {
      headers: {
        'X-Api-Key': 'test-api-key'
      },
    });

    const response = await requireAuth(request, localEnv);

    expect(response).not.toBeNull();
    const responseBody = await response!.json() as any;
    expect(response!.status).toBe(401);
    expect(responseBody).toEqual({ success: false, error: 'Unauthorized: Discord ID required' });
  });

  it('should return error if user is not admin', async () => {
    const request = new Request('http://example.com', {
      headers: {
        'X-Api-Key': 'test-api-key',
        'X-Discord-ID': '12345'
      },
    });

    mockDb.first.mockResolvedValueOnce(null);
    mockDb.first.mockResolvedValueOnce(null);

    const response = await requireAuth(request, localEnv);

    expect(response).not.toBeNull();
    const responseBody = await response!.json() as any;
    expect(response!.status).toBe(403);
    expect(responseBody).toEqual({ success: false, error: 'Forbidden: Admin privileges required' });
  });

  it('should return null if all checks pass (bot_admin)', async () => {
    const request = new Request('http://example.com', {
      headers: {
        'X-Api-Key': 'test-api-key',
        'X-Discord-ID': '12345'
      },
    });

    mockDb.first.mockResolvedValueOnce({ admin_id: 1 });

    const response = await requireAuth(request, localEnv);

    expect(response).toBeNull();
  });

  it('should return null if all checks pass (staff)', async () => {
    const request = new Request('http://example.com', {
      headers: {
        'X-Api-Key': 'test-api-key',
        'X-Discord-ID': '67890'
      },
    });

    mockDb.first.mockResolvedValueOnce(null);
    mockDb.first.mockResolvedValueOnce({ staff_id: 'stf_123' });

    const response = await requireAuth(request, localEnv);

    expect(response).toBeNull();
  });
});

// =================================================================================================
// Test Suite: extractDiscordId
// =================================================================================================

describe('extractDiscordId', () => {
  it('should extract Discord ID from header', () => {
    const request = new Request('http://example.com', {
      headers: { 'X-Discord-ID': '12345' },
    });

    const result = extractDiscordId(request);

    expect(result).toBe('12345');
  });

  it('should extract Discord ID from URL parameter', () => {
    const request = new Request('http://example.com?discord_id=67890');

    const result = extractDiscordId(request);

    expect(result).toBe('67890');
  });

  it('should prioritize header over URL parameter', () => {
    const request = new Request('http://example.com?discord_id=67890', {
      headers: { 'X-Discord-ID': '12345' },
    });

    const result = extractDiscordId(request);

    expect(result).toBe('12345');
  });

  it('should return null if Discord ID is not found', () => {
    const request = new Request('http://example.com');

    const result = extractDiscordId(request);

    expect(result).toBeNull();
  });

  it('should handle empty header correctly', () => {
    const request = new Request('http://example.com', {
      headers: { 'X-Discord-ID': '' },
    });

    const result = extractDiscordId(request);

    // Empty string is still truthy for headers
    expect(result).toBeNull();
  });

  it('should handle empty URL parameter correctly', () => {
    const request = new Request('http://example.com?discord_id=');

    const result = extractDiscordId(request);

    // Empty string parameter returns empty string
    expect(result).toBeNull();
  });
});
