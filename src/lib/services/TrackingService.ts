import { prisma } from '@/utils/prisma';
import { Prisma } from '@prisma/client';
import { TrackEvent } from '@/types/tracking';

export class TrackingService {
  static async trackEvent(data: Omit<TrackEvent, 'userId' | 'anonymousId'> & { profileId: string }) {
    // First get or create the metric
    const metric = await prisma.metric.upsert({
      where: { name: data.event },
      create: {
        name: data.event,
        schema: {} as Prisma.InputJsonValue,
        description: `Auto-created metric for event: ${data.event}`,
      },
      update: {}, // No updates needed if exists
    });

    // Create the event
    return await prisma.event.create({
      data: {
        metricId: metric.id,
        profileId: data.profileId,
        data: data.properties as Prisma.InputJsonValue,
      },
    });
  }
} 