import { TrackingService } from './TrackingService';
import { prisma } from '@/utils/prisma';
import { Event, Metric } from '@prisma/client';

// Mock prisma
jest.mock('@/utils/prisma', () => ({
  prisma: {
    metric: {
      upsert: jest.fn(),
    },
    event: {
      create: jest.fn(),
    }
  }
}));

describe('TrackingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('trackEvent', () => {
    const mockMetric: Metric = {
      id: 'metric-123',
      createdAt: new Date(),
      updatedAt: new Date(),
      name: 'test-event',
      description: 'Auto-created metric for event: test-event',
      schema: {},
      isActive: true,
    };

    const mockEvent: Event = {
      id: 'event-123',
      createdAt: new Date(),
      metricId: 'metric-123',
      profileId: 'profile-123',
      data: { test: 'value' },
      timestamp: new Date(),
    };

    it('should create metric and event with the provided data', async () => {
      (prisma.metric.upsert as jest.Mock).mockResolvedValue(mockMetric);
      (prisma.event.create as jest.Mock).mockResolvedValue(mockEvent);

      const result = await TrackingService.trackEvent({
        event: 'test-event',
        properties: { test: 'value' },
        profileId: 'profile-123'
      });

      // Verify metric creation
      expect(prisma.metric.upsert).toHaveBeenCalledWith({
        where: { name: 'test-event' },
        create: {
          name: 'test-event',
          schema: expect.any(Object),
          description: 'Auto-created metric for event: test-event',
        },
        update: {},
      });

      // Verify event creation
      expect(prisma.event.create).toHaveBeenCalledWith({
        data: {
          metricId: 'metric-123',
          profileId: 'profile-123',
          data: { test: 'value' },
        },
      });

      expect(result).toEqual(mockEvent);
    });

    it('should handle empty properties', async () => {
      (prisma.metric.upsert as jest.Mock).mockResolvedValue(mockMetric);
      (prisma.event.create as jest.Mock).mockResolvedValue({
        ...mockEvent,
        data: {},
      });

      await TrackingService.trackEvent({
        event: 'test-event',
        properties: {},
        profileId: 'profile-123'
      });

      expect(prisma.event.create).toHaveBeenCalledWith({
        data: {
          metricId: 'metric-123',
          profileId: 'profile-123',
          data: {},
        },
      });
    });
  });
}); 