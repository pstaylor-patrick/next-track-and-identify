import { NextRequest } from 'next/server';
import { validateApiKey } from './auth';

describe('validateApiKey', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.API_KEY = 'test-api-key';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should validate correct API key', () => {
    const mockRequest = new NextRequest(new Request('http://localhost'), {
      headers: new Headers({
        'x-api-key': 'test-api-key'
      })
    });

    expect(validateApiKey(mockRequest)).toBe(true);
  });

  it('should reject invalid API key', () => {
    const mockRequest = new NextRequest(new Request('http://localhost'), {
      headers: new Headers({
        'x-api-key': 'wrong-key'
      })
    });

    expect(validateApiKey(mockRequest)).toBe(false);
  });
}); 