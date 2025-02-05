export interface TrackEvent {
  event: string;
  userId?: string;
  anonymousId?: string;
  properties?: Record<string, unknown>;
  timestamp?: string;
}

export interface IdentifyEvent {
  userId: string;
  traits?: Record<string, unknown>;
  anonymousId?: string;
  timestamp?: string;
}

export interface ApiResponse {
  success: boolean;
  message?: string;
  error?: string;
} 