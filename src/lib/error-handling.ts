import { PostgrestError } from '@supabase/supabase-js'

// Error types
export enum ErrorType {
  UNKNOWN = 'UNKNOWN',
  AUTH = 'AUTH',
  DATA_FETCH = 'DATA_FETCH',
  DATA_CREATE = 'DATA_CREATE',
  DATA_UPDATE = 'DATA_UPDATE',
  DATA_DELETE = 'DATA_DELETE',
  VALIDATION = 'VALIDATION',
  NETWORK = 'NETWORK',
}

// Error with categorization
export interface AppError {
  type: ErrorType
  message: string
  originalError?: any
}

// Format error message for user display
export function formatErrorMessage(error: AppError): string {
  switch (error.type) {
    case ErrorType.AUTH:
      return `Authentication error: ${error.message}`
    case ErrorType.DATA_FETCH:
      return `Data fetch error: ${error.message}`
    case ErrorType.DATA_CREATE:
      return `Data create error: ${error.message}`
    case ErrorType.DATA_UPDATE:
      return `Data update error: ${error.message}`
    case ErrorType.DATA_DELETE:
      return `Data delete error: ${error.message}`
    case ErrorType.VALIDATION:
      return `Validation error: ${error.message}`
    case ErrorType.NETWORK:
      return `Network error: ${error.message}`
    case ErrorType.UNKNOWN:
    default:
      return `An error occurred: ${error.message}`
  }
}

// Handle Supabase errors
export function handleSupabaseError(error: PostgrestError, type: ErrorType = ErrorType.UNKNOWN): AppError {
  let message = 'An unexpected error occurred';
  
  switch (type) {
    case ErrorType.DATA_FETCH:
      message = 'Failed to fetch data';
      break;
    case ErrorType.DATA_CREATE:
      message = 'Failed to create data';
      break;
    case ErrorType.DATA_UPDATE:
      message = 'Failed to update data';
      break;
    case ErrorType.DATA_DELETE:
      message = 'Failed to delete data';
      break;
    case ErrorType.AUTH:
      message = 'Authentication error';
      break;
    case ErrorType.VALIDATION:
      message = 'Validation error';
      break;
    case ErrorType.NETWORK:
      message = 'Network error';
      break;
  }
  
  return {
    type,
    message: error.message || message,
    originalError: error,
  };
}

// Handle authentication-specific errors
export function handleAuthError(error: Error | string): AppError {
  return {
    type: ErrorType.AUTH,
    message: error instanceof Error ? error.message : error,
    originalError: error instanceof Error ? error : new Error(error),
  };
}

// Handle network errors
export function handleNetworkError(error: Error): AppError {
  return {
    type: ErrorType.NETWORK,
    message: 'Network error occurred. Please check your connection',
    originalError: error
  }
}

// Generic error handler
export function handleError(error: any): AppError {
  if (!error) {
    return {
      type: ErrorType.UNKNOWN,
      message: 'Unknown error occurred'
    }
  }

  // Check if it's a PostgrestError from Supabase
  if (error.code && error.details) {
    return handleSupabaseError(error)
  }

  // Check if it's a typical network error
  if (error.name === 'NetworkError' || error.message?.includes('network')) {
    return handleNetworkError(error)
  }

  // Default to unknown error
  return {
    type: ErrorType.UNKNOWN,
    message: error.message || 'An unexpected error occurred',
    originalError: error
  }
} 