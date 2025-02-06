import { prisma } from '@/utils/prisma';
import { TrackingService } from './TrackingService';
import { Metric } from '@prisma/client';

jest.mock('@/utils/prisma', () => ({
  prisma: {
    metric: {
      upsert: jest.fn(),
    },
    event: {
      create: jest.fn(),
    },
  },
}));

describe('TrackingService', () => {
  const mockMetric: Metric = {
    id: 'metric-123',
    name: 'test_event',
    description: 'Test event',
    schema: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    isActive: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('trackEvent', () => {
    it('should create event with auto-created metric', async () => {
      (prisma.metric.upsert as jest.Mock).mockResolvedValue(mockMetric);
      (prisma.event.create as jest.Mock).mockResolvedValue({
        id: 'event-123',
        metricId: mockMetric.id,
        profileId: 'profile-123',
        data: { test: true },
        createdAt: new Date(),
        timestamp: new Date(),
      });

      const result = await TrackingService.trackEvent({
        event: 'test_event',
        profileId: 'profile-123',
        properties: { test: true },
      });

      expect(prisma.metric.upsert).toHaveBeenCalledWith({
        where: { name: 'test_event' },
        create: {
          name: 'test_event',
          schema: {},
          description: 'Auto-created metric for event: test_event',
        },
        update: {},
      });
      expect(prisma.event.create).toHaveBeenCalledWith({
        data: {
          metricId: mockMetric.id,
          profileId: 'profile-123',
          data: { test: true },
        },
      });
      expect(result.id).toBe('event-123');
    });

    it('should validate event properties against metric schema', async () => {
      const metricWithSchema: Metric = {
        ...mockMetric,
        schema: {
          type: 'object',
          required: ['test'],
          properties: {
            test: { type: 'boolean' },
          },
        },
      };

      (prisma.metric.upsert as jest.Mock).mockResolvedValue(metricWithSchema);

      await expect(TrackingService.trackEvent({
        event: 'test_event',
        profileId: 'profile-123',
        properties: { test: 'not-a-boolean' },
      })).rejects.toThrow('Schema validation failed');
    });

    it('should allow any properties when schema is empty', async () => {
      const metricWithEmptySchema: Metric = {
        ...mockMetric,
        schema: {},
      };

      (prisma.metric.upsert as jest.Mock).mockResolvedValue(metricWithEmptySchema);
      (prisma.event.create as jest.Mock).mockResolvedValue({
        id: 'event-123',
        metricId: mockMetric.id,
        profileId: 'profile-123',
        data: { anyProperty: 'value' },
        createdAt: new Date(),
        timestamp: new Date(),
      });

      const result = await TrackingService.trackEvent({
        event: 'test_event',
        profileId: 'profile-123',
        properties: { anyProperty: 'value' },
      });

      expect(result.id).toBe('event-123');
    });

    it('should handle multiple validation errors', async () => {
      const metricWithComplexSchema: Metric = {
        ...mockMetric,
        schema: {
          type: 'object',
          required: ['field1', 'field2'],
          properties: {
            field1: { type: 'number' },
            field2: { type: 'string' },
          },
        },
      };

      (prisma.metric.upsert as jest.Mock).mockResolvedValue(metricWithComplexSchema);

      await expect(TrackingService.trackEvent({
        event: 'test_event',
        profileId: 'profile-123',
        properties: { field1: 'not-a-number', field2: 123 },
      })).rejects.toThrow('Schema validation failed');
    });

    it('should handle database errors gracefully', async () => {
      (prisma.metric.upsert as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(TrackingService.trackEvent({
        event: 'test_event',
        profileId: 'profile-123',
        properties: { test: true },
      })).rejects.toThrow('Database error');
    });

    it('should validate complex nested properties', async () => {
      const metricWithNestedSchema: Metric = {
        ...mockMetric,
        schema: {
          type: 'object',
          required: ['user'],
          properties: {
            user: {
              type: 'object',
              required: ['name', 'age'],
              properties: {
                name: { type: 'string' },
                age: { type: 'number' },
                preferences: {
                  type: 'array',
                  items: { type: 'string' },
                },
              },
            },
          },
        },
      };

      (prisma.metric.upsert as jest.Mock).mockResolvedValue(metricWithNestedSchema);
      (prisma.event.create as jest.Mock).mockResolvedValue({
        id: 'event-123',
        metricId: mockMetric.id,
        profileId: 'profile-123',
        data: {
          user: {
            name: 'John',
            age: 30,
            preferences: ['dark mode', 'notifications'],
          },
        },
        createdAt: new Date(),
        timestamp: new Date(),
      });

      const result = await TrackingService.trackEvent({
        event: 'test_event',
        profileId: 'profile-123',
        properties: {
          user: {
            name: 'John',
            age: 30,
            preferences: ['dark mode', 'notifications'],
          },
        },
      });

      expect(result.id).toBe('event-123');
    });
  });
}); 