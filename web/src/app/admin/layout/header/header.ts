import { Component, OnDestroy } from '@angular/core';
import { SidebarStateService } from '../sidebar-state';
import { AuthUser } from '../../../models/auth-user';
import { BackendService } from '../../../util/backend.service';
import { HttpErrorResponse } from '@angular/common/http';
import { SchoolContextService } from '../school-context';
import { SchoolOption } from '../../school-option';
import { NotificationItem } from './notification-item';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-header',
  standalone: false,
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class AdminHeader implements OnDestroy {
  private readonly destroy$ = new Subject<void>();

  notificationsOpen = false;
  currentUserRole = 'Administrator';
  isSystemAdmin = false;
  schools: SchoolOption[] = [];
  selectedSchoolId: number | null = null;
  notifications: NotificationItem[] = [];
  notificationsLoading = false;
  notificationsError = '';

  notifPrefs = {
    newStudent: true,
    newTeacher: true,
    upcomingEvents: true,
    systemUpdates: false,
    backupCompleted: true,
    securityAlerts: true,
  };

  constructor(
    private sidebarState: SidebarStateService,
    private backendService: BackendService,
    private schoolContext: SchoolContextService
  ) {}

  ngOnInit() {
    this.loadCurrentUser();
    this.schoolContext.selectedSchool$
      .pipe(takeUntil(this.destroy$))
      .subscribe(school => {
        this.selectedSchoolId = school?.id ?? null;
        this.loadNotifications();
      });

    if (this.isSystemAdmin) {
      this.loadSchoolsForContext();
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleSidebar() {
    this.sidebarState.toggle();
  }

  toggleNotifications() {
    this.notificationsOpen = !this.notificationsOpen;
  }

  closeNotifications() {
    this.notificationsOpen = false;
  }

  getNotificationTime(timestamp?: string): string {
    if (!timestamp) {
      return 'Just now';
    }

    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) {
      return 'Just now';
    }

    const diffMs = date.getTime() - Date.now();
    const diffMinutes = Math.round(diffMs / 60000);

    if (Math.abs(diffMinutes) < 1) {
      return 'Just now';
    }

    if (Math.abs(diffMinutes) < 60) {
      return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(diffMinutes, 'minute');
    }

    const diffHours = Math.round(diffMinutes / 60);
    if (Math.abs(diffHours) < 24) {
      return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(diffHours, 'hour');
    }

    const diffDays = Math.round(diffHours / 24);
    return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(diffDays, 'day');
  }

  private loadCurrentUser() {
    const raw = localStorage.getItem('user') ?? sessionStorage.getItem('user');
    if (!raw) {
      return;
    }

    try {
      const user = JSON.parse(raw) as AuthUser;
      const primaryRole = this.resolvePrimaryRole(user);
      if (primaryRole) {
        this.currentUserRole = this.formatRole(primaryRole);
      }
      this.isSystemAdmin = this.hasSystemAdminRole(user);
    } catch {
  
    }
  }

  onSchoolChange() {
    const school = this.schools.find(item => item.id === Number(this.selectedSchoolId));
    if (this.selectedSchoolId == null || !school) {
      this.schoolContext.setSelectedSchool(null);
      return;
    }

    this.schoolContext.setSelectedSchool({ id: school.id, name: school.name });
  }

  private formatRole(role: string): string {
    return role
      .toLowerCase()
      .split('_')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  private hasSystemAdminRole(user: AuthUser): boolean {
    if (this.normalizeRole(user.role) === 'SYSTEM_ADMIN') {
      return true;
    }

    return (user.roles ?? [])
      .map(role => this.normalizeRole(role))
      .includes('SYSTEM_ADMIN');
  }

  private resolvePrimaryRole(user: AuthUser): string {
    if (user.role) {
      return user.role;
    }

    if (user.roles && user.roles.length > 0) {
      return user.roles[0];
    }

    return 'ADMINISTRATOR';
  }

  private normalizeRole(role?: string): string {
    return (role ?? '')
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '_');
  }

  private loadSchoolsForContext() {
    this.backendService.get<SchoolOption[]>('school').subscribe({
      next: (schools) => {
        this.schools = schools ?? [];
        this.selectDefaultSchool();
      },
      error: (_: HttpErrorResponse) => {
        this.schools = [];
      },
    });
  }

  private loadNotifications() {
    this.notificationsLoading = true;
    this.notificationsError = '';

    this.backendService.get<NotificationItem[]>('notification', this.selectedSchoolId ? { schoolId: this.selectedSchoolId } : undefined).subscribe({
      next: (notifications) => {
        this.notifications = notifications ?? [];
      },
      error: (error: HttpErrorResponse) => {
        this.notifications = [];
        this.notificationsError = error.error?.message || 'Failed to load notifications.';
      },
      complete: () => {
        this.notificationsLoading = false;
      },
    });
  }

  private selectDefaultSchool() {
    if (!this.schools.length) {
      return;
    }

    const existing = this.schoolContext.selectedSchool;
    if (existing) {
      const numericId = Number(existing.id);
      const exists = this.schools.some(school => school.id === numericId);
      if (exists) {
        this.selectedSchoolId = numericId;
        return;
      }
    }

    const defaultSchool = this.schools.find(
      school => school.name.trim().toLowerCase() === 'tsoinyane primary school'
    ) ?? this.schools[0];

    this.selectedSchoolId = defaultSchool.id;
    this.onSchoolChange();
  }
}
