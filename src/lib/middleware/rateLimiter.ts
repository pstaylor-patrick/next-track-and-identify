import { NextRequest } from 'next/server';

// Simple in-memory store for rate limiting
const rateLimit = new Map<string, { count: number; timestamp: number }>();

export async function rateLimiter(request: NextRequest) {
  // Get IP from X-Forwarded-For header or fallback to connection remote address
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ?? '127.0.0.1';
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const max = 100; // Limit each IP to 100 requests per windowMs
  
  const now = Date.now();
  const windowStart = now - windowMs;
  
  const current = rateLimit.get(ip);
  
  if (!current) {
    rateLimit.set(ip, { count: 1, timestamp: now });
    return true;
  }
  
  if (current.timestamp < windowStart) {
    // Reset if outside window
    rateLimit.set(ip, { count: 1, timestamp: now });
    return true;
  }
  
  if (current.count >= max) {
    throw new Error('Too many requests, please try again later.');
  }
  
  current.count++;
  rateLimit.set(ip, current);
  return true;
} 