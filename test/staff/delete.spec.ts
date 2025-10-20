/**
 * @file        test/staff/delete.spec.ts
 * @author      vicentefelipechile
 * @description Unit tests for the DeleteStaff function.
 */

import { env } from 'cloudflare:test';
import { describe, it, expect, vi } from 'vitest';
import { DeleteStaff } from '../../src/staff/delete';

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

describe('DeleteStaff Handler', () => {
  it('should delete a staff member successfully', async () => {
    const staffId = 'staff_123';
    const existingStaff = {
      id: 1,
      discord_id: staffId,
      name: 'John Doe',
      added_at: new Date()
    };

    mockDb.first.mockResolvedValue(existingStaff);
    mockDb.run.mockResolvedValue({ success: true });

    const response = await DeleteStaff(staffId, localEnv);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(200);
    expect(responseBody).toEqual({ success: true, message: 'Staff member deleted successfully' });
    expect(mockDb.prepare).toHaveBeenCalledWith('SELECT * FROM staff WHERE discord_id = ?');
    expect(mockDb.bind).toHaveBeenCalledWith(staffId);
    expect(mockDb.prepare).toHaveBeenCalledWith('DELETE FROM staff WHERE discord_id = ?');
  });

  it('should return 404 if the staff member does not exist', async () => {
    const staffId = 'staff_not_found';

    mockDb.first.mockResolvedValue(null);

    const response = await DeleteStaff(staffId, localEnv);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(404);
    expect(responseBody).toEqual({ success: false, error: 'Staff member not found' });
  });

  it('should return 500 if database deletion fails', async () => {
    const staffId = 'staff_123';
    const existingStaff = {
      id: 1,
      discord_id: staffId,
      name: 'John Doe',
      added_at: new Date()
    };

    mockDb.first.mockResolvedValue(existingStaff);
    mockDb.run.mockResolvedValue({ success: false });

    const response = await DeleteStaff(staffId, localEnv);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(500);
    expect(responseBody).toEqual({ success: false, error: 'Failed to delete staff member' });
  });

  it('should return 500 for an unexpected server error', async () => {
    const staffId = 'staff_123';
    const errorMessage = 'Database connection lost';

    mockDb.first.mockRejectedValue(new Error(errorMessage));

    const response = await DeleteStaff(staffId, localEnv);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(500);
    expect(responseBody).toEqual({ success: false, error: 'Internal Server Error' });
  });
});
