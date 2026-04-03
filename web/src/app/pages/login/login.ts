import { Component } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { BackendService } from '../../util/backend.service';
import { SchoolService } from '../../shared/school';
import { LoginRequest } from './login-request';
import { LoginResponse } from './login-response';
import { clearStoredAuth } from '../../auth/auth-session';

@Component({
  selector: 'app-login',
  standalone: false,
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  email = '';
  password = '';
  rememberMe = false;
  isSubmitting = false;
  errorMessage = '';

  constructor(
    private router: Router,
    private backendService: BackendService,
    private schoolService: SchoolService
  ) {}

  onLogin() {
    this.errorMessage = '';
    this.clearStoredAuth();

    const payload: LoginRequest = {
      email: this.email.trim().toLowerCase(),
      password: this.password,
      rememberMe: this.rememberMe,
    };

    if (!payload.email || !payload.password) {
      this.errorMessage = 'Please enter both email and password.';
      return;
    }

    this.isSubmitting = true;
    this.backendService.post<LoginResponse, LoginRequest>('auth/login', payload).subscribe({
      next: (response) => {
        const storage = this.rememberMe ? localStorage : sessionStorage;
        storage.setItem('accessToken', response.accessToken);
        storage.setItem('tokenType', response.tokenType);
        storage.setItem('expiresAt', String(response.expiresAt));
        storage.setItem('user', JSON.stringify(response.user));
        
        // Load schools after successful authentication
        this.schoolService.loadSchools();
        
        this.router.navigate([this.resolveRedirect(response)]);
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = error.error?.message || 'Invalid email or password.';
        this.isSubmitting = false;
      },
      complete: () => {
        this.isSubmitting = false;
      }
    });
  }

  onForgotPassword() {
    this.router.navigate(['/forgot-password']);
  }

  private resolveRedirect(response: LoginResponse): string {
    const roles: string[] = response.user?.roles?.map((r: any) => String(r)) ?? [];
    if (roles.includes('TEACHER')) return '/admin/dashboard';
    return '/admin/dashboard';
  }

  private clearStoredAuth() {
    clearStoredAuth();
  }
}
