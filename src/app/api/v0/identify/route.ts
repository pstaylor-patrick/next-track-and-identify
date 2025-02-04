import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/middleware/auth';
import { rateLimiter } from '@/lib/middleware/rateLimiter';
import { identifyEventSchema } from '@/lib/validation/schemas';
import { ApiResponse } from '@/types/api';
import { ProfileService } from '@/lib/services/ProfileService';
import { IdentifyEvent } from '@/types/tracking';

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

    // Parse and validate request body
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
    const validatedData = identifyEventSchema.parse(body) as IdentifyEvent;
    
    const profile = await ProfileService.identifyProfile(validatedData);

    return NextResponse.json({
      success: true,
      message: 'User identified successfully',
      data: { profileId: profile.id }
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