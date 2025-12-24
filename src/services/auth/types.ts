export type ManualAuthRole = "admin" | "vendor" | "client" | "driver" | "user";

export interface ManualAuthUser {
  id: string;
  username: string;
  role: ManualAuthRole | string;
}

export interface ManualAuthSession {
  token: string;
  user: ManualAuthUser;
}

export interface AuthState {
  user: ManualAuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: AuthError | null;
}

export interface LoginCredentials {
  username: string;
  pin: string;
}

export interface AuthError {
  code: string;
  message: string;
  originalError?: unknown;
}

export interface AuthResult {
  success: boolean;
  session?: ManualAuthSession;
  error?: AuthError;
}
