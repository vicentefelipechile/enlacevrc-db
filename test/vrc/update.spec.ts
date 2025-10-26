/**
 * @file        test/vrc/update.spec.ts
 * @author      vicentefelipechile
 * @description Unit tests for the UpdateVRCConfig function.
 */

import { env } from 'cloudflare:test';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpdateVRCConfig } from '../../src/vrc/update';

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

describe('UpdateVRCConfig Handler', () => {
  beforeEach(() => {
    mockDb.prepare.mockReset().mockReturnThis();
    mockDb.bind.mockReset().mockReturnThis();
    mockDb.run.mockReset().mockResolvedValue({ success: true });
    mockDb.first.mockReset().mockResolvedValue(null);
  });
  it('should update a ban reason successfully', async () => {
    const updateData = { type: 'banreason', id: 1, reason_text: 'Updated spamming' };
    const adminId = 'admin_123';
    const request = new Request('http://example.com/vrc/configs', {
      method: 'PUT',
      body: JSON.stringify(updateData),
      headers: { 'Content-Type': 'application/json' },
    });

    mockDb.first.mockResolvedValueOnce({ discord_id: adminId }).mockResolvedValueOnce({}); // Admin and exists check
    mockDb.run.mockResolvedValue({ success: true });

    const response = await UpdateVRCConfig(request, localEnv, adminId);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(200);
    expect(responseBody).toEqual({ success: true, message: 'Ban reason updated successfully' });
    expect(mockDb.prepare).toHaveBeenCalledWith('UPDATE ban_reasons SET reason_text = ?, updated_at = CURRENT_TIMESTAMP, updated_by = ? WHERE ban_reason_id = ?');
    expect(mockDb.bind).toHaveBeenCalledWith(updateData.reason_text, adminId, updateData.id);
  });

  it('should update a setting successfully', async () => {
    const updateData = { type: 'setting', id: 1, setting_name: 'Updated max_users' };
    const adminId = 'admin_123';
    const request = new Request('http://example.com/vrc/configs', {
      method: 'PUT',
      body: JSON.stringify(updateData),
      headers: { 'Content-Type': 'application/json' },
    });

    mockDb.first.mockResolvedValueOnce({ discord_id: adminId }).mockResolvedValueOnce({}).mockResolvedValueOnce({}); // Admin, exists, type check
    mockDb.run.mockResolvedValue({ success: true });

    const response = await UpdateVRCConfig(request, localEnv, adminId);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(200);
    expect(responseBody).toEqual({ success: true, message: 'Setting updated successfully' });
  });

  it('should update a verification type successfully', async () => {
    const updateData = { type: 'verificationtype', id: 1, type_name: 'Updated Email' };
    const adminId = 'admin_123';
    const request = new Request('http://example.com/vrc/configs', {
      method: 'PUT',
      body: JSON.stringify(updateData),
      headers: { 'Content-Type': 'application/json' },
    });

    mockDb.first.mockResolvedValueOnce({ discord_id: adminId }).mockResolvedValueOnce({}); // Admin and exists check
    mockDb.run.mockResolvedValue({ success: true });

    const response = await UpdateVRCConfig(request, localEnv, adminId);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(200);
    expect(responseBody).toEqual({ success: true, message: 'Verification type updated successfully' });
  });

  it('should return 403 for unauthorized admin', async () => {
    const updateData = { type: 'banreason', id: 1, reason_text: 'Updated' };
    const adminId = 'admin_123';
    const request = new Request('http://example.com/vrc/configs', {
      method: 'PUT',
      body: JSON.stringify(updateData),
      headers: { 'Content-Type': 'application/json' },
    });

    mockDb.first.mockResolvedValue(null); // No admin

    const response = await UpdateVRCConfig(request, localEnv, adminId);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(403);
    expect(responseBody).toEqual({ success: false, error: 'Unauthorized access' });
  });

  it('should return 400 for missing type or id', async () => {
    const updateData = { reason_text: 'Updated' }; // Missing type and id
    const adminId = 'admin_123';
    const request = new Request('http://example.com/vrc/configs', {
      method: 'PUT',
      body: JSON.stringify(updateData),
      headers: { 'Content-Type': 'application/json' },
    });

    mockDb.first.mockResolvedValue({ discord_id: adminId });

    const response = await UpdateVRCConfig(request, localEnv, adminId);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(400);
    expect(responseBody).toEqual({ success: false, error: 'Missing required fields: type and id are required' });
  });

  it('should return 404 for non-existent ban reason', async () => {
    const updateData = { type: 'banreason', id: 999, reason_text: 'Updated' };
    const adminId = 'admin_123';
    const request = new Request('http://example.com/vrc/configs', {
      method: 'PUT',
      body: JSON.stringify(updateData),
      headers: { 'Content-Type': 'application/json' },
    });

    mockDb.first.mockResolvedValueOnce({ discord_id: adminId }).mockResolvedValueOnce(null); // Admin ok, item not found

    const response = await UpdateVRCConfig(request, localEnv, adminId);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(404);
    expect(responseBody).toEqual({ success: false, error: 'Ban reason not found' });
  });

  it('should return 400 for no fields to update in setting', async () => {
    const updateData = { type: 'setting', id: 1 }; // No update fields
    const adminId = 'admin_123';
    const request = new Request('http://example.com/vrc/configs', {
      method: 'PUT',
      body: JSON.stringify(updateData),
      headers: { 'Content-Type': 'application/json' },
    });

    mockDb.first.mockResolvedValueOnce({ discord_id: adminId }).mockResolvedValueOnce({}); // Admin and exists

    const response = await UpdateVRCConfig(request, localEnv, adminId);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(400);
    expect(responseBody).toEqual({ success: false, error: 'At least one field to update is required: setting_name or setting_type_id' });
  });

  it('should return 500 for database error during admin check', async () => {
    const updateData = { type: 'banreason', id: 1, reason_text: 'Updated' };
    const adminId = 'admin_123';
    const request = new Request('http://example.com/vrc/configs', {
      method: 'PUT',
      body: JSON.stringify(updateData),
      headers: { 'Content-Type': 'application/json' },
    });

    mockDb.first.mockRejectedValue(new Error('Database connection failed'));

    const response = await UpdateVRCConfig(request, localEnv, adminId);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(500);
    expect(responseBody).toEqual({ success: false, error: 'Internal server error' });
  });

  it('should return 400 for invalid type', async () => {
    const updateData = { type: 'invalidtype', id: 1, reason_text: 'Updated' };
    const adminId = 'admin_123';
    const request = new Request('http://example.com/vrc/configs', {
      method: 'PUT',
      body: JSON.stringify(updateData),
      headers: { 'Content-Type': 'application/json' },
    });

    mockDb.first.mockResolvedValue({ discord_id: adminId });

    const response = await UpdateVRCConfig(request, localEnv, adminId);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(400);
    expect(responseBody).toEqual({ success: false, error: 'Invalid type: must be banreason, setting, or verificationtype' });
  });

  it('should return 400 for missing reason_text in ban reason update', async () => {
    const updateData = { type: 'banreason', id: 1 }; // Missing reason_text
    const adminId = 'admin_123';
    const request = new Request('http://example.com/vrc/configs', {
      method: 'PUT',
      body: JSON.stringify(updateData),
      headers: { 'Content-Type': 'application/json' },
    });

    mockDb.first.mockResolvedValueOnce({ discord_id: adminId }).mockResolvedValueOnce({}); // Admin and exists

    const response = await UpdateVRCConfig(request, localEnv, adminId);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(400);
    expect(responseBody).toEqual({ success: false, error: 'Missing required field: reason_text is required' });
  });

  it('should return 400 for invalid setting_type_id', async () => {
    const updateData = { type: 'setting', id: 1, setting_type_id: 999 };
    const adminId = 'admin_123';
    const request = new Request('http://example.com/vrc/configs', {
      method: 'PUT',
      body: JSON.stringify(updateData),
      headers: { 'Content-Type': 'application/json' },
    });

    mockDb.first.mockResolvedValueOnce({ discord_id: adminId }).mockResolvedValueOnce({}).mockResolvedValueOnce(null); // Admin, exists, invalid type

    const response = await UpdateVRCConfig(request, localEnv, adminId);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(400);
    expect(responseBody).toEqual({ success: false, error: 'Invalid setting_type_id: setting type does not exist' });
  });

  it('should return 404 for non-existent setting', async () => {
    const updateData = { type: 'setting', id: 999, setting_name: 'Updated' };
    const adminId = 'admin_123';
    const request = new Request('http://example.com/vrc/configs', {
      method: 'PUT',
      body: JSON.stringify(updateData),
      headers: { 'Content-Type': 'application/json' },
    });

    mockDb.first.mockResolvedValueOnce({ discord_id: adminId }).mockResolvedValueOnce(null); // Admin ok, item not found

    const response = await UpdateVRCConfig(request, localEnv, adminId);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(404);
    expect(responseBody).toEqual({ success: false, error: 'Setting not found' });
  });

  it('should return 404 for non-existent verification type', async () => {
    const updateData = { type: 'verificationtype', id: 999, type_name: 'Updated' };
    const adminId = 'admin_123';
    const request = new Request('http://example.com/vrc/configs', {
      method: 'PUT',
      body: JSON.stringify(updateData),
      headers: { 'Content-Type': 'application/json' },
    });

    mockDb.first.mockResolvedValueOnce({ discord_id: adminId }).mockResolvedValueOnce(null); // Admin ok, item not found

    const response = await UpdateVRCConfig(request, localEnv, adminId);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(404);
    expect(responseBody).toEqual({ success: false, error: 'Verification type not found' });
  });

  it('should return 400 for no fields to update in verification type', async () => {
    const updateData = { type: 'verificationtype', id: 1 }; // No update fields
    const adminId = 'admin_123';
    const request = new Request('http://example.com/vrc/configs', {
      method: 'PUT',
      body: JSON.stringify(updateData),
      headers: { 'Content-Type': 'application/json' },
    });

    mockDb.first.mockResolvedValueOnce({ discord_id: adminId }).mockResolvedValueOnce({}); // Admin and exists

    const response = await UpdateVRCConfig(request, localEnv, adminId);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(400);
    expect(responseBody).toEqual({ success: false, error: 'At least one field to update is required: type_name or description' });
  });

  it('should return 500 for database update failure', async () => {
    const updateData = { type: 'banreason', id: 1, reason_text: 'Updated' };
    const adminId = 'admin_123';
    const request = new Request('http://example.com/vrc/configs', {
      method: 'PUT',
      body: JSON.stringify(updateData),
      headers: { 'Content-Type': 'application/json' },
    });

    mockDb.first.mockResolvedValueOnce({ discord_id: adminId }).mockResolvedValueOnce({}); // Admin and exists
    mockDb.run.mockResolvedValue({ success: false });

    const response = await UpdateVRCConfig(request, localEnv, adminId);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(500);
    expect(responseBody).toEqual({ success: false, error: 'Failed to update ban reason' });
  });
});