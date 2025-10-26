/**
 * @file        test/vrc/delete.spec.ts
 * @author      vicentefelipechile
 * @description Unit tests for the DeleteVRCConfig function.
 */

import { env } from 'cloudflare:test';
import { describe, it, expect, vi } from 'vitest';
import { DeleteVRCConfig } from '../../src/vrc/delete';

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

describe('DeleteVRCConfig Handler', () => {
  it('should delete a ban reason successfully', async () => {
    const deleteData = { type: 'banreason', id: 1 };
    const adminId = 'admin_123';
    const request = new Request('http://example.com/vrc/configs', {
      method: 'DELETE',
      body: JSON.stringify(deleteData),
      headers: { 'Content-Type': 'application/json' },
    });

    mockDb.first.mockResolvedValueOnce({ discord_id: adminId }).mockResolvedValueOnce({ reason_text: 'Spamming' }); // Admin and item exists
    mockDb.run.mockResolvedValue({ success: true });

    const response = await DeleteVRCConfig(request, localEnv, adminId);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(200);
    expect(responseBody).toEqual({ success: true, message: 'Ban reason disabled successfully' });
    expect(mockDb.prepare).toHaveBeenCalledWith('UPDATE ban_reasons SET is_disabled = true, updated_at = CURRENT_TIMESTAMP, updated_by = ? WHERE ban_reason_id = ?');
    expect(mockDb.bind).toHaveBeenCalledWith(adminId, deleteData.id);
  });

  it('should delete a setting successfully', async () => {
    const deleteData = { type: 'setting', id: 1 };
    const adminId = 'admin_123';
    const request = new Request('http://example.com/vrc/configs', {
      method: 'DELETE',
      body: JSON.stringify(deleteData),
      headers: { 'Content-Type': 'application/json' },
    });

    mockDb.first.mockResolvedValueOnce({ discord_id: adminId }).mockResolvedValueOnce({ setting_name: 'max_users' }); // Admin and item exists
    mockDb.run.mockResolvedValue({ success: true });

    const response = await DeleteVRCConfig(request, localEnv, adminId);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(200);
    expect(responseBody).toEqual({ success: true, message: 'Setting disabled successfully' });
    expect(mockDb.prepare).toHaveBeenCalledWith('UPDATE settings SET is_disabled = true, updated_at = CURRENT_TIMESTAMP, updated_by = ? WHERE setting_id = ?');
    expect(mockDb.bind).toHaveBeenCalledWith(adminId, deleteData.id);
  });

  it('should delete a verification type successfully', async () => {
    const deleteData = { type: 'verificationtype', id: 1 };
    const adminId = 'admin_123';
    const request = new Request('http://example.com/vrc/configs', {
      method: 'DELETE',
      body: JSON.stringify(deleteData),
      headers: { 'Content-Type': 'application/json' },
    });

    mockDb.first.mockResolvedValueOnce({ discord_id: adminId }).mockResolvedValueOnce({ type_name: 'Email' }); // Admin and item exists
    mockDb.run.mockResolvedValue({ success: true });

    const response = await DeleteVRCConfig(request, localEnv, adminId);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(200);
    expect(responseBody).toEqual({ success: true, message: 'Verification type disabled successfully' });
    expect(mockDb.prepare).toHaveBeenCalledWith('UPDATE verification_types SET is_disabled = true, updated_at = CURRENT_TIMESTAMP, updated_by = ? WHERE verification_type_id = ?');
    expect(mockDb.bind).toHaveBeenCalledWith(adminId, deleteData.id);
  });

  it('should return 403 for unauthorized admin', async () => {
    const deleteData = { type: 'banreason', id: 1 };
    const adminId = 'admin_123';
    const request = new Request('http://example.com/vrc/configs', {
      method: 'DELETE',
      body: JSON.stringify(deleteData),
      headers: { 'Content-Type': 'application/json' },
    });

    mockDb.first.mockResolvedValue(null); // No admin

    const response = await DeleteVRCConfig(request, localEnv, adminId);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(403);
    expect(responseBody).toEqual({ success: false, error: 'Unauthorized access' });
  });

  it('should return 400 for missing type or id', async () => {
    const deleteData = {}; // Missing type and id
    const adminId = 'admin_123';
    const request = new Request('http://example.com/vrc/configs', {
      method: 'DELETE',
      body: JSON.stringify(deleteData),
      headers: { 'Content-Type': 'application/json' },
    });

    mockDb.first.mockResolvedValue({ discord_id: adminId });

    const response = await DeleteVRCConfig(request, localEnv, adminId);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(400);
    expect(responseBody).toEqual({ success: false, error: 'Missing required fields: type and id are required' });
  });

  it('should return 404 for non-existent ban reason', async () => {
    const deleteData = { type: 'banreason', id: 999 };
    const adminId = 'admin_123';
    const request = new Request('http://example.com/vrc/configs', {
      method: 'DELETE',
      body: JSON.stringify(deleteData),
      headers: { 'Content-Type': 'application/json' },
    });

    mockDb.first.mockResolvedValueOnce({ discord_id: adminId }).mockResolvedValueOnce(null); // Admin ok, item not found

    const response = await DeleteVRCConfig(request, localEnv, adminId);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(404);
    expect(responseBody).toEqual({ success: false, error: 'Ban reason not found' });
  });

  it('should return 400 for invalid type', async () => {
    const deleteData = { type: 'invalid', id: 1 };
    const adminId = 'admin_123';
    const request = new Request('http://example.com/vrc/configs', {
      method: 'DELETE',
      body: JSON.stringify(deleteData),
      headers: { 'Content-Type': 'application/json' },
    });

    mockDb.first.mockResolvedValue({ discord_id: adminId });

    const response = await DeleteVRCConfig(request, localEnv, adminId);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(400);
    expect(responseBody).toEqual({ success: false, error: 'Invalid type: must be banreason, setting, or verificationtype' });
  });
});