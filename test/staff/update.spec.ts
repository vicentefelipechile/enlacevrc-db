/**
 * @file        test/staff/update.spec.ts
 * @author      vicentefelipechile
 * @description Unit tests for the UpdateStaff function.
 */

import { env } from 'cloudflare:test';
import { describe, it, expect, vi } from 'vitest';
import { UpdateStaff } from '../../src/staff/update';

// =================================================================================================
// Mock Setup
// =================================================================================================

const mockDb = {
  prepare: vi.fn().mockReturnThis(),
  bind: vi.fn().mockReturnThis(),
  first: vi.fn(),
  run: vi.fn(),
};

const localEnv = { ...env, DB: mockDb as any };

// =================================================================================================
// Test Suite
// =================================================================================================

describe('UpdateStaff Handler', () => {
  const staffId = 'staff_123';

  it('should update a staff member name successfully', async () => {
    const updateData = { discord_name: 'Updated Name' };
    const request = new Request(`http://example.com/staff/${staffId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
      headers: { 'Content-Type': 'application/json' },
    });

    mockDb.first.mockResolvedValue({ discord_id: staffId, discord_name: 'Old Name' });
    mockDb.run.mockResolvedValue({ success: true });

    const response = await UpdateStaff(request, staffId, localEnv);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(200);
    expect(responseBody).toEqual({ success: true, message: 'Staff member updated successfully' });
    expect(mockDb.prepare).toHaveBeenCalledWith('UPDATE staff SET discord_name = ? WHERE discord_id = ?');
    expect(mockDb.bind).toHaveBeenCalledWith(updateData.discord_name, staffId);
  });

  it('should return 400 if no fields are provided for update', async () => {
    const request = new Request(`http://example.com/staff/${staffId}`, {
      method: 'PUT',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await UpdateStaff(request, staffId, localEnv);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(400);
    expect(responseBody).toEqual({ success: false, error: 'No fields provided to update' });
  });

  it('should return 400 if no valid fields are provided', async () => {
    const request = new Request(`http://example.com/staff/${staffId}`, {
      method: 'PUT',
      body: JSON.stringify({ invalid_field: 'value' }),
      headers: { 'Content-Type': 'application/json' },
    });

    mockDb.first.mockResolvedValue({ discord_id: staffId, name: 'Old Name' });

    const response = await UpdateStaff(request, staffId, localEnv);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(400);
    expect(responseBody).toEqual({ success: false, error: 'No valid fields provided to update. Only discord_name can be updated' });
  });

  it('should return 404 if the staff member to update does not exist', async () => {
    const updateData = { discord_name: 'New Name' };
    const request = new Request(`http://example.com/staff/${staffId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
      headers: { 'Content-Type': 'application/json' },
    });

    mockDb.first.mockResolvedValue(null);

    const response = await UpdateStaff(request, staffId, localEnv);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(404);
    expect(responseBody).toEqual({ success: false, error: 'Staff member not found' });
  });

  it('should return 500 on database update failure', async () => {
    const updateData = { discord_name: 'New Name' };
    const request = new Request(`http://example.com/staff/${staffId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
      headers: { 'Content-Type': 'application/json' }
    });

    mockDb.first.mockResolvedValue({ discord_id: staffId, discord_name: 'Old Name' });
    mockDb.run.mockResolvedValue({ success: false });

    const response = await UpdateStaff(request, staffId, localEnv);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(500);
    expect(responseBody).toEqual({ success: false, error: 'Failed to update staff member' });
  });

  it('should return 400 for invalid JSON', async () => {
    const request = new Request(`http://example.com/staff/${staffId}`, {
      method: 'PUT',
      body: '{"invalid_json',
      headers: { 'Content-Type': 'application/json' }
    });

    const response = await UpdateStaff(request, staffId, localEnv);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(400);
    expect(responseBody).toEqual({ success: false, error: 'Invalid JSON in request body' });
  });

  it('should return 500 for unexpected errors', async () => {
    const updateData = { name: 'New Name' };
    const request = new Request(`http://example.com/staff/${staffId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
      headers: { 'Content-Type': 'application/json' }
    });

    mockDb.first.mockRejectedValue(new Error('Database connection failed'));

    const response = await UpdateStaff(request, staffId, localEnv);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(500);
    expect(responseBody).toEqual({ success: false, error: 'Internal Server Error' });
  });
});
