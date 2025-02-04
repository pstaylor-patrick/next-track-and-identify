import axios, { AxiosInstance, AxiosError } from 'axios';
import { config } from 'dotenv';
import { prisma } from '@/utils/prisma';
import type { Prisma } from '@prisma/client';

// Load environment variables
config();

const waitForProfile = async (identifier: { anonymousId?: string; userId?: string }, maxAttempts = 5) => {
  for (let i = 0; i < maxAttempts; i++) {
    const where: Prisma.ProfileWhereInput = {
      OR: [
        identifier.userId ? { id: identifier.userId } : null,
        identifier.anonymousId ? { anonymousId: identifier.anonymousId } : null,
      ].filter((condition): condition is Exclude<typeof condition, null> => condition !== null)
    };

    const profile = await prisma.profile.findFirst({ where });
    if (profile) return profile;
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  throw new Error('Profile not found after waiting');
};

describe('API Integration Tests', () => {
  let client: AxiosInstance;
  
  beforeAll(async () => {
    // Create axios instance with common config
    client = axios.create({
      baseURL: 'http://localhost:3000/api/v0',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.API_KEY,
      },
      validateStatus: null,
    });

    // Clean up any existing test data
    await prisma.event.deleteMany({
      where: {
        profile: {
          OR: [
            { id: { in: ['test-user-1', 'test-user-2'] } },
            { anonymousId: { in: ['anon-123', 'anon-456'] } }
          ]
        }
      }
    });
    await prisma.metric.deleteMany({
      where: {
        name: { in: ['test_event', 'anonymous_test_event', 'user_converted'] }
      }
    });
    await prisma.profile.deleteMany({
      where: {
        OR: [
          { id: { in: ['test-user-1', 'test-user-2'] } },
          { anonymousId: { in: ['anon-123', 'anon-456'] } }
        ]
      }
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.event.deleteMany({
      where: {
        profile: {
          OR: [
            { id: { in: ['test-user-1', 'test-user-2'] } },
            { anonymousId: { in: ['anon-123', 'anon-456'] } }
          ]
        }
      }
    });
    await prisma.metric.deleteMany({
      where: {
        name: { in: ['test_event', 'anonymous_test_event', 'user_converted'] }
      }
    });
    await prisma.profile.deleteMany({
      where: {
        OR: [
          { id: { in: ['test-user-1', 'test-user-2'] } },
          { anonymousId: { in: ['anon-123', 'anon-456'] } }
        ]
      }
    });
  });

  // Helper to check if server is running
  const checkServer = async () => {
    try {
      await axios.get('http://localhost:3000');
    } catch (error) {
      throw new Error('Server is not running. Please start with `npm run dev`');
    }
  };

  beforeEach(async () => {
    await checkServer();
  });

  describe('User Identification and Event Tracking Flow', () => {
    it('should handle the complete user journey', async () => {
      // Test 1: Identify a new user
      const identifyPayload = {
        userId: 'test-user-1',
        anonymousId: 'anon-123',
        traits: {
          name: 'Test User',
          email: 'test@example.com'
        }
      };
      console.log('Identify payload:', identifyPayload);
      
      const identifyResponse = await client.post('/identify', identifyPayload);
      console.log('Identify response:', identifyResponse.data);

      if (identifyResponse.status !== 200) {
        console.error('Identify request failed:', {
          status: identifyResponse.status,
          data: identifyResponse.data
        });
        throw new Error(`Identify request failed with status ${identifyResponse.status}`);
      }

      expect(identifyResponse.status).toBe(200);
      expect(identifyResponse.data.success).toBe(true);
      expect(identifyResponse.data.data.profileId).toBeDefined();

      const profileId = identifyResponse.data.data.profileId;

      // Test 2: Track an event for the identified user
      const trackPayload = {
        userId: profileId,
        event: 'test_event',
        properties: {
          action: 'test',
          timestamp: new Date().toISOString()
        }
      };
      console.log('Track payload:', trackPayload);
      
      const trackResponse = await client.post('/track', trackPayload);
      console.log('Track response:', trackResponse.data);

      expect(trackResponse.status).toBe(200);
      expect(trackResponse.data.success).toBe(true);
      expect(trackResponse.data.data.eventId).toBeDefined();

      // Test 3: Track an anonymous event
      const anonTrackPayload = {
        anonymousId: 'anon-456',
        event: 'anonymous_test_event',
        properties: {
          action: 'anonymous_test',
          source: 'integration_test'
        }
      };
      console.log('Anonymous track payload:', anonTrackPayload);
      
      const anonymousTrackResponse = await client.post('/track', anonTrackPayload);
      console.log('Anonymous track response:', anonymousTrackResponse.data);

      expect(anonymousTrackResponse.status).toBe(200);
      expect(anonymousTrackResponse.data.success).toBe(true);

      // Wait for anonymous profile to be created
      const anonProfile = await waitForProfile({ anonymousId: 'anon-456' });
      console.log('Found anonymous profile:', anonProfile);

      // Test 4: Identify anonymous user
      const identifyAnonPayload = {
        userId: 'test-user-2',
        anonymousId: anonProfile.anonymousId,
        traits: {
          name: 'Anonymous User',
          converted: true
        }
      };
      console.log('Identify anon payload:', identifyAnonPayload);
      
      const identifyAnonResponse = await client.post('/identify', identifyAnonPayload);
      console.log('Identify anon response:', identifyAnonResponse.data);

      if (identifyAnonResponse.status !== 200) {
        console.error('Identify anon request failed:', {
          status: identifyAnonResponse.status,
          data: identifyAnonResponse.data,
          existingProfile: anonProfile
        });
      }

      expect(identifyAnonResponse.status).toBe(200);
      expect(identifyAnonResponse.data.success).toBe(true);

      // Test 5: Track event for converted user
      const convertedTrackPayload = {
        userId: 'test-user-2',
        event: 'user_converted',
        properties: {
          previous_anonymous_id: 'anon-456',
          conversion_time: new Date().toISOString()
        }
      };
      console.log('Converted track payload:', convertedTrackPayload);
      
      const convertedTrackResponse = await client.post('/track', convertedTrackPayload);
      console.log('Converted track response:', convertedTrackResponse.data);

      expect(convertedTrackResponse.status).toBe(200);
      expect(convertedTrackResponse.data.success).toBe(true);

      // Verify database records
      const profiles = await prisma.profile.findMany({
        where: {
          id: { in: ['test-user-1', 'test-user-2'] }
        }
      });
      expect(profiles).toHaveLength(2);

      const events = await prisma.event.findMany({
        where: {
          profile: {
            id: { in: ['test-user-1', 'test-user-2'] }
          }
        },
        include: {
          metric: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
      expect(events.length).toBeGreaterThanOrEqual(3);

      // Verify specific event data
      const testEvent = events.find(e => e.metric.name === 'test_event');
      expect(testEvent).toBeDefined();
      expect(testEvent?.data).toHaveProperty('action', 'test');

      const conversionEvent = events.find(e => e.metric.name === 'user_converted');
      expect(conversionEvent).toBeDefined();
      expect(conversionEvent?.data).toHaveProperty('previous_anonymous_id', 'anon-456');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid API key', async () => {
      const invalidClient = axios.create({
        baseURL: 'http://localhost:3000/api/v0',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'invalid-key',
        },
        validateStatus: null,
      });

      const response = await invalidClient.post('/identify', {
        userId: 'test-user',
        traits: { name: 'Test' }
      });

      expect(response.status).toBe(401);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toBe('Unauthorized');
    });

    it('should handle invalid request data', async () => {
      const response = await client.post('/track', {
        // Missing required event name
        userId: 'test-user',
        properties: {}
      });

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
    });
  });
}); 