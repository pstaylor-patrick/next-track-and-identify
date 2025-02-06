import { ProfileService } from './ProfileService';
import { prisma } from '@/utils/prisma';
import { IdentifyEvent, TrackEvent } from '@/types/tracking';

// Mock prisma
jest.mock('@/utils/prisma', () => ({
  prisma: {
    profile: {
      findUnique: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
  },
}));

describe('ProfileService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('identifyProfile', () => {
    it('should update existing anonymous profile when anonymousId matches', async () => {
      const mockProfile = {
        id: 'anon123',
        anonymousId: 'anon123',
        isAnonymous: true,
      };

      const identifyEvent: IdentifyEvent = {
        userId: 'user123',
        anonymousId: 'anon123',
        traits: { name: 'Test User' },
      };

      (prisma.profile.findUnique as jest.Mock).mockResolvedValue(mockProfile);
      (prisma.profile.update as jest.Mock).mockResolvedValue({
        ...mockProfile,
        id: 'user123',
        isAnonymous: false,
      });

      await ProfileService.identifyProfile(identifyEvent);

      expect(prisma.profile.findUnique).toHaveBeenCalledWith({
        where: { anonymousId: 'anon123' },
      });

      expect(prisma.profile.update).toHaveBeenCalledWith({
        where: { id: 'anon123' },
        data: {
          id: 'user123',
          properties: { name: 'Test User' },
          isAnonymous: false,
          lastSeenAt: expect.any(Date),
        },
      });
    });

    it('should create new profile when no matching anonymous profile exists', async () => {
      const identifyEvent: IdentifyEvent = {
        userId: 'user123',
        traits: { name: 'Test User' },
      };

      (prisma.profile.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.profile.upsert as jest.Mock).mockResolvedValue({
        id: 'user123',
        isAnonymous: false,
      });

      await ProfileService.identifyProfile(identifyEvent);

      expect(prisma.profile.upsert).toHaveBeenCalledWith({
        where: { id: 'user123' },
        create: {
          id: 'user123',
          anonymousId: undefined,
          properties: { name: 'Test User' },
          isAnonymous: false,
        },
        update: {
          anonymousId: undefined,
          properties: { name: 'Test User' },
          isAnonymous: false,
          lastSeenAt: expect.any(Date),
        },
      });
    });

    it('should skip anonymous profile check when no anonymousId provided', async () => {
      const identifyEvent: IdentifyEvent = {
        userId: 'user123',
        traits: { name: 'Test User' },
      };

      (prisma.profile.upsert as jest.Mock).mockResolvedValue({
        id: 'user123',
        isAnonymous: false,
      });

      await ProfileService.identifyProfile(identifyEvent);

      expect(prisma.profile.findUnique).not.toHaveBeenCalled();
      expect(prisma.profile.upsert).toHaveBeenCalled();
    });
  });

  describe('getOrCreateProfile', () => {
    it('should return existing profile when userId is provided', async () => {
      const mockProfile = {
        id: 'user123',
        isAnonymous: false,
      };

      (prisma.profile.findUnique as jest.Mock).mockResolvedValue(mockProfile);

      const result = await ProfileService.getOrCreateProfile({ userId: 'user123' });

      expect(result).toEqual(mockProfile);
      expect(prisma.profile.findUnique).toHaveBeenCalledWith({
        where: { id: 'user123' },
      });
    });

    it('should create anonymous profile when only anonymousId is provided', async () => {
      const mockProfile = {
        anonymousId: 'anon123',
        isAnonymous: true,
      };

      (prisma.profile.upsert as jest.Mock).mockResolvedValue(mockProfile);

      const result = await ProfileService.getOrCreateProfile({ anonymousId: 'anon123' });

      expect(result).toEqual(mockProfile);
      expect(prisma.profile.upsert).toHaveBeenCalledWith({
        where: { anonymousId: 'anon123' },
        create: {
          anonymousId: 'anon123',
          isAnonymous: true,
        },
        update: {
          lastSeenAt: expect.any(Date),
        },
      });
    });

    it('should throw error when no identifier is provided', async () => {
      try {
        await ProfileService.getOrCreateProfile({});
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Either userId or anonymousId must be provided');
      }
    });
  });

  describe('getOrCreateProfileForTracking', () => {
    it('should return existing profile when userId matches', async () => {
      const mockProfile = {
        id: 'user123',
        isAnonymous: false,
      };

      const trackEvent: TrackEvent = {
        userId: 'user123',
        event: 'test_event',
        properties: {},
      };

      (prisma.profile.findUnique as jest.Mock).mockResolvedValue(mockProfile);

      const result = await ProfileService.getOrCreateProfileForTracking(trackEvent);

      expect(result).toEqual(mockProfile);
    });

    it('should create anonymous profile when only anonymousId provided', async () => {
      const mockProfile = {
        anonymousId: 'anon123',
        isAnonymous: true,
      };

      const trackEvent: TrackEvent = {
        anonymousId: 'anon123',
        event: 'test_event',
        properties: {},
      };

      (prisma.profile.upsert as jest.Mock).mockResolvedValue(mockProfile);

      const result = await ProfileService.getOrCreateProfileForTracking(trackEvent);

      expect(result).toEqual(mockProfile);
    });

    it('should create anonymous profile with userId as anonymousId when profile not found', async () => {
      const mockProfile = {
        anonymousId: 'user123',
        isAnonymous: true,
      };

      const trackEvent: TrackEvent = {
        userId: 'user123',
        event: 'test_event',
        properties: {},
      };

      (prisma.profile.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.profile.upsert as jest.Mock).mockResolvedValue(mockProfile);

      const result = await ProfileService.getOrCreateProfileForTracking(trackEvent);

      expect(result).toEqual(mockProfile);
      expect(prisma.profile.upsert).toHaveBeenCalledWith({
        where: { anonymousId: 'user123' },
        create: {
          anonymousId: 'user123',
          isAnonymous: true,
        },
        update: {
          lastSeenAt: expect.any(Date),
        },
      });
    });

    it('should throw error when no profile can be created', async () => {
      const trackEvent: TrackEvent = {
        event: 'test_event',
        properties: {},
        userId: undefined,
        anonymousId: undefined,
      };

      try {
        await ProfileService.getOrCreateProfileForTracking(trackEvent);
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Either userId or anonymousId must be provided');
      }
    });
  });
}); 