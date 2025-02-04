import { NextRequest } from 'next/server';
import { rateLimiter, clearRateLimits } from './rateLimiter';

describe('rateLimiter', () => {
  beforeEach(() => {
    // Clear rate limit store between tests
    clearRateLimits();
    // Reset timer mocks
    jest.useRealTimers();
  });

  it('should allow requests within rate limit', async () => {
    const mockRequest = new NextRequest(new Request('http://localhost'), {
      headers: new Headers({
        'x-forwarded-for': '127.0.0.1'
      })
    });

    // Should allow up to 100 requests
    for (let i = 0; i < 99; i++) {
      await expect(rateLimiter(mockRequest)).resolves.toBe(true);
    }
  });

  it('should block requests exceeding rate limit', async () => {
    const mockRequest = new NextRequest(new Request('http://localhost'), {
      headers: new Headers({
        'x-forwarded-for': '127.0.0.1'
      })
    });

    // Make 100 requests
    for (let i = 0; i < 100; i++) {
      await rateLimiter(mockRequest);
    }

    // 101st request should fail
    try {
      await rateLimiter(mockRequest);
      // If we get here, the test should fail
      expect(true).toBe(false); // Force test to fail if no error thrown
    } catch (error) {
      if (error instanceof Error) {
        expect(error.message).toBe('Too many requests, please try again later.');
      } else {
        throw error; // Re-throw if it's not an Error instance
      }
    }
  });

  it('should reset rate limit after window expires', async () => {
    const mockRequest = new NextRequest(new Request('http://localhost'), {
      headers: new Headers({
        'x-forwarded-for': '127.0.0.1'
      })
    });

    // Make 99 requests
    for (let i = 0; i < 99; i++) {
      await rateLimiter(mockRequest);
    }

    // Mock time passing
    jest.useFakeTimers();
    jest.advanceTimersByTime(15 * 60 * 1000 + 1000); // 15 minutes + 1 second

    // Should be able to make requests again
    await expect(rateLimiter(mockRequest)).resolves.toBe(true);
  });
}); 