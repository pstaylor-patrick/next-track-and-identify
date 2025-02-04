import { NextRequest } from 'next/server';
import { POST } from './route';

describe('Identify API', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.API_KEY = 'test-api-key';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should identify users with valid data', async () => {
    const mockRequest = new NextRequest(new Request('http://localhost', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'test-api-key'
      },
      body: JSON.stringify({
        userId: 'test-user',
        traits: {
          name: 'Test User',
          email: 'test@example.com',
          plan: 'premium'
        }
      })
    }));

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      success: true,
      message: 'User identified successfully'
    });
  });

  it('should accept identify calls with anonymousId', async () => {
    const mockRequest = new NextRequest(new Request('http://localhost', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'test-api-key'
      },
      body: JSON.stringify({
        userId: 'test-user',
        anonymousId: 'anon-123',
        traits: {
          name: 'Test User'
        }
      })
    }));

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      success: true,
      message: 'User identified successfully'
    });
  });

  it('should reject requests without userId', async () => {
    const mockRequest = new NextRequest(new Request('http://localhost', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'test-api-key'
      },
      body: JSON.stringify({
        // Missing required userId
        traits: {
          name: 'Test User'
        }
      })
    }));

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
  });

  it('should reject requests with invalid API key', async () => {
    const mockRequest = new NextRequest(new Request('http://localhost', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'wrong-key'
      },
      body: JSON.stringify({
        userId: 'test-user',
        traits: {
          name: 'Test User'
        }
      })
    }));

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Unauthorized');
  });

  it('should handle malformed JSON', async () => {
    const mockRequest = new NextRequest(new Request('http://localhost', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'test-api-key'
      },
      body: 'invalid-json'
    }));

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
  });
}); 