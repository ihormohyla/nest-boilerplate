/**
 * Time parsing utilities for expiration strings
 * 
 * Supports time format: {number}{unit}
 * Units:
 * - s: seconds
 * - m: minutes
 * - h: hours
 * - d: days
 * 
 * Examples:
 * - "3600s" = 3600 seconds
 * - "60m" = 3600 seconds
 * - "1h" = 3600 seconds
 * - "7d" = 604800 seconds
 */

/**
 * Parse expiration string to seconds
 * 
 * @param value - Time string (e.g., "3600s", "60m", "1h", "7d") or plain number as string
 * @returns Time in seconds
 * 
 * @example
 * ```typescript
 * parseExpiresToSeconds("3600s") // 3600
 * parseExpiresToSeconds("60m")   // 3600
 * parseExpiresToSeconds("1h")    // 3600
 * parseExpiresToSeconds("7d")    // 604800
 * parseExpiresToSeconds("3600")  // 3600 (no unit = seconds)
 * ```
 */
export function parseExpiresToSeconds(value: string): number {
  const match = value.match(/(\d+)([smhd])/);
  if (!match) {
    // If no unit, assume it's already in seconds
    return parseInt(value, 10);
  }

  const amount = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 's':
      return amount;
    case 'm':
      return amount * 60;
    case 'h':
      return amount * 3600;
    case 'd':
      return amount * 86400;
    default:
      return amount;
  }
}

/**
 * Parse expiration string to days
 * 
 * @param value - Time string (e.g., "7d", "168h", "10080m") or plain number as string
 * @param defaultValue - Default value in days if parsing fails (default: 7)
 * @returns Time in days
 * 
 * @example
 * ```typescript
 * parseExpiresToDays("7d")    // 7
 * parseExpiresToDays("168h")  // 7
 * parseExpiresToDays("10080m") // 7
 * parseExpiresToDays("604800s") // 7
 * parseExpiresToDays("invalid", 14) // 14 (default value)
 * ```
 */
export function parseExpiresToDays(value: string, defaultValue: number = 7): number {
  const match = value.match(/(\d+)([smhd])/);
  if (!match) {
    // If no unit, assume it's in seconds and convert to days
    const seconds = parseInt(value, 10);
    if (isNaN(seconds)) {
      return defaultValue;
    }
    return seconds / 86400;
  }

  const amount = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 's':
      return amount / 86400;
    case 'm':
      return amount / 1440;
    case 'h':
      return amount / 24;
    case 'd':
      return amount;
    default:
      return defaultValue;
  }
}

/**
 * Parse expiration string to minutes
 * 
 * @param value - Time string (e.g., "60m", "1h", "3600s")
 * @returns Time in minutes
 */
export function parseExpiresToMinutes(value: string): number {
  const match = value.match(/(\d+)([smhd])/);
  if (!match) {
    // If no unit, assume it's in seconds and convert to minutes
    return parseInt(value, 10) / 60;
  }

  const amount = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 's':
      return amount / 60;
    case 'm':
      return amount;
    case 'h':
      return amount * 60;
    case 'd':
      return amount * 1440;
    default:
      return amount;
  }
}

/**
 * Parse expiration string to hours
 * 
 * @param value - Time string (e.g., "24h", "1d", "86400s")
 * @returns Time in hours
 */
export function parseExpiresToHours(value: string): number {
  const match = value.match(/(\d+)([smhd])/);
  if (!match) {
    // If no unit, assume it's in seconds and convert to hours
    return parseInt(value, 10) / 3600;
  }

  const amount = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 's':
      return amount / 3600;
    case 'm':
      return amount / 60;
    case 'h':
      return amount;
    case 'd':
      return amount * 24;
    default:
      return amount;
  }
}

