export type NetworkErrorType = 
  | 'CONNECTION_FAILED'
  | 'TIMEOUT'
  | 'SERVER_ERROR'
  | 'UNKNOWN';

export interface NetworkError extends Error {
  type: NetworkErrorType;
  originalError?: unknown;
  userMessage: string;
}

export function createNetworkError(
  type: NetworkErrorType,
  message: string,
  userMessage: string,
  originalError?: unknown
): NetworkError {
  const error = new Error(message) as NetworkError;
  error.type = type;
  error.userMessage = userMessage;
  error.originalError = originalError;
  return error;
}

export function categorizeAxiosError(error: unknown): NetworkError {
  const err = error as Record<string, unknown>;
  if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.code === 'ENETUNREACH') {
    return createNetworkError(
      'CONNECTION_FAILED',
      'Cannot connect to server',
      'Unable to connect to the server. Please check your internet connection and try again.',
      error
    );
  }
  
  if (err.code === 'ECONNABORTED' || (typeof err.message === 'string' && err.message.includes('timeout'))) {
    return createNetworkError(
      'TIMEOUT',
      'Request timed out',
      'The server is taking too long to respond. Please try again.',
      error
    );
  }
  
  const response = (err as { response?: { status?: number } }).response;
  if (response?.status && response.status >= 500) {
    return createNetworkError(
      'SERVER_ERROR',
      `Server error: ${response.status}`,
      'The server is experiencing issues. Please try again later.',
      error
    );
  }
  
  if (response?.status && response.status >= 400 && response.status < 500) {
    return createNetworkError(
      'SERVER_ERROR',
      `Client error: ${response.status}`,
      'There was an issue with the request. Please try again.',
      error
    );
  }
  
  return createNetworkError(
    'UNKNOWN',
    (typeof err.message === 'string' ? err.message : 'Unknown error occurred'),
    'An unexpected error occurred. Please try again.',
    error
  );
}