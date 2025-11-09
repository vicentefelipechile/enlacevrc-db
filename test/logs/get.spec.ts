/**
 * @file        test/logs/get.spec.ts
 * @author      vicentefelipechile
 * @description Unit tests for the GetLogs function.
 */

import { env } from 'cloudflare:test';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetLogs } from '../../src/logs/get';

// Mock middleware functions
vi.mock('../../src/middleware/auth', () => ({
  requireAuth: vi.fn(),
}));

// Mock LogIt function
vi.mock('../../src/loglevel', () => ({
  LogIt: vi.fn(),
  LogLevel: {
    INFO: 3,
    WARNING: 4,
    ERROR: 5,
  }
}));

import { requireAuth } from '../../src/middleware/auth';

// =================================================================================================
// Mock Setup
// =================================================================================================

const mockDb = {
  prepare: vi.fn().mockReturnThis(),
  bind: vi.fn().mockReturnThis(),
  all: vi.fn(),
};

const localEnv = { ...env, DB: mockDb as any };

// =================================================================================================
// Test Suite
// =================================================================================================

describe('GetLogs Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 if authentication fails', async () => {
    const request = new Request('http://example.com/logs', {
      headers: {
        'X-Api-Key': 'invalid-key',
        'X-Discord-ID': '12345',
        'X-Discord-Name': 'TestUser'
      },
    });

    const authError = new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });

    vi.mocked(requireAuth).mockResolvedValue(authError);

    const response = await GetLogs(request, localEnv);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(401);
    expect(responseBody).toEqual({ success: false, error: 'Unauthorized' });
  });

  it('should return 403 if user is not admin', async () => {
    const request = new Request('http://example.com/logs', {
      headers: {
        'X-Api-Key': 'valid-key',
        'X-Discord-ID': '12345',
        'X-Discord-Name': 'TestUser'
      },
    });

    const authError = new Response(JSON.stringify({ success: false, error: 'Forbidden: Admin privileges required' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });

    vi.mocked(requireAuth).mockResolvedValue(authError);

    const response = await GetLogs(request, localEnv);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(403);
    expect(responseBody).toEqual({ success: false, error: 'Forbidden: Admin privileges required' });
  });

  it('should retrieve logs successfully with default limit', async () => {
    const request = new Request('http://example.com/logs', {
      headers: {
        'X-Api-Key': 'valid-key',
        'X-Discord-ID': '12345',
        'X-Discord-Name': 'AdminUser'
      },
    });

    vi.mocked(requireAuth).mockResolvedValue(null);

    const mockLogs = [
      { log_id: 1, log_level_id: 3, message: 'Test log 1', created_by: 'user1', created_at: '2024-01-01' },
      { log_id: 2, log_level_id: 4, message: 'Test log 2', created_by: 'user2', created_at: '2024-01-02' },
    ];

    mockDb.all.mockResolvedValue({ success: true, results: mockLogs });

    const response = await GetLogs(request, localEnv);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(200);
    expect(responseBody.success).toBe(true);
    expect(responseBody.data).toEqual(mockLogs);
    expect(responseBody.count).toBe(2);
    expect(responseBody.limit).toBe(50);
    expect(mockDb.prepare).toHaveBeenCalledWith('SELECT * FROM log WHERE 1=1 ORDER BY created_at DESC LIMIT ?');
    expect(mockDb.bind).toHaveBeenCalledWith(50);
  });

  it('should retrieve logs with custom limit', async () => {
    const request = new Request('http://example.com/logs?limit=10', {
      headers: {
        'X-Api-Key': 'valid-key',
        'X-Discord-ID': '12345',
        'X-Discord-Name': 'AdminUser'
      },
    });

    vi.mocked(requireAuth).mockResolvedValue(null);

    const mockLogs = [
      { log_id: 1, log_level_id: 3, message: 'Test log 1', created_by: 'user1', created_at: '2024-01-01' },
    ];

    mockDb.all.mockResolvedValue({ success: true, results: mockLogs });

    const response = await GetLogs(request, localEnv);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(200);
    expect(responseBody.limit).toBe(10);
    expect(mockDb.bind).toHaveBeenCalledWith(10);
  });

  it('should enforce maximum limit of 100', async () => {
    const request = new Request('http://example.com/logs?limit=200', {
      headers: {
        'X-Api-Key': 'valid-key',
        'X-Discord-ID': '12345',
        'X-Discord-Name': 'AdminUser'
      },
    });

    vi.mocked(requireAuth).mockResolvedValue(null);

    mockDb.all.mockResolvedValue({ success: true, results: [] });

    const response = await GetLogs(request, localEnv);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(200);
    expect(responseBody.limit).toBe(100);
    expect(mockDb.bind).toHaveBeenCalledWith(100);
  });

  it('should filter logs by log_level_id', async () => {
    const request = new Request('http://example.com/logs?log_level_id=3', {
      headers: {
        'X-Api-Key': 'valid-key',
        'X-Discord-ID': '12345',
        'X-Discord-Name': 'AdminUser'
      },
    });

    vi.mocked(requireAuth).mockResolvedValue(null);

    mockDb.all.mockResolvedValue({ success: true, results: [] });

    await GetLogs(request, localEnv);

    expect(mockDb.prepare).toHaveBeenCalledWith('SELECT * FROM log WHERE 1=1 AND log_level_id = ? ORDER BY created_at DESC LIMIT ?');
    expect(mockDb.bind).toHaveBeenCalledWith(3, 50);
  });

  it('should filter logs by created_by', async () => {
    const request = new Request('http://example.com/logs?created_by=user123', {
      headers: {
        'X-Api-Key': 'valid-key',
        'X-Discord-ID': '12345',
        'X-Discord-Name': 'AdminUser'
      },
    });

    vi.mocked(requireAuth).mockResolvedValue(null);

    mockDb.all.mockResolvedValue({ success: true, results: [] });

    await GetLogs(request, localEnv);

    expect(mockDb.prepare).toHaveBeenCalledWith('SELECT * FROM log WHERE 1=1 AND created_by = ? ORDER BY created_at DESC LIMIT ?');
    expect(mockDb.bind).toHaveBeenCalledWith('user123', 50);
  });

  it('should filter logs by date range', async () => {
    const request = new Request('http://example.com/logs?start_date=2024-01-01&end_date=2024-01-31', {
      headers: {
        'X-Api-Key': 'valid-key',
        'X-Discord-ID': '12345',
        'X-Discord-Name': 'AdminUser'
      },
    });

    vi.mocked(requireAuth).mockResolvedValue(null);

    mockDb.all.mockResolvedValue({ success: true, results: [] });

    await GetLogs(request, localEnv);

    expect(mockDb.prepare).toHaveBeenCalledWith('SELECT * FROM log WHERE 1=1 AND created_at BETWEEN ? AND ? ORDER BY created_at DESC LIMIT ?');
    expect(mockDb.bind).toHaveBeenCalledWith('2024-01-01', '2024-01-31', 50);
  });

  it('should filter logs with multiple parameters', async () => {
    const request = new Request('http://example.com/logs?log_level_id=4&created_by=user123&limit=25', {
      headers: {
        'X-Api-Key': 'valid-key',
        'X-Discord-ID': '12345',
        'X-Discord-Name': 'AdminUser'
      },
    });

    vi.mocked(requireAuth).mockResolvedValue(null);

    mockDb.all.mockResolvedValue({ success: true, results: [] });

    await GetLogs(request, localEnv);

    expect(mockDb.prepare).toHaveBeenCalledWith('SELECT * FROM log WHERE 1=1 AND log_level_id = ? AND created_by = ? ORDER BY created_at DESC LIMIT ?');
    expect(mockDb.bind).toHaveBeenCalledWith(4, 'user123', 25);
  });

  it('should return 500 if database query fails', async () => {
    const request = new Request('http://example.com/logs', {
      headers: {
        'X-Api-Key': 'valid-key',
        'X-Discord-ID': '12345',
        'X-Discord-Name': 'AdminUser'
      },
    });

    vi.mocked(requireAuth).mockResolvedValue(null);

    mockDb.all.mockResolvedValue({ success: false, results: [] });

    const response = await GetLogs(request, localEnv);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(500);
    expect(responseBody).toEqual({ success: false, error: 'Failed to retrieve logs' });
  });

  it('should return 500 on unexpected error', async () => {
    const request = new Request('http://example.com/logs', {
      headers: {
        'X-Api-Key': 'valid-key',
        'X-Discord-ID': '12345',
        'X-Discord-Name': 'AdminUser'
      },
    });

    vi.mocked(requireAuth).mockResolvedValue(null);

    mockDb.all.mockRejectedValue(new Error('Database connection error'));

    const response = await GetLogs(request, localEnv);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(500);
    expect(responseBody).toEqual({ success: false, error: 'Internal Server Error' });
  });
});
