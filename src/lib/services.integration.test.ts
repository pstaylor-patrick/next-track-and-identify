import { prisma } from '@/utils/prisma';
import { ProfileService } from './services/ProfileService';
import { TrackingService } from './services/TrackingService';
import type { TrackEvent } from '@/types/tracking';

describe('Service Integration Tests', () => {
  // Clean up test data before each test
  beforeEach(async () => {
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
        name: { in: ['test_event', 'page_view', 'signup_click'] }
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

  describe('ProfileService', () => {
    describe('identifyProfile', () => {
      it('should create a new identified profile', async () => {
        const profile = await ProfileService.identifyProfile({
          userId: 'test-user-1',
          traits: {
            name: 'Test User',
            email: 'test@example.com'
          }
        });

        expect(profile.id).toBe('test-user-1');
        expect(profile.isAnonymous).toBe(false);
        expect(profile.properties).toEqual({
          name: 'Test User',
          email: 'test@example.com'
        });
      });

      it('should convert anonymous profile to identified', async () => {
        // First create anonymous profile
        const anonProfile = await ProfileService.getOrCreateProfile({
          anonymousId: 'anon-123'
        });

        expect(anonProfile?.isAnonymous).toBe(true);
        expect(anonProfile?.anonymousId).toBe('anon-123');

        // Then identify it
        const identifiedProfile = await ProfileService.identifyProfile({
          userId: 'test-user-1',
          anonymousId: 'anon-123',
          traits: {
            name: 'Test User'
          }
        });

        expect(identifiedProfile.id).toBe('test-user-1');
        expect(identifiedProfile.anonymousId).toBe('anon-123');
        expect(identifiedProfile.isAnonymous).toBe(false);
        expect(identifiedProfile.properties).toEqual({
          name: 'Test User'
        });
      });

      it('should update existing identified profile', async () => {
        // Create initial profile
        await ProfileService.identifyProfile({
          userId: 'test-user-1',
          traits: { name: 'Test User' }
        });

        // Update profile
        const updatedProfile = await ProfileService.identifyProfile({
          userId: 'test-user-1',
          traits: {
            name: 'Updated Name',
            email: 'test@example.com'
          }
        });

        expect(updatedProfile.id).toBe('test-user-1');
        expect(updatedProfile.properties).toEqual({
          name: 'Updated Name',
          email: 'test@example.com'
        });
      });
    });

    describe('getOrCreateProfile', () => {
      it('should create anonymous profile', async () => {
        const profile = await ProfileService.getOrCreateProfile({
          anonymousId: 'anon-123'
        });

        expect(profile?.anonymousId).toBe('anon-123');
        expect(profile?.isAnonymous).toBe(true);
      });

      it('should return existing profile by userId', async () => {
        // Create profile first
        await ProfileService.identifyProfile({
          userId: 'test-user-1',
          traits: { name: 'Test User' }
        });

        // Get existing profile
        const profile = await ProfileService.getOrCreateProfile({
          userId: 'test-user-1'
        });

        expect(profile?.id).toBe('test-user-1');
        expect(profile?.properties).toEqual({
          name: 'Test User'
        });
      });

      it('should throw error if no identifier provided', async () => {
        await expect(ProfileService.getOrCreateProfile({}))
          .rejects
          .toThrow('Either userId or anonymousId must be provided');
      });
    });
  });

  describe('TrackingService', () => {
    describe('trackEvent', () => {
      it('should track event for identified user', async () => {
        // First create a profile
        const profile = await ProfileService.identifyProfile({
          userId: 'test-user-1',
          traits: { name: 'Test User' }
        });

        // Track an event
        const event = await TrackingService.trackEvent({
          profileId: profile.id,
          event: 'test_event',
          properties: {
            action: 'test',
            timestamp: new Date().toISOString()
          }
        });

        // Get full event details for assertions
        const fullEvent = await prisma.event.findUnique({
          where: { id: event.id },
          include: {
            profile: true,
            metric: true
          }
        });

        expect(fullEvent?.profile.id).toBe('test-user-1');
        expect(fullEvent?.metric.name).toBe('test_event');
        expect(fullEvent?.data).toEqual({
          action: 'test',
          timestamp: expect.any(String)
        });
      });

      it('should track event for anonymous user', async () => {
        // First create anonymous profile
        const anonProfile = await ProfileService.getOrCreateProfile({
          anonymousId: 'anon-123'
        });

        if (!anonProfile) throw new Error('Failed to create anonymous profile');

        // Track an event
        const event = await TrackingService.trackEvent({
          profileId: anonProfile.id,
          event: 'page_view',
          properties: {
            path: '/home'
          }
        });

        // Get full event details
        const fullEvent = await prisma.event.findUnique({
          where: { id: event.id },
          include: {
            profile: true,
            metric: true
          }
        });

        expect(fullEvent?.profile.anonymousId).toBe('anon-123');
        expect(fullEvent?.profile.isAnonymous).toBe(true);
        expect(fullEvent?.metric.name).toBe('page_view');
        expect(fullEvent?.data).toEqual({
          path: '/home'
        });
      });

      it('should throw error if profileId not provided', async () => {
        await expect(TrackingService.trackEvent({
          event: 'test_event',
          properties: {}
        } as any)).rejects.toThrow();
      });
    });
  });

  describe('User Journey Integration', () => {
    it('should handle complete anonymous to identified flow', async () => {
      // 1. Create anonymous profile
      const anonProfile = await ProfileService.getOrCreateProfile({
        anonymousId: 'anon-123'
      });
      if (!anonProfile) throw new Error('Failed to create anonymous profile');

      // 2. Track anonymous event
      const anonEvent = await TrackingService.trackEvent({
        profileId: anonProfile.id,
        event: 'page_view',
        properties: {
          path: '/signup'
        }
      });

      // Get full anonymous event details
      const fullAnonEvent = await prisma.event.findUnique({
        where: { id: anonEvent.id },
        include: { profile: true }
      });

      expect(fullAnonEvent?.profile.isAnonymous).toBe(true);
      expect(fullAnonEvent?.profile.anonymousId).toBe('anon-123');

      // 3. User signs up - identify them
      const identifiedProfile = await ProfileService.identifyProfile({
        userId: 'test-user-1',
        anonymousId: 'anon-123',
        traits: {
          name: 'Test User',
          email: 'test@example.com'
        }
      });

      // 4. Track post-signup event
      const signupEvent = await TrackingService.trackEvent({
        profileId: identifiedProfile.id,
        event: 'signup_click',
        properties: {
          source: 'homepage',
          timestamp: new Date().toISOString()
        }
      });

      // Get full signup event details
      const fullSignupEvent = await prisma.event.findUnique({
        where: { id: signupEvent.id },
        include: { profile: true }
      });

      expect(fullSignupEvent?.profile.id).toBe('test-user-1');
      expect(fullSignupEvent?.profile.isAnonymous).toBe(false);

      // 5. Verify all events are linked to the same profile
      const events = await prisma.event.findMany({
        where: {
          profile: { id: identifiedProfile.id }
        },
        include: {
          metric: true,
          profile: true
        },
        orderBy: {
          createdAt: 'asc'
        }
      });

      expect(events).toHaveLength(2);
      expect(events[0].metric.name).toBe('page_view');
      expect(events[1].metric.name).toBe('signup_click');
      expect(events[0].profile.id).toBe(identifiedProfile.id);
      expect(events[1].profile.id).toBe(identifiedProfile.id);
    });
  });
}); 