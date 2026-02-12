import { registerDecorator, ValidationOptions } from 'class-validator';

/**
 * Password complexity validation decorator.
 * Validates that password contains:
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character (@$!%*?&)
 * - Minimum 8 characters
 */
export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isStrongPassword',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (typeof value !== 'string') {
            return false;
          }

          // Password must be at least 8 characters
          if (value.length < 8) {
            return false;
          }

          // Check for at least one uppercase letter
          if (!/[A-Z]/.test(value)) {
            return false;
          }

          // Check for at least one lowercase letter
          if (!/[a-z]/.test(value)) {
            return false;
          }

          // Check for at least one number
          if (!/\d/.test(value)) {
            return false;
          }

          // Check for at least one special character
          if (!/[@$!%*?&]/.test(value)) {
            return false;
          }

          return true;
        },
        defaultMessage() {
          return 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)';
        },
      },
    });
  };
}

