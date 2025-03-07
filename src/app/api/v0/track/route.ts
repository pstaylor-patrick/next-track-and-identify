import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/middleware/auth';
import { rateLimiter } from '@/lib/middleware/rateLimiter';
import { trackEventSchema } from '@/lib/validation/schemas';
import { ApiResponse } from '@/types/api';
import { ProfileService } from '@/lib/services/ProfileService';
import { TrackingService } from '@/lib/services/TrackingService';
import { TrackEvent } from '@/types/tracking';

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse>> {
  try {
    // Apply rate limiting
    await rateLimiter(request);

    // Validate API key
    if (!validateApiKey(request)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get and validate request body
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    // Validate request body
    const validatedData = trackEventSchema.parse(body) as TrackEvent;

    // Get or create profile
    const profile = await ProfileService.getOrCreateProfileForTracking(validatedData);

    // Track the event
    let event;
    let note = '';
    try {
      event = await TrackingService.trackEvent({
        event: validatedData.event,
        properties: validatedData.properties,
        profileId: profile.id,
      });
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Schema validation failed')) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 400 }
        );
      }
      note = 'No schema for this metric or first time encountering this metric.';
    }

    return NextResponse.json({
      success: true,
      message: 'Event tracked successfully',
      data: { eventId: event?.id, profileId: profile.id },
      note,
    });

  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
} 