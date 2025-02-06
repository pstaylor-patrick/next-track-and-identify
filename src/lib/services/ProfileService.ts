import { prisma } from '@/utils/prisma';
import type { Prisma } from '@prisma/client';
import { IdentifyEvent, TrackEvent } from '@/types/tracking';

export class ProfileService {
  static async identifyProfile(data: IdentifyEvent) {
    // First check if there's an existing anonymous profile
    if (data.anonymousId) {
      const existingProfile = await prisma.profile.findUnique({
        where: { anonymousId: data.anonymousId }
      });

      if (existingProfile) {
        // Update the existing anonymous profile
        return await prisma.profile.update({
          where: { id: existingProfile.id },
          data: {
            id: data.userId,
            properties: data.traits as Prisma.InputJsonValue,
            isAnonymous: false,
            lastSeenAt: new Date(),
          },
        });
      }
    }

    // If no existing anonymous profile, create or update by userId
    return await prisma.profile.upsert({
      where: {
        id: data.userId,
      },
      create: {
        id: data.userId,
        anonymousId: data.anonymousId,
        properties: data.traits as Prisma.InputJsonValue,
        isAnonymous: false,
      },
      update: {
        anonymousId: data.anonymousId,
        properties: data.traits as Prisma.InputJsonValue,
        isAnonymous: false,
        lastSeenAt: new Date(),
      },
    });
  }

  static async getOrCreateProfile(identifier: { 
    userId?: string; 
    anonymousId?: string;
  }) {
    if (identifier.userId) {
      return await prisma.profile.findUnique({
        where: { id: identifier.userId }
      });
    }

    if (identifier.anonymousId) {
      return await prisma.profile.upsert({
        where: { anonymousId: identifier.anonymousId },
        create: {
          anonymousId: identifier.anonymousId,
          isAnonymous: true,
        },
        update: {
          lastSeenAt: new Date(),
        },
      });
    }

    throw new Error('Either userId or anonymousId must be provided');
  }

  static async getOrCreateProfileForTracking(data: TrackEvent) {
    let profile = await this.getOrCreateProfile({
      userId: data.userId,
      anonymousId: data.anonymousId,
    });

    if (!profile && data.userId) {
      // If no profile found, create an anonymous profile with userId as anonymousId
      profile = await this.getOrCreateProfile({
        anonymousId: data.userId,
      });
    }

    if (!profile) {
      throw new Error('Profile not found');
    }

    return profile;
  }
} 