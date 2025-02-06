import { prisma } from '@/utils/prisma';
import { Prisma } from '@prisma/client';
import { TrackEvent } from '@/types/tracking';
import Ajv from 'ajv';

export class TrackingService {
  static async trackEvent(data: Omit<TrackEvent, 'userId' | 'anonymousId'> & { profileId: string }) {
    const ajv = new Ajv();
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

    // Validate the event data against the metric's schema
    const schema = metric.schema as Prisma.JsonObject;
    if (schema && Object.keys(schema).length > 0) {
      const validate = ajv.compile(schema);
      const valid = validate(data.properties);
      if (!valid) {
        throw new Error(`Schema validation failed: ${validate.errors?.map(e => e.message).join(', ')}`);
      }
    }

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