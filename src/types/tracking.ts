import { Prisma } from '@prisma/client';

export interface IdentifyEvent {
  userId: string;
  anonymousId?: string;
  traits?: Prisma.JsonValue;
}

export interface TrackEvent {
  userId?: string;
  anonymousId?: string;
  event: string;
  properties: Prisma.JsonValue;
} 