import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '../../../../lib/middleware/auth';
import { rateLimiter } from '../../../../lib/middleware/rateLimiter';
import { trackEventSchema } from '../../../../lib/validation/schemas';
import { ApiResponse } from '../../../../types/api';

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
    const body = await request.json();
    const validatedData = trackEventSchema.parse(body);
    
    // TODO: Store the event in your database
    console.log('Tracked event:', validatedData);

    return NextResponse.json({
      success: true,
      message: 'Event tracked successfully'
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