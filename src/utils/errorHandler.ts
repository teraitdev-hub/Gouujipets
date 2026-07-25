/**
 * ==========================================
 * GOUUJI PET BUSINESS - ERROR HANDLING
 * ==========================================
 * Prevents Information Disclosure by catching raw database/backend errors
 * and returning generic, safe error messages to the user.
 */

// Custom application error class
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * Handles errors safely. 
 * Logs the full detailed error securely (e.g. to Sentry or Console in dev),
 * but returns a sanitized, vague message to the UI.
 */
export const handleSecureError = (error: unknown, fallbackMessage = 'Something went wrong. Please try again later.'): string => {
  // 1. Log the REAL error internally (never expose to UI)
  if (import.meta.env.DEV) {
    console.error('🔒 [SECURE ERROR LOG]:', error);
  } else {
    // In production, send to logging service (e.g., Sentry, Datadog)
    // logService.captureException(error);
    console.error('🔒 [SECURE ERROR LOG]:', error);
  }

  // 2. Determine safe UI message
  if (error instanceof AppError && error.isOperational) {
    return error.message; // Safe to show
  }

  if (typeof error === 'object' && error !== null) {
    const errObj = error as any;

    // Check for Firebase Auth errors
    if (errObj.code && typeof errObj.code === 'string' && errObj.code.startsWith('auth/')) {
      if (errObj.code === 'auth/invalid-credential' || errObj.code === 'auth/user-not-found' || errObj.code === 'auth/wrong-password') {
        return 'Invalid email or password.';
      }
      if (errObj.code === 'auth/too-many-requests') {
        return 'Too many attempts. Please wait a moment and try again.';
      }
      return 'Authentication failed. Please try again.';
    }

    // Check for Firebase Firestore Errors
    if (errObj.code && typeof errObj.code === 'string') {
      if (errObj.code === 'already-exists') {
        return 'This record already exists.';
      }
      if (errObj.code === 'permission-denied') {
        // Permission denied - mask completely.
        return fallbackMessage; 
      }
    }
  }

  // 3. Fallback to generic message
  return fallbackMessage;
};
