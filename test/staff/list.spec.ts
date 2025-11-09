/**
 * @file        test/staff/list.spec.ts
 * @author      vicentefelipechile
 * @description Unit tests for the ListStaff function.
 */

import { env } from 'cloudflare:test';
import { describe, it, expect, vi } from 'vitest';
import { ListStaff } from '../../src/staff/list';

// Mock LogIt function
vi.mock('../../src/loglevel', () => ({
  LogIt: vi.fn(),
  LogLevel: {
    INFO: 3,
    WARNING: 4,
    ERROR: 5,
  }
}));

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

describe('ListStaff Handler', () => {
  const mockUserId = 'stf_123e4567-e89b-12d3-a456-426614174000';

  it('should return all staff members successfully without filters', async () => {
    const testDate = new Date().toISOString();
    const mockStaff = [
      { 
        staff_id: 'stf_123e4567-e89b-12d3-a456-426614174000',
        discord_id: '123456789', 
        discord_name: 'Staff Member 1',
        added_at: testDate,
        added_by: 'stf_admin',
      },
      { 
        staff_id: 'stf_223e4567-e89b-12d3-a456-426614174001',
        discord_id: '987654321', 
        discord_name: 'Staff Member 2',
        added_at: testDate,
        added_by: 'stf_admin',
      }
    ];
    
    mockDb.all.mockResolvedValue({ results: mockStaff });

    const request = new Request('http://localhost/staff/list');
    const response = await ListStaff(request, localEnv, mockUserId);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(200);
    expect(responseBody.success).toBe(true);
    expect(responseBody.count).toBe(2);
    expect(responseBody.data).toHaveLength(2);
    expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('SELECT * FROM staff WHERE 1=1'));
  });

  it('should return staff members with limit parameter', async () => {
    const testDate = new Date().toISOString();
    const mockStaff = [
      { 
        staff_id: 'stf_123e4567-e89b-12d3-a456-426614174000',
        discord_id: '123456789', 
        discord_name: 'Staff Member 1',
        added_at: testDate,
        added_by: 'stf_admin',
      }
    ];
    
    mockDb.all.mockResolvedValue({ results: mockStaff });

    const request = new Request('http://localhost/staff/list?limit=1');
    const response = await ListStaff(request, localEnv, mockUserId);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(200);
    expect(responseBody.success).toBe(true);
    expect(responseBody.count).toBe(1);
    expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('LIMIT ?'));
    expect(mockDb.bind).toHaveBeenCalledWith(1);
  });

  it('should return staff members with date filters', async () => {
    const testDate = new Date().toISOString();
    const mockStaff = [
      { 
        staff_id: 'stf_123e4567-e89b-12d3-a456-426614174000',
        discord_id: '123456789', 
        discord_name: 'Staff Member 1',
        added_at: testDate,
        added_by: 'stf_admin',
      }
    ];
    
    mockDb.all.mockResolvedValue({ results: mockStaff });

    const startDate = '2024-01-01';
    const endDate = '2024-12-31';
    const request = new Request(`http://localhost/staff/list?start_date=${startDate}&end_date=${endDate}`);
    const response = await ListStaff(request, localEnv, mockUserId);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(200);
    expect(responseBody.success).toBe(true);
    expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('added_at >= ?'));
    expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('added_at <= ?'));
    expect(mockDb.bind).toHaveBeenCalledWith(startDate, endDate);
  });

  it('should return staff members with created_by filter', async () => {
    const testDate = new Date().toISOString();
    const createdBy = 'stf_admin';
    const mockStaff = [
      { 
        staff_id: 'stf_123e4567-e89b-12d3-a456-426614174000',
        discord_id: '123456789', 
        discord_name: 'Staff Member 1',
        added_at: testDate,
        added_by: createdBy,
      }
    ];
    
    mockDb.all.mockResolvedValue({ results: mockStaff });

    const request = new Request(`http://localhost/staff/list?created_by=${createdBy}`);
    const response = await ListStaff(request, localEnv, mockUserId);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(200);
    expect(responseBody.success).toBe(true);
    expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('added_by = ?'));
    expect(mockDb.bind).toHaveBeenCalledWith(createdBy);
  });

  it('should return error for invalid limit parameter', async () => {
    const request = new Request('http://localhost/staff/list?limit=invalid');
    const response = await ListStaff(request, localEnv, mockUserId);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(400);
    expect(responseBody.success).toBe(false);
    expect(responseBody.error).toContain('Invalid limit parameter');
  });

  it('should return error for negative limit parameter', async () => {
    const request = new Request('http://localhost/staff/list?limit=-1');
    const response = await ListStaff(request, localEnv, mockUserId);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(400);
    expect(responseBody.success).toBe(false);
    expect(responseBody.error).toContain('Invalid limit parameter');
  });

  it('should return empty array when no staff members found', async () => {
    mockDb.all.mockResolvedValue({ results: [] });

    const request = new Request('http://localhost/staff/list');
    const response = await ListStaff(request, localEnv, mockUserId);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(200);
    expect(responseBody.success).toBe(true);
    expect(responseBody.count).toBe(0);
    expect(responseBody.data).toEqual([]);
  });

  it('should handle database errors gracefully', async () => {
    mockDb.all.mockRejectedValue(new Error('Database error'));

    const request = new Request('http://localhost/staff/list');
    const response = await ListStaff(request, localEnv, mockUserId);
    const responseBody = await response.json() as any;

    expect(response.status).toBe(500);
    expect(responseBody.success).toBe(false);
    expect(responseBody.error).toBe('Internal Server Error');
  });
});
