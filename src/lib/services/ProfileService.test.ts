import { ProfileService } from './ProfileService';
import { prisma } from '@/utils/prisma';
import { Profile } from '@prisma/client';

// Mock prisma
jest.mock('@/utils/prisma', () => ({
  prisma: {
    profile: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
    }
  }
}));

describe('ProfileService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('identifyProfile', () => {
    const mockProfile: Profile = {
      id: 'test-user',
      createdAt: new Date(),
      updatedAt: new Date(),
      anonymousId: 'anon-123',
      email: null,
      firstName: null,
      lastName: null,
      properties: { name: 'Test User' },
      mergedIntoId: null,
      isAnonymous: false,
      lastSeenAt: new Date(),
    };

    it('should create or update a profile with the provided data', async () => {
      (prisma.profile.upsert as jest.Mock).mockResolvedValue(mockProfile);

      const result = await ProfileService.identifyProfile({
        userId: 'test-user',
        anonymousId: 'anon-123',
        traits: { name: 'Test User' }
      });

      expect(prisma.profile.upsert).toHaveBeenCalledWith({
        where: { id: 'test-user' },
        create: {
          id: 'test-user',
          anonymousId: 'anon-123',
          properties: { name: 'Test User' },
          isAnonymous: false,
        },
        update: {
          anonymousId: 'anon-123',
          properties: { name: 'Test User' },
          isAnonymous: false,
          lastSeenAt: expect.any(Date),
        },
      });

      expect(result).toEqual(mockProfile);
    });
  });

  describe('getOrCreateProfile', () => {
    const mockProfile: Profile = {
      id: 'test-user',
      createdAt: new Date(),
      updatedAt: new Date(),
      anonymousId: 'anon-123',
      email: null,
      firstName: null,
      lastName: null,
      properties: null,
      mergedIntoId: null,
      isAnonymous: true,
      lastSeenAt: new Date(),
    };

    it('should find profile by userId if provided', async () => {
      (prisma.profile.findUnique as jest.Mock).mockResolvedValue(mockProfile);

      const result = await ProfileService.getOrCreateProfile({
        userId: 'test-user'
      });

      expect(prisma.profile.findUnique).toHaveBeenCalledWith({
        where: { id: 'test-user' }
      });
      expect(result).toEqual(mockProfile);
    });

    it('should create anonymous profile if only anonymousId provided', async () => {
      (prisma.profile.upsert as jest.Mock).mockResolvedValue(mockProfile);

      const result = await ProfileService.getOrCreateProfile({
        anonymousId: 'anon-123'
      });

      expect(prisma.profile.upsert).toHaveBeenCalledWith({
        where: { anonymousId: 'anon-123' },
        create: {
          anonymousId: 'anon-123',
          isAnonymous: true,
        },
        update: {
          lastSeenAt: expect.any(Date),
        },
      });
      expect(result).toEqual(mockProfile);
    });

    it('should throw error if neither userId nor anonymousId provided', async () => {
      await expect(ProfileService.getOrCreateProfile({}))
        .rejects
        .toThrow('Either userId or anonymousId must be provided');
    });
  });
}); 