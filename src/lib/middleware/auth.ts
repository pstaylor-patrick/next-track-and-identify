import { NextRequest } from 'next/server';

export function validateApiKey(request: NextRequest): boolean {
  const apiKey = Array.from(request.headers.entries()).find(([key]) => key.toLowerCase() === 'x-api-key')?.[1];
  
  if (!apiKey) {
    return false;
  }

  // In production, you should compare against a securely stored API key
  return apiKey === process.env.API_KEY;
} 