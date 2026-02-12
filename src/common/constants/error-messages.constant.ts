/**
 * Centralized error message i18n keys
 * 
 * All error messages should use these constants to ensure consistency
 * and avoid typos in i18n keys throughout the codebase.
 */
export const ErrorMessages = {
  // Authentication errors
  AUTH: {
    EMAIL_TAKEN: 'auth.email_taken',
    INVALID_CREDENTIALS: 'auth.invalid_credentials',
    INVALID_REFRESH_TOKEN: 'auth.invalid_refresh_token',
    USER_NOT_FOUND: 'auth.user_not_found',
    TOKEN_MISSING: 'auth.token_missing',
    TOKEN_REVOKED: 'auth.token_revoked',
    BEARER_TOKEN_REQUIRED: 'auth.bearer_token_required',
  },

  // General errors
  ERRORS: {
    NOT_FOUND: 'errors.not_found',
    NOT_FOUND_WITH_ID: 'errors.not_found_with_id',
    FILE_NOT_FOUND: 'errors.file_not_found',
    USER_NOT_FOUND: 'errors.user_not_found',
    FORBIDDEN: 'errors.forbidden',
    INTERNAL: 'errors.internal',
  },
} as const;

