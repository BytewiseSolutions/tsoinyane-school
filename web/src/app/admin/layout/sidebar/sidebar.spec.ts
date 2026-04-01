import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { Sidebar } from './sidebar';
import { SidebarStateService } from '../sidebar-state';

describe('Sidebar', () => {
  beforeEach(async () => {
    localStorage.clear();
    sessionStorage.clear();

    await TestBed.configureTestingModule({
      declarations: [Sidebar],
      imports: [RouterTestingModule],
      providers: [SidebarStateService],
    }).compileComponents();
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('shows the Activity Logs link for SYSTEM_ADMIN users', () => {
    storeAuthenticatedUser({ role: 'SYSTEM_ADMIN', roles: ['SYSTEM_ADMIN'] });

    const fixture = TestBed.createComponent(Sidebar);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Activity Logs');
  });

  it('hides the Activity Logs link for non-system-admin users', () => {
    storeAuthenticatedUser({ role: 'SCHOOL_ADMIN', roles: ['SCHOOL_ADMIN'] });

    const fixture = TestBed.createComponent(Sidebar);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('Activity Logs');
  });

  function storeAuthenticatedUser(user: { role: string; roles?: string[] }) {
    sessionStorage.setItem('accessToken', 'test-token');
    sessionStorage.setItem('tokenType', 'Bearer');
    sessionStorage.setItem('expiresAt', String(Date.now() + 60_000));
    sessionStorage.setItem('user', JSON.stringify({
      id: 1,
      email: 'user@tsoinyane.co.ls',
      firstName: 'Test',
      lastName: 'Admin',
      ...user,
    }));
  }
});
