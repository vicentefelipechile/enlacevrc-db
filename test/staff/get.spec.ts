/**
 * @file        test/staff/get.spec.ts
 * @author      vicentefelipechile
 * @description Unit tests for the GetStaff function.
 */

import { env } from 'cloudflare:test';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetStaff } from '../../src/staff/get';

// =================================================================================================
// Mock Setup
// =================================================================================================

const mockDb = {
  prepare: vi.fn().mockReturnThis(),
  bind: vi.fn().mockReturnThis(),
  first: vi.fn(),
  all: vi.fn(),
};

const localEnv = { ...env, DB: mockDb as any };

// =================================================================================================
// Test Suite
// =================================================================================================

describe('GetStaff Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return a staff member successfully by Discord ID', async () => {
    const staffId = 'staff_123';
    const mockDate = new Date().toISOString();
    const mockStaff = {
      id: 1,
      discord_id: staffId,
      name: 'John Doe',
      added_at: mockDate
    };

    mockDb.first.mockResolvedValue(mockStaff);

    const response = await GetStaff(staffId, localEnv);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(200);
    expect(responseBody).toEqual({
      success: true,
      data: {
        id: 1,
        discord_id: staffId,
        name: 'John Doe',
        added_at: mockDate
      }
    });
    expect(mockDb.prepare).toHaveBeenCalledWith('SELECT * FROM staff WHERE discord_id = ?');
    expect(mockDb.bind).toHaveBeenCalledWith(staffId);
  });

  it('should return all staff members when no ID is provided', async () => {
    const mockDate1 = new Date().toISOString();
    const mockDate2 = new Date().toISOString();
    const mockStaffList = [
      { id: 1, discord_id: 'staff_123', name: 'John Doe', added_at: mockDate1 },
      { id: 2, discord_id: 'staff_789', name: 'Jane Smith', added_at: mockDate2 }
    ];

    mockDb.all.mockResolvedValue({ results: mockStaffList });

    const response = await GetStaff(undefined, localEnv);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(200);
    expect(responseBody).toEqual({
      success: true,
      data: mockStaffList
    });
    expect(mockDb.prepare).toHaveBeenCalledWith('SELECT * FROM staff ORDER BY added_at DESC');
  });

  it('should return empty array when no staff members exist', async () => {
    mockDb.all.mockResolvedValue({ results: [] });

    const response = await GetStaff(undefined, localEnv);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(200);
    expect(responseBody).toEqual({
      success: true,
      data: []
    });
  });

  it('should return 404 if staff member is not found', async () => {
    const staffId = 'staff_not_found';
    mockDb.first.mockResolvedValue(null);

    const response = await GetStaff(staffId, localEnv);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(404);
    expect(responseBody).toEqual({ success: false, error: 'Staff member not found' });
  });

  it('should return 500 on database error', async () => {
    const staffId = 'staff_123';
    const errorMessage = 'Database connection failed';

    mockDb.first.mockRejectedValue(new Error(errorMessage));

    const response = await GetStaff(staffId, localEnv);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(500);
    expect(responseBody).toEqual({ success: false, error: 'Internal Server Error' });
  });
});
