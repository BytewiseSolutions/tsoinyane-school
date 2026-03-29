export interface LoginResponse {
  accessToken: string;
  tokenType: string;
  expiresAt: number;
  user: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  };
}
