import { NextRequest } from 'next/server';
import { POST } from './route';
import { validateApiKey } from '@/lib/middleware/auth';
import { ProfileService } from '@/lib/services/ProfileService';

// Mock the services
jest.mock('@/lib/services/ProfileService');
jest.mock('@/lib/middleware/auth', () => ({
  validateApiKey: jest.fn()
}));

jest.mock('../../../../lib/middleware/rateLimiter', () => ({
  rateLimiter: jest.fn().mockResolvedValue(undefined),
}));

describe('Identify API', () => {
  const originalEnv = process.env;
  const mockProfile = {
    id: 'test-user',
    // ... other profile fields
  };

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.API_KEY = 'test-api-key';
    (validateApiKey as jest.Mock).mockReturnValue(true);
    (ProfileService.identifyProfile as jest.Mock).mockResolvedValue(mockProfile);
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  it('should identify users with valid data', async () => {
    const request = new NextRequest('http://localhost/api/v0/identify', {
      method: 'POST',
      body: JSON.stringify({
        userId: 'test-user',
        traits: {
          name: 'Test User',
          email: 'test@example.com'
        }
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(ProfileService.identifyProfile).toHaveBeenCalledWith({
      userId: 'test-user',
      traits: {
        name: 'Test User',
        email: 'test@example.com'
      }
    });

    expect(response.status).toBe(200);
    expect(data).toMatchObject({
      success: true,
      message: 'User identified successfully',
      data: expect.objectContaining({
        profileId: expect.any(String)
      })
    });
  });

  it('should accept identify calls with anonymousId', async () => {
    const request = new NextRequest('http://localhost/api/v0/identify', {
      method: 'POST',
      body: JSON.stringify({
        userId: 'test-user',
        anonymousId: 'anon-123',
        traits: {
          name: 'Test User'
        }
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toMatchObject({
      success: true,
      message: 'User identified successfully',
      data: expect.objectContaining({
        profileId: expect.any(String)
      })
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
    (validateApiKey as jest.Mock).mockReturnValue(false);

    const request = new NextRequest('http://localhost/api/v0/identify', {
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
    });

    const response = await POST(request);
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