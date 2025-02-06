import { NextRequest } from 'next/server';
import { rateLimiter, clearRateLimits, getCurrentTime } from './rateLimiter';

jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
}));

describe('rateLimiter', () => {
  beforeEach(() => {
    clearRateLimits();
    jest.clearAllMocks();
    // Reset Date.now mock
    jest.spyOn(Date, 'now').mockRestore();
  });

  it('should allow requests within rate limit', async () => {
    const mockRequest = {
      headers: new Map([['x-forwarded-for', '127.0.0.1']]),
    };

    const result = await rateLimiter(mockRequest as unknown as NextRequest);
    expect(result).toBe(true);
  });

  it('should block requests exceeding rate limit', async () => {
    const mockRequest = {
      headers: new Map([['x-forwarded-for', '127.0.0.1']]),
    };

    // Make 100 requests
    for (let i = 0; i < 100; i++) {
      await rateLimiter(mockRequest as unknown as NextRequest);
    }

    // The 101st request should throw
    await expect(rateLimiter(mockRequest as unknown as NextRequest))
      .rejects
      .toThrow('Too many requests');
  });

  it('should reset counter after window expires', async () => {
    const mockRequest = {
      headers: new Map([['x-forwarded-for', '127.0.0.1']]),
    };

    // Make initial request
    await rateLimiter(mockRequest as unknown as NextRequest);

    // Move time forward beyond window
    const mockDate = new Date(Date.now() + 16 * 60 * 1000);
    jest.spyOn(Date, 'now').mockImplementation(() => mockDate.getTime());

    // Should allow new request
    const result = await rateLimiter(mockRequest as unknown as NextRequest);
    expect(result).toBe(true);
  });

  it('should handle multiple IPs in x-forwarded-for header', async () => {
    const mockRequest = {
      headers: new Map([['x-forwarded-for', '192.168.1.1, 10.0.0.1, 172.16.0.1']]),
    };

    const result = await rateLimiter(mockRequest as unknown as NextRequest);
    expect(result).toBe(true);

    // Make sure it's using the first IP
    for (let i = 0; i < 98; i++) {
      await rateLimiter(mockRequest as unknown as NextRequest);
    }

    // Should still allow one more request for this IP
    const finalResult = await rateLimiter(mockRequest as unknown as NextRequest);
    expect(finalResult).toBe(true);

    // Next request should throw
    await expect(rateLimiter(mockRequest as unknown as NextRequest))
      .rejects
      .toThrow('Too many requests');
  });

  it('should use default IP when x-forwarded-for is missing', async () => {
    const mockRequest = {
      headers: new Map(),
    };

    const result = await rateLimiter(mockRequest as unknown as NextRequest);
    expect(result).toBe(true);
  });

  it('should increment counter correctly', async () => {
    const mockRequest = {
      headers: new Map([['x-forwarded-for', '127.0.0.1']]),
    };

    // Make several requests
    await rateLimiter(mockRequest as unknown as NextRequest);
    await rateLimiter(mockRequest as unknown as NextRequest);
    await rateLimiter(mockRequest as unknown as NextRequest);

    // Make 97 more requests
    for (let i = 0; i < 97; i++) {
      await rateLimiter(mockRequest as unknown as NextRequest);
    }

    // The next request should throw
    await expect(rateLimiter(mockRequest as unknown as NextRequest))
      .rejects
      .toThrow('Too many requests');
  });

  it('should handle requests just before window expires', async () => {
    const mockRequest = {
      headers: new Map([['x-forwarded-for', '127.0.0.1']]),
    };

    // Make initial request
    await rateLimiter(mockRequest as unknown as NextRequest);

    // Move time forward to just before window expires (14 minutes 59 seconds)
    const almostExpiredTime = new Date(Date.now() + 14 * 60 * 1000 + 59 * 1000);
    jest.spyOn(Date, 'now').mockImplementation(() => almostExpiredTime.getTime());

    // Should still count against the same window
    const result = await rateLimiter(mockRequest as unknown as NextRequest);
    expect(result).toBe(true);
  });
}); 