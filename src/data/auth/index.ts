/** Öffentliche Konto-API. */
export { completeAuthCallback, configureAuth, getAuthState, initAuth, useAuth } from './useAuth';
export type { AuthState, AuthStatus } from './useAuth';
export {
  AuthError, CLOUD_NOT_CONFIGURED_MESSAGE, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH, UnsyncedChangesError,
  cloudErrorMessage, toAuthError, validateEmail, validatePassword,
} from './errors';
export type { SignUpResult } from '../cloud/adapter';
