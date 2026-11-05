import { apiService } from '@/shared/services/api.service';
import type { LoginPayload, LoginResponse, SessionUser } from './auth.types';

export const authService = {
  login: (payload: LoginPayload) => apiService.post<LoginResponse>('/auth/login', payload),
  me: () => apiService.get<SessionUser>('/auth/me'),
};
