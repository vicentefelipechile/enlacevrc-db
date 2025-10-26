/**
 * @file        test/vrc/get.spec.ts
 * @author      vicentefelipechile
 * @description Unit tests for the GetVRCConfig function.
 */

import { env } from 'cloudflare:test';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetVRCConfig } from '../../src/vrc/get';

// =================================================================================================
// Mock Setup
// =================================================================================================

const mockDb = {
  prepare: vi.fn().mockReturnThis(),
  bind: vi.fn().mockReturnThis(),
  run: vi.fn().mockResolvedValue({ success: true }),
  first: vi.fn(),
  all: vi.fn(),
};

const localEnv = { ...env, DB: mockDb as any };

// =================================================================================================
// Test Suite
// =================================================================================================

describe('GetVRCConfig Handler', () => {
  const adminId = 'admin_123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 403 for unauthorized access', async () => {
    const request = new Request('http://example.com/vrc/configs?getall=true', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    mockDb.first.mockResolvedValue(null); // No admin found

    const response = await GetVRCConfig(request, localEnv, adminId);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(403);
    expect(responseBody).toEqual({ success: false, error: 'Unauthorized access' });
    expect(mockDb.prepare).toHaveBeenCalledWith('SELECT * FROM bot_admins WHERE discord_id = ?');
    expect(mockDb.bind).toHaveBeenCalledWith(adminId);
  });

  it('should return all config data successfully', async () => {
    const request = new Request('http://example.com/vrc/configs?getall=true', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    const mockAdmin = { discord_id: adminId };
    const mockBanReasons = [
      { ban_reason_id: 1, reason_text: 'Spamming', created_by: 'admin_123' }
    ];
    const mockSettings = [
      { setting_id: 1, setting_type_id: 1, setting_key: 'timeout', setting_value: '300' }
    ];
    const mockSettingTypes = [
      { setting_type_id: 1, type_name: 'moderation' }
    ];
    const mockVerificationTypes = [
      { verification_type_id: 1, type_name: 'basic', description: 'Basic verification' }
    ];

    mockDb.first.mockResolvedValue(mockAdmin);
    mockDb.all
      .mockResolvedValueOnce({ results: mockBanReasons })
      .mockResolvedValueOnce({ results: mockSettings })
      .mockResolvedValueOnce({ results: mockSettingTypes })
      .mockResolvedValueOnce({ results: mockVerificationTypes });

    const response = await GetVRCConfig(request, localEnv, adminId);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(200);
    expect(responseBody).toEqual({
        banReasons: mockBanReasons,
        settings: [
          {
            setting_id: 1,
            setting_type_id: 1,
            setting_key: 'timeout',
            setting_value: '300',
            type: { setting_type_id: 1, type_name: 'moderation' }
          }
        ],
        verificationTypes: mockVerificationTypes
      });
  });

  it('should return only ban reasons when requested', async () => {
    const request = new Request('http://example.com/vrc/configs?getbanreasons=true', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    const mockAdmin = { discord_id: adminId };
    const mockBanReasons = [
      { ban_reason_id: 1, reason_text: 'Spamming', created_by: 'admin_123' }
    ];

    mockDb.first.mockResolvedValue(mockAdmin);
    mockDb.all.mockResolvedValue({ results: mockBanReasons });

    const response = await GetVRCConfig(request, localEnv, adminId);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(200);
    expect(responseBody).toEqual({
        banReasons: mockBanReasons
      });
    expect(mockDb.prepare).toHaveBeenCalledWith('SELECT * FROM ban_reasons');
  });

  it('should return only settings when requested', async () => {
    const request = new Request('http://example.com/vrc/configs?getsettings=true', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    const mockAdmin = { discord_id: adminId };
    const mockSettings = [
      { setting_id: 1, setting_type_id: 1, setting_key: 'timeout', setting_value: '300' }
    ];
    const mockSettingTypes = [
      { setting_type_id: 1, type_name: 'moderation' }
    ];

    mockDb.first.mockResolvedValue(mockAdmin);
    mockDb.all
      .mockResolvedValueOnce({ results: mockSettings })
      .mockResolvedValueOnce({ results: mockSettingTypes });

    const response = await GetVRCConfig(request, localEnv, adminId);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(200);
    expect(responseBody).toEqual({
        settings: [
          {
            setting_id: 1,
            setting_type_id: 1,
            setting_key: 'timeout',
            setting_value: '300',
            type: { setting_type_id: 1, type_name: 'moderation' }
          }
        ]
      });
  });

  it('should return only verification types when requested', async () => {
    const request = new Request('http://example.com/vrc/configs?getverificationtypes=true', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    const mockAdmin = { discord_id: adminId };
    const mockVerificationTypes = [
      { verification_type_id: 1, type_name: 'basic', description: 'Basic verification' }
    ];

    mockDb.first.mockResolvedValue(mockAdmin);
    mockDb.all.mockResolvedValue({ results: mockVerificationTypes });

    const response = await GetVRCConfig(request, localEnv, adminId);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(200);
    expect(responseBody).toEqual({
        verificationTypes: mockVerificationTypes
      });
    expect(mockDb.prepare).toHaveBeenCalledWith('SELECT * FROM verification_types');
  });

  it('should return empty config data when no parameters are provided', async () => {
    const request = new Request('http://example.com/vrc/configs', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    const mockAdmin = { discord_id: adminId };

    mockDb.first.mockResolvedValue(mockAdmin);

    const response = await GetVRCConfig(request, localEnv, adminId);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(200);
    expect(responseBody).toEqual({});
  });

  it('should return 500 on database error', async () => {
    const request = new Request('http://example.com/vrc/configs?getall=true', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    mockDb.first.mockRejectedValue(new Error('Database connection failed'));

    const response = await GetVRCConfig(request, localEnv, adminId);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(500);
    expect(responseBody).toEqual({ success: false, error: 'Internal server error' });
  });
});