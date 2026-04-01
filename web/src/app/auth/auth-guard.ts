import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, CanActivateChild, Router, UrlTree } from '@angular/router';
import { clearStoredAuth, hasRole, hasValidAccessToken } from './auth-session';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate, CanActivateChild {
  constructor(private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot): boolean | UrlTree {
    return this.checkAuth(route);
  }

  canActivateChild(route: ActivatedRouteSnapshot): boolean | UrlTree {
    return this.checkAuth(route);
  }

  private checkAuth(route: ActivatedRouteSnapshot): boolean | UrlTree {
    if (hasValidAccessToken()) {
      const requiredRoles = route.data['roles'] as string[] | undefined;
      if (!requiredRoles?.length) {
        return true;
      }

      if (requiredRoles.some(role => hasRole(role))) {
        return true;
      }

      return this.router.createUrlTree(['/admin/dashboard']);
    }

    clearStoredAuth();
    return this.router.createUrlTree(['/login']);
  }
}
