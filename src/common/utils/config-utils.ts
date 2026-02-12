/**
 * Utility functions for configuration validation
 */

/**
 * Determines if the application is running in a production-like environment
 */
export function isProductionEnvironment(): boolean {
  const nodeEnv = process.env.NODE_ENV || process.env.APP_ENV || 'dev';
  return nodeEnv === 'production' || nodeEnv === 'staging';
}

/**
 * Validates that a required environment variable is set
 * Throws an error in production if the variable is missing
 */
export function requireEnv(
  key: string,
  defaultValue?: string,
): string {
  const value = process.env[key];

  if (isProductionEnvironment()) {
    if (!value) {
      throw new Error(
        `Required environment variable ${key} is not set in production/staging environment`,
      );
    }
    if (defaultValue && value === defaultValue && isDefaultValueDangerous(key, defaultValue)) {
      throw new Error(
        `Environment variable ${key} cannot use the default value "${defaultValue}" in production/staging`,
      );
    }
  }

  return value ?? defaultValue ?? '';
}

/**
 * Validates required environment variables
 * Throws an error if any required variables are missing in production
 */
export function requireEnvVars(
  requiredVars: string[]
): void {
  if (!isProductionEnvironment()) {
    return;
  }

  const missing = requiredVars.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables in production/staging: ${missing.join(', ')}`,
    );
  }
}

/**
 * Checks if a default value is considered dangerous for production
 */
function isDefaultValueDangerous(key: string, value: string): boolean {
  const dangerousDefaults = [
    'change_me',
    '',
    'password',
    'secret',
    'admin'
  ];

  // Check if the value itself is dangerous
  if (dangerousDefaults.includes(value.toLowerCase())) {
    return true;
  }

  if ((key.includes('PASSWORD') || key.includes('SECRET')) && value === '') {
    return true;
  }

  return false;
}

/**
 * Gets an environment variable with validation
 * Allows defaults in development but requires them in production
 */
export function getEnvWithDefault(
  key: string,
  defaultValue: string,
  options?: {
    required?: boolean;
    minLength?: number;
    allowedValues?: string[];
    rejectDefaultsInProduction?: boolean;
  },
): string {
  const value = process.env[key];
  const isProduction = isProductionEnvironment();

  if (isProduction) {
    if (options?.required && !value) {
      throw new Error(`Required environment variable ${key} is not set in production/staging`);
    }

    // If value is not set, reject default in production
    if (!value && options?.rejectDefaultsInProduction !== false) {
      throw new Error(
        `Environment variable ${key} must be explicitly set in production/staging. Cannot use default value "${defaultValue}"`,
      );
    }

    // If value equals default and defaults are rejected, throw error
    if (
      value === defaultValue &&
      options?.rejectDefaultsInProduction !== false &&
      isDefaultValueDangerous(key, defaultValue)
    ) {
      throw new Error(
        `Environment variable ${key} cannot use the default value "${defaultValue}" in production/staging`,
      );
    }

    if (value && options?.minLength && value.length < options.minLength) {
      throw new Error(
        `Environment variable ${key} must be at least ${options.minLength} characters long`,
      );
    }

    if (
      value &&
      options?.allowedValues &&
      !options.allowedValues.includes(value)
    ) {
      throw new Error(
        `Environment variable ${key} must be one of: ${options.allowedValues.join(', ')}`,
      );
    }
  }

  return value ?? defaultValue;
}

