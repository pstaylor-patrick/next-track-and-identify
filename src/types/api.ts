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

export interface ApiSuccessResponse<T = any> {
  success: true;
  message: string;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
}

export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface IdentifyResponse {
  profileId: string;
}

export interface TrackResponse {
  eventId: string;
} 