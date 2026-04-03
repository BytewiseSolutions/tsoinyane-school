import { Injectable } from '@angular/core';
import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { clearStoredAuth, getAuthorizationHeader } from './auth-session';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private router: Router) {}

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const isAuthRequest = req.url.includes('/auth/login') || req.url.includes('/auth/forgot-password');
    const isPublicSchoolRequest = req.url.includes('/school') && req.method === 'GET';
    const authorizationHeader = getAuthorizationHeader();

    if (!isAuthRequest && !isPublicSchoolRequest && !authorizationHeader) {
      clearStoredAuth();
      void this.router.navigate(['/login']);
      return throwError(() => new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' }));
    }

    const authReq = authorizationHeader
      ? req.clone({ setHeaders: { Authorization: authorizationHeader } })
      : req;

    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401 && !isAuthRequest && !isPublicSchoolRequest) {
          clearStoredAuth();
          void this.router.navigate(['/login']);
        }

        return throwError(() => error);
      })
    );
  }
}
