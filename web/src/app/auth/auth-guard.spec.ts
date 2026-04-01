import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, UrlTree } from '@angular/router';
import { provideRouter } from '@angular/router';
import { AuthGuard } from './auth-guard';

@Component({
  template: '',
  standalone: false,
})
class DummyComponent {}

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let router: Router;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();

    TestBed.configureTestingModule({
      declarations: [DummyComponent],
      providers: [
        AuthGuard,
        provideRouter([
          { path: 'login', component: DummyComponent },
          { path: 'admin/dashboard', component: DummyComponent },
        ]),
      ],
    });

    guard = TestBed.inject(AuthGuard);
    router = TestBed.inject(Router);
  });

  it('allows SYSTEM_ADMIN users through the restricted activity-log route', () => {
    storeAuthenticatedUser({ role: 'SYSTEM_ADMIN', roles: ['SYSTEM_ADMIN'] });

    const result = guard.canActivate(routeWithRoles('SYSTEM_ADMIN'));

    expect(result).toBeTrue();
  });

  it('redirects non-system-admin users away from the restricted activity-log route', () => {
    storeAuthenticatedUser({ role: 'SCHOOL_ADMIN', roles: ['SCHOOL_ADMIN'] });

    const result = guard.canActivate(routeWithRoles('SYSTEM_ADMIN'));

    expect(result instanceof UrlTree).toBeTrue();
    expect(router.serializeUrl(result as UrlTree)).toBe('/admin/dashboard');
  });

  function routeWithRoles(...roles: string[]): ActivatedRouteSnapshot {
    const route = new ActivatedRouteSnapshot();
    (route as ActivatedRouteSnapshot & { data: Record<string, unknown> }).data = { roles };
    return route;
  }

  function storeAuthenticatedUser(user: { role: string; roles?: string[] }) {
    sessionStorage.setItem('accessToken', 'test-token');
    sessionStorage.setItem('tokenType', 'Bearer');
    sessionStorage.setItem('expiresAt', String(Date.now() + 60_000));
    sessionStorage.setItem('user', JSON.stringify({
      id: 1,
      email: 'user@tsoinyane.co.ls',
      firstName: 'Test',
      lastName: 'User',
      ...user,
    }));
  }
});
