import { NextRequest } from 'next/server';
import { validateApiKey } from './auth';

describe('auth middleware', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    process.env.API_KEY = 'test-api-key';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should validate correct API key', () => {
    const mockRequest = {
      headers: new Map([['x-api-key', 'test-api-key']]),
    };

    const result = validateApiKey(mockRequest as unknown as NextRequest);
    expect(result).toBe(true);
  });

  it('should reject invalid API key', () => {
    const mockRequest = {
      headers: new Map([['x-api-key', 'wrong-key']]),
    };

    const result = validateApiKey(mockRequest as unknown as NextRequest);
    expect(result).toBe(false);
  });

  it('should reject missing API key', () => {
    const mockRequest = {
      headers: new Map(),
    };

    const result = validateApiKey(mockRequest as unknown as NextRequest);
    expect(result).toBe(false);
  });

  it('should reject empty string API key', () => {
    const mockRequest = {
      headers: new Map([['x-api-key', '']]),
    };

    const result = validateApiKey(mockRequest as unknown as NextRequest);
    expect(result).toBe(false);
  });

  it('should handle case-insensitive header name', () => {
    const mockRequest = {
      headers: new Map([['X-API-KEY', 'test-api-key']]),
    };

    const result = validateApiKey(mockRequest as unknown as NextRequest);
    expect(result).toBe(true);
  });

  it('should reject API key with extra whitespace', () => {
    const mockRequest = {
      headers: new Map([['x-api-key', ' test-api-key ']]),
    };

    const result = validateApiKey(mockRequest as unknown as NextRequest);
    expect(result).toBe(false);
  });

  it('should handle undefined API key environment variable', () => {
    delete process.env.API_KEY;
    
    const mockRequest = {
      headers: new Map([['x-api-key', 'test-api-key']]),
    };

    const result = validateApiKey(mockRequest as unknown as NextRequest);
    expect(result).toBe(false);
  });
}); 