import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/middleware/auth';
import { rateLimiter } from '@/lib/middleware/rateLimiter';
import { identifyEventSchema } from '@/lib/validation/schemas';
import { ApiResponse } from '@/types/api';
import { prisma } from '@/utils/prisma';
import { Prisma } from '@prisma/client';

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
    const validatedData = identifyEventSchema.parse(body);
    
    // Create or update profile
    await prisma.profile.upsert({
      where: {
        id: validatedData.userId,
      },
      create: {
        id: validatedData.userId,
        anonymousId: validatedData.anonymousId,
        properties: validatedData.traits as Prisma.InputJsonValue,
        isAnonymous: false,
      },
      update: {
        anonymousId: validatedData.anonymousId,
        properties: validatedData.traits as Prisma.InputJsonValue,
        isAnonymous: false,
        lastSeenAt: new Date(),
      },
    });

    console.log('Identified user:', validatedData);

    return NextResponse.json({
      success: true,
      message: 'User identified successfully'
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