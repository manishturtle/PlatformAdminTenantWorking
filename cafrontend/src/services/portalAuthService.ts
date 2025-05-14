import { apiClient } from './api';

const PORTAL_TOKEN_KEY = 'portal_token';
const PORTAL_USER_KEY = 'portal_user';

export interface PortalUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  isEmailVerified: boolean;
}

class PortalAuthService {
  private setToken(token: string) {
    localStorage.setItem(PORTAL_TOKEN_KEY, token);
  }

  private setUser(user: PortalUser) {
    localStorage.setItem(PORTAL_USER_KEY, JSON.stringify(user));
  }

  getToken(): string | null {
    return localStorage.getItem(PORTAL_TOKEN_KEY);
  }

  getUser(): PortalUser | null {
    const userStr = localStorage.getItem(PORTAL_USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  async login(email: string, password: string): Promise<void> {
    const response = await apiClient.post('/portal/auth/login', {
      email,
      password,
    });
    
    const { token, user } = response.data;
    this.setToken(token);
    this.setUser(user);
  }

  async loginWithOTP(email: string, otp: string): Promise<void> {
    const response = await apiClient.post('/portal/auth/login-otp', {
      email,
      otp,
    });
    
    const { token, user } = response.data;
    this.setToken(token);
    this.setUser(user);
  }

  logout(): void {
    localStorage.removeItem(PORTAL_TOKEN_KEY);
    localStorage.removeItem(PORTAL_USER_KEY);
  }
}

export const portalAuthService = new PortalAuthService();
