/**
 * @file        test/staff/add.spec.ts
 * @author      vicentefelipechile
 * @description Unit tests for the AddStaff function.
 */

import { env } from 'cloudflare:test';
import { describe, it, expect, vi } from 'vitest';
import { AddStaff } from '../../src/staff/add';

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

describe('AddStaff Handler', () => {
  it('should add a staff member successfully', async () => {
    const newStaff = { discord_id: 'staff_123', discord_name: 'John Doe', added_by: 'admin_456' };
    const request = new Request('http://example.com/staff', {
      method: 'POST',
      body: JSON.stringify(newStaff),
      headers: { 'Content-Type': 'application/json' },
    });

    mockDb.first.mockResolvedValue({ '1': 1 }); // Admin exists
    mockDb.run.mockResolvedValue({ success: true });

    const response = await AddStaff(request, localEnv);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(201);
    expect(responseBody).toEqual({ success: true, message: 'Staff member added successfully' });
    expect(mockDb.prepare).toHaveBeenCalledWith('INSERT INTO staff (discord_id, discord_name, added_by) VALUES (?, ?, ?)');
    expect(mockDb.bind).toHaveBeenCalledWith(newStaff.discord_id, newStaff.discord_name, newStaff.added_by);
  });

  it('should return 400 for missing discord_id', async () => {
    const newStaff = { discord_name: 'John Doe' };
    const request = new Request('http://example.com/staff', {
      method: 'POST',
      body: JSON.stringify(newStaff),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await AddStaff(request, localEnv);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(400);
    expect(responseBody).toEqual({ success: false, error: 'Missing required fields: discord_id and added_by are required' });
  });

  it('should return 400 for missing added_by', async () => {
    const newStaff = { discord_id: 'staff_123' };
    const request = new Request('http://example.com/staff', {
      method: 'POST',
      body: JSON.stringify(newStaff),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await AddStaff(request, localEnv);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(400);
    expect(responseBody).toEqual({ success: false, error: 'Missing required fields: discord_id and added_by are required' });
  });

  it('should return 400 for invalid JSON', async () => {
    const request = new Request('http://example.com/staff', {
      method: 'POST',
      body: '{"invalid_json',
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await AddStaff(request, localEnv);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(400);
    expect(responseBody).toEqual({ success: false, error: 'Invalid JSON in request body' });
  });

  it('should return 409 if the staff member already exists', async () => {
    const newStaff = { discord_id: 'staff_123', discord_name: 'John Doe', added_by: 'admin_456' };
    const request = new Request('http://example.com/staff', {
      method: 'POST',
      body: JSON.stringify(newStaff),
      headers: { 'Content-Type': 'application/json' },
    });

    mockDb.first.mockResolvedValue({ '1': 1 }); // Admin exists
    mockDb.run.mockResolvedValue({ success: false });

    const response = await AddStaff(request, localEnv);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(409);
    expect(responseBody).toEqual({ success: false, error: 'Failed to add staff member. It may already exist' });
  });

  it('should return 500 for unexpected errors', async () => {
    const newStaff = { discord_id: 'staff_123', discord_name: 'John Doe', added_by: 'admin_456' };
    const request = new Request('http://example.com/staff', {
      method: 'POST',
      body: JSON.stringify(newStaff),
      headers: { 'Content-Type': 'application/json' },
    });

    mockDb.first.mockResolvedValue({ '1': 1 }); // Admin exists
    mockDb.run.mockRejectedValue(new Error('Database connection failed'));

    const response = await AddStaff(request, localEnv);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(500);
    expect(responseBody).toEqual({ success: false, error: 'Internal Server Error' });
  });
});
