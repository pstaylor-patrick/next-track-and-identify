import { z } from 'zod';

export const trackEventSchema = z.object({
  event: z.string().min(1).max(100),
  userId: z.string().min(1).max(100).optional(),
  anonymousId: z.string().min(1).max(100).optional(),
  properties: z.record(z.unknown()).optional(),
  timestamp: z.string().datetime().optional(),
}).refine(data => data.userId || data.anonymousId, {
  message: "Either userId or anonymousId must be provided"
});

export const identifyEventSchema = z.object({
  userId: z.string().min(1).max(100),
  traits: z.record(z.unknown()).optional(),
  anonymousId: z.string().min(1).max(100).optional(),
  timestamp: z.string().datetime().optional(),
}); 