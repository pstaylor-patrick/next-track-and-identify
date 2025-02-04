import { NextRequest } from 'next/server';
import { POST } from './route';

describe('Track API', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.API_KEY = 'test-api-key';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should track valid events', async () => {
    const mockRequest = new NextRequest(new Request('http://localhost', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'test-api-key'
      },
      body: JSON.stringify({
        event: 'test_event',
        userId: 'test-user',
        properties: {
          test: true
        }
      })
    }));

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      success: true,
      message: 'Event tracked successfully'
    });
  });

  it('should reject invalid events', async () => {
    const mockRequest = new NextRequest(new Request('http://localhost', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'test-api-key'
      },
      body: JSON.stringify({
        // Missing required event name
        userId: 'test-user'
      })
    }));

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
  });
}); 