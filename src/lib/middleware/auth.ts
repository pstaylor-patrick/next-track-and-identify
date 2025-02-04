import { NextRequest } from 'next/server';

export function validateApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get('x-api-key');
  
  if (!apiKey) {
    return false;
  }

  // In production, you should compare against a securely stored API key
  return apiKey === process.env.API_KEY;
} 