import { AuthUser } from '../../models/auth-user';

export interface LoginResponse {
  accessToken: string;
  tokenType: string;
  expiresAt: number;
  user: AuthUser;
}
