/**
 * Logout DTO
 * Note: This DTO is currently not used in the logout endpoint.
 * The logout endpoint deletes all user sessions from database and Redis
 * without requiring any payload.
 */
export class LogoutDto {
  // Logout endpoint no longer requires any payload
  // All sessions are deleted automatically
}
