import { NextRequest } from 'next/server';
import { POST } from './route';
import { ProfileService } from '@/lib/services/ProfileService';
import { TrackingService } from '@/lib/services/TrackingService';

// Mock the services
jest.mock('@/lib/services/ProfileService');
jest.mock('@/lib/services/TrackingService');
jest.mock('@/lib/middleware/auth', () => ({
  validateApiKey: jest.fn().mockReturnValue(true),
}));
jest.mock('@/lib/middleware/rateLimiter', () => ({
  rateLimiter: jest.fn().mockResolvedValue(undefined),
}));

describe('Track API', () => {
  const mockProfile = {
    id: 'test-user',
    // ... other profile fields
  };

  const mockEvent = {
    id: 'event-123',
    // ... other event fields
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Set up default mock implementations
    (ProfileService.getOrCreateProfile as jest.Mock).mockResolvedValue(mockProfile);
    (TrackingService.trackEvent as jest.Mock).mockResolvedValue(mockEvent);
  });

  it('should track valid events', async () => {
    const request = new NextRequest('http://localhost/api/v0/track', {
      method: 'POST',
      body: JSON.stringify({
        userId: 'test-user',
        event: 'test-event',
        properties: {
          test: 'value'
        }
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(ProfileService.getOrCreateProfile).toHaveBeenCalledWith({
      userId: 'test-user',
      anonymousId: undefined,
    });

    expect(TrackingService.trackEvent).toHaveBeenCalledWith({
      event: 'test-event',
      properties: { test: 'value' },
      profileId: 'test-user',
    });

    expect(response.status).toBe(200);
    expect(data).toMatchObject({
      success: true,
      message: 'Event tracked successfully',
      data: expect.objectContaining({
        eventId: expect.any(String)
      })
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