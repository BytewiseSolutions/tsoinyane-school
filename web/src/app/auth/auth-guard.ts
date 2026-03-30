import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { clearStoredAuth, hasValidAccessToken } from './auth-session';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  constructor(private router: Router) {}

  canActivate(): boolean | UrlTree {
    if (hasValidAccessToken()) {
      return true;
    }

    clearStoredAuth();
    return this.router.createUrlTree(['/login']);
  }
}
