/**
 * @file        test/vrc/add.spec.ts
 * @author      vicentefelipechile
 * @description Unit tests for the AddVRCConfig function.
 */

import { env } from 'cloudflare:test';
import { describe, it, expect, vi } from 'vitest';
import { AddVRCConfig } from '../../src/vrc/add';

// =================================================================================================
// Mock Setup
// =================================================================================================

const mockDb = {
  prepare: vi.fn().mockReturnThis(),
  bind: vi.fn().mockReturnThis(),
  run: vi.fn(),
  first: vi.fn(),
};

const localEnv = { ...env, DB: mockDb as any };

// =================================================================================================
// Test Suite
// =================================================================================================

describe('AddVRCConfig Handler', () => {
  it('should add a ban reason successfully', async () => {
    const newBanReason = { type: 'banreason', reason_text: 'Spamming' };
    const adminId = 'admin_123';
    const request = new Request('http://example.com/vrc/configs', {
      method: 'POST',
      body: JSON.stringify(newBanReason),
      headers: { 'Content-Type': 'application/json' },
    });

    mockDb.first.mockResolvedValue({ discord_id: adminId });
    mockDb.run.mockResolvedValue({ success: true });

    const response = await AddVRCConfig(request, localEnv, adminId);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(201);
    expect(responseBody).toEqual({ success: true, message: 'Ban reason added successfully' });
    expect(mockDb.prepare).toHaveBeenCalledWith('INSERT INTO ban_reasons (reason_text, created_by) VALUES (?, ?)');
    expect(mockDb.bind).toHaveBeenCalledWith(newBanReason.reason_text, adminId);
  });

  it('should add a setting successfully', async () => {
    const newSetting = { type: 'setting', setting_name: 'max_users', setting_type_id: 1 };
    const adminId = 'admin_123';
    const request = new Request('http://example.com/vrc/configs', {
      method: 'POST',
      body: JSON.stringify(newSetting),
      headers: { 'Content-Type': 'application/json' },
    });

    mockDb.first.mockResolvedValueOnce({ discord_id: adminId }).mockResolvedValueOnce({}); // Admin check and type check
    mockDb.run.mockResolvedValue({ success: true });

    const response = await AddVRCConfig(request, localEnv, adminId);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(201);
    expect(responseBody).toEqual({ success: true, message: 'Setting added successfully' });
    expect(mockDb.prepare).toHaveBeenCalledWith('INSERT INTO settings (setting_name, setting_type_id, created_by) VALUES (?, ?, ?)');
    expect(mockDb.bind).toHaveBeenCalledWith(newSetting.setting_name, newSetting.setting_type_id, adminId);
  });

  it('should add a verification type successfully', async () => {
    const newVerifType = { type: 'verificationtype', type_name: 'Email', description: 'Verify via email' };
    const adminId = 'admin_123';
    const request = new Request('http://example.com/vrc/configs', {
      method: 'POST',
      body: JSON.stringify(newVerifType),
      headers: { 'Content-Type': 'application/json' },
    });

    mockDb.first.mockResolvedValue({ discord_id: adminId });
    mockDb.run.mockResolvedValue({ success: true });

    const response = await AddVRCConfig(request, localEnv, adminId);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(201);
    expect(responseBody).toEqual({ success: true, message: 'Verification type added successfully' });
    expect(mockDb.prepare).toHaveBeenCalledWith('INSERT INTO verification_types (type_name, description, created_by) VALUES (?, ?, ?)');
    expect(mockDb.bind).toHaveBeenCalledWith(newVerifType.type_name, newVerifType.description, adminId);
  });

  it('should return 403 for unauthorized admin', async () => {
    const newBanReason = { type: 'banreason', reason_text: 'Spamming' };
    const adminId = 'admin_123';
    const request = new Request('http://example.com/vrc/configs', {
      method: 'POST',
      body: JSON.stringify(newBanReason),
      headers: { 'Content-Type': 'application/json' },
    });

    mockDb.first.mockResolvedValue(null); // No admin found

    const response = await AddVRCConfig(request, localEnv, adminId);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(403);
    expect(responseBody).toEqual({ success: false, error: 'Unauthorized access' });
  });

  it('should return 400 for missing type', async () => {
    const data = { reason_text: 'Spamming' }; // Missing type
    const adminId = 'admin_123';
    const request = new Request('http://example.com/vrc/configs', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json' },
    });

    mockDb.first.mockResolvedValue({ discord_id: adminId });

    const response = await AddVRCConfig(request, localEnv, adminId);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(400);
    expect(responseBody).toEqual({ success: false, error: 'Missing required field: type is required' });
  });

  it('should return 400 for invalid type', async () => {
    const data = { type: 'invalid', reason_text: 'Spamming' };
    const adminId = 'admin_123';
    const request = new Request('http://example.com/vrc/configs', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json' },
    });

    mockDb.first.mockResolvedValue({ discord_id: adminId });

    const response = await AddVRCConfig(request, localEnv, adminId);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(400);
    expect(responseBody).toEqual({ success: false, error: 'Invalid type: must be banreason, setting, or verificationtype' });
  });

  it('should return 400 for missing reason_text in banreason', async () => {
    const data = { type: 'banreason' }; // Missing reason_text
    const adminId = 'admin_123';
    const request = new Request('http://example.com/vrc/configs', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json' },
    });

    mockDb.first.mockResolvedValue({ discord_id: adminId });

    const response = await AddVRCConfig(request, localEnv, adminId);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(400);
    expect(responseBody).toEqual({ success: false, error: 'Missing required field: reason_text is required' });
  });

  it('should return 400 for invalid setting_type_id', async () => {
    const data = { type: 'setting', setting_name: 'max_users', setting_type_id: 999 };
    const adminId = 'admin_123';
    const request = new Request('http://example.com/vrc/configs', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json' },
    });

    mockDb.first.mockResolvedValueOnce({ discord_id: adminId }).mockResolvedValueOnce(null); // Admin check ok, type check fails

    const response = await AddVRCConfig(request, localEnv, adminId);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(400);
    expect(responseBody).toEqual({ success: false, error: 'Invalid setting_type_id: setting type does not exist' });
  });
});