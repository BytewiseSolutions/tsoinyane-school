import { Component, OnDestroy } from '@angular/core';
import { SidebarStateService } from '../sidebar-state';
import { AuthUser } from '../../../models/auth-user';
import { BackendService } from '../../../util/backend.service';
import { HttpErrorResponse } from '@angular/common/http';
import { SchoolContextService } from '../school-context';
import { SchoolOption } from '../../school-option';
import { NotificationItem } from './notification-item';
import { Subject, takeUntil } from 'rxjs';
import { NotificationStateService } from '../../notifications/notification-state';

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
  markingReadId: number | null = null;
  markingAllRead = false;

  constructor(
    private sidebarState: SidebarStateService,
    private backendService: BackendService,
    private schoolContext: SchoolContextService,
    private notificationState: NotificationStateService
  ) {}

  ngOnInit() {
    this.loadCurrentUser();
    this.notificationState.refreshRequested$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.loadNotifications());

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

  loadNotificationsManually(): void {
    this.loadNotifications();
  }

  markAllAsRead(): void {
    const unread = this.notifications.filter(n => n.id != null && !n.read);
    if (!unread.length || this.markingAllRead) return;

    this.markingAllRead = true;
    let completed = 0;

    unread.forEach(notif => {
      this.backendService.post<NotificationItem, null>(`notification/${notif.id}/read`, null).subscribe({
        next: updated => {
          this.notifications = this.notifications.map(item => item.id === updated.id ? updated : item);
        },
        complete: () => {
          completed++;
          if (completed === unread.length) {
            this.markingAllRead = false;
            this.notificationState.requestRefresh();
          }
        },
      });
    });
  }

  toggleNotifications() {
    this.notificationsOpen = !this.notificationsOpen;
    if (this.notificationsOpen) {
      this.loadNotifications();
    }
  }

  closeNotifications() {
    this.notificationsOpen = false;
  }

  getNotificationTime(timestamp?: string | null): string {
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

  get unreadNotificationCount(): number {
    return this.notifications.filter(notification => !notification.read).length;
  }

  isUnread(notification: NotificationItem): boolean {
    return notification.read !== true;
  }

  isScheduled(notification: NotificationItem): boolean {
    if (!notification.scheduledAt) {
      return false;
    }

    const scheduledAt = new Date(notification.scheduledAt);
    return !Number.isNaN(scheduledAt.getTime()) && scheduledAt.getTime() > Date.now();
  }

  getScheduleLabel(notification: NotificationItem): string {
    return `Publishes ${this.getNotificationTime(notification.scheduledAt)}`;
  }

  getExpiryLabel(notification: NotificationItem): string {
    return `Expires ${this.getNotificationTime(notification.expiresAt)}`;
  }

  markAsRead(notification: NotificationItem) {
    if (notification.id == null || notification.read || this.markingReadId != null) {
      return;
    }

    this.markingReadId = notification.id;
    this.backendService.post<NotificationItem, null>(`notification/${notification.id}/read`, null).subscribe({
      next: updatedNotification => {
        this.notifications = this.notifications.map(item =>
          item.id === updatedNotification.id ? updatedNotification : item
        );
        this.notificationState.requestRefresh();
      },
      error: (error: HttpErrorResponse) => {
        this.notificationsError = error.error?.message || 'Failed to update notification.';
        this.markingReadId = null;
      },
      complete: () => {
        this.markingReadId = null;
      },
    });
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
        this.notificationsLoading = false;
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

  getAudienceLabel(notification: NotificationItem): string {
    return (notification.audienceRoles ?? [])
      .map(role => this.formatRole(role))
      .join(', ');
  }
}
