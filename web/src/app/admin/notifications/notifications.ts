import { Component, OnDestroy, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, takeUntil } from 'rxjs';
import { BackendService } from '../../util/backend.service';
import { getStoredUser, hasRole } from '../../auth/auth-session';
import { SchoolContextService } from '../layout/school-context';
import { NotificationItem } from '../layout/header/notification-item';
import { NotificationStateService } from './notification-state';

interface RecipientOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-notifications',
  standalone: false,
  templateUrl: './notifications.html',
  styleUrl: './notifications.scss',
})
export class Notifications implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  readonly pageSizeOptions = [5, 10, 20];
  notifications: NotificationItem[] = [];
  notificationsLoading = false;
  notificationsError = '';
  pageError = '';
  pageSize = 10;
  currentPage = 1;
  confirmDeleteOpen = false;
  deleteError = '';
  deleting = false;
  notificationPendingDelete: NotificationItem | null = null;
  canSendNotifications = false;
  isSystemAdmin = false;
  selectedSchoolId: number | null = null;
  selectedSchoolName = '';
  availableRecipientOptions: RecipientOption[] = [];
  markingReadId: number | null = null;
  markingAllRead = false;
  showForm = false;
  selectedNotification: NotificationItem | null = null;
  successDialogOpen = false;
  successDialogTitle = '';
  successDialogMessage = '';

  constructor(
    private backendService: BackendService,
    private schoolContext: SchoolContextService,
    private notificationState: NotificationStateService
  ) {}

  ngOnInit(): void {
    this.loadCurrentUser();

    this.notificationState.refreshRequested$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.loadNotifications());

    this.schoolContext.selectedSchool$
      .pipe(takeUntil(this.destroy$))
      .subscribe(school => {
        this.selectedSchoolId = school?.id ?? null;
        this.selectedSchoolName = school?.name ?? '';
        this.loadNotifications();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get unreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.notifications.length / this.pageSize));
  }

  get safeCurrentPage(): number {
    return Math.min(this.currentPage, this.totalPages);
  }

  get paginatedNotifications(): NotificationItem[] {
    const start = (this.safeCurrentPage - 1) * this.pageSize;
    return this.notifications.slice(start, start + this.pageSize);
  }

  get pageStart(): number {
    return this.notifications.length ? (this.safeCurrentPage - 1) * this.pageSize + 1 : 0;
  }

  get pageEnd(): number {
    return Math.min(this.safeCurrentPage * this.pageSize, this.notifications.length);
  }

  goToPreviousPage(): void {
    if (this.safeCurrentPage > 1) this.currentPage = this.safeCurrentPage - 1;
  }

  goToNextPage(): void {
    if (this.safeCurrentPage < this.totalPages) this.currentPage = this.safeCurrentPage + 1;
  }

  onPageSizeChanged(): void {
    this.currentPage = 1;
  }

  refresh(): void {
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

  openForm(notification: NotificationItem | null = null): void {
    this.selectedNotification = notification ? { ...notification } : null;
    this.showForm = true;
  }

  closeForm(): void {
    this.showForm = false;
    this.selectedNotification = null;
  }

  onSaved(scheduled: boolean, isEdit: boolean): void {
    this.closeForm();
    this.successDialogTitle = isEdit
      ? (scheduled ? 'Notification Schedule Updated' : 'Notification Updated')
      : (scheduled ? 'Notification Scheduled' : 'Notification Sent');
    this.successDialogMessage = isEdit
      ? (scheduled ? 'Notification schedule updated successfully.' : 'Notification updated successfully.')
      : (scheduled ? 'Notification scheduled successfully.' : 'Notification sent successfully.');
    this.successDialogOpen = true;
  }

  closeSuccessDialog(): void {
    this.successDialogOpen = false;
    this.successDialogTitle = '';
    this.successDialogMessage = '';
  }

  getNotificationTime(timestamp?: string | null): string {
    if (!timestamp) return 'Just now';
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return 'Just now';
    return date.toLocaleString(undefined, {
      month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
    });
  }

  formatRole(role: string): string {
    return role.toLowerCase().split('_').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
  }

  getAudienceLabel(notification: NotificationItem): string {
    return (notification.audienceRoles ?? []).map(r => this.formatRole(r)).join(', ');
  }

  isUnread(notification: NotificationItem): boolean {
    return notification.read !== true;
  }

  isScheduled(notification: NotificationItem): boolean {
    if (!notification.scheduledAt) return false;
    const d = new Date(notification.scheduledAt);
    return !Number.isNaN(d.getTime()) && d.getTime() > Date.now();
  }

  isExpired(notification: NotificationItem): boolean {
    if (!notification.expiresAt) return false;
    const d = new Date(notification.expiresAt);
    return !Number.isNaN(d.getTime()) && d.getTime() <= Date.now();
  }

  getScheduleLabel(notification: NotificationItem): string {
    return `Publishes ${this.getNotificationTime(notification.scheduledAt)}`;
  }

  getExpiryLabel(notification: NotificationItem): string {
    return `Expires ${this.getNotificationTime(notification.expiresAt)}`;
  }

  requestDelete(notification: NotificationItem): void {
    if (!notification.editable || notification.id == null) return;
    this.deleteError = '';
    this.notificationPendingDelete = notification;
    this.confirmDeleteOpen = true;
  }

  closeDeleteDialog(): void {
    this.confirmDeleteOpen = false;
    this.notificationPendingDelete = null;
    this.deleteError = '';
    this.deleting = false;
  }

  confirmDelete(): void {
    if (!this.notificationPendingDelete?.id) return;
    this.deleting = true;
    this.deleteError = '';

    this.backendService.delete<void>(`notification/${this.notificationPendingDelete.id}`).subscribe({
      next: () => {
        this.closeDeleteDialog();
        this.notificationState.requestRefresh();
        this.successDialogTitle = 'Notification Deleted';
        this.successDialogMessage = 'Notification deleted successfully.';
        this.successDialogOpen = true;
      },
      error: (error: HttpErrorResponse) => {
        this.deleteError = error.error?.message || 'Failed to delete notification.';
        this.deleting = false;
      },
    });
  }

  markAsRead(notification: NotificationItem): void {
    if (notification.id == null || notification.read || this.markingReadId != null) return;
    this.pageError = '';
    this.markingReadId = notification.id;

    this.backendService.post<NotificationItem, null>(`notification/${notification.id}/read`, null).subscribe({
      next: (updated) => {
        this.notifications = this.notifications.map(item => item.id === updated.id ? updated : item);
        this.notificationState.requestRefresh();
      },
      error: () => {
        this.pageError = 'Failed to mark notification as read.';
        this.markingReadId = null;
        setTimeout(() => { this.pageError = ''; }, 4000);
      },
      complete: () => { this.markingReadId = null; },
    });
  }

  private loadCurrentUser(): void {
    const user = getStoredUser();
    this.isSystemAdmin = hasRole('SYSTEM_ADMIN');
    const isSchoolAdmin = hasRole('SCHOOL_ADMIN');
    const isTeacher = hasRole('TEACHER');
    this.canSendNotifications = this.isSystemAdmin || isSchoolAdmin || isTeacher;

    if (!user) {
      this.availableRecipientOptions = [];
      return;
    }

    if (this.isSystemAdmin) {
      this.availableRecipientOptions = [
        { value: 'SYSTEM_ADMIN', label: 'System Admins' },
        { value: 'SCHOOL_ADMIN', label: 'School Admins' },
        { value: 'TEACHER', label: 'Teachers' },
        { value: 'STUDENT', label: 'Students' },
      ];
      return;
    }

    if (isSchoolAdmin) {
      this.availableRecipientOptions = [
        { value: 'SCHOOL_ADMIN', label: 'School Admins' },
        { value: 'TEACHER', label: 'Teachers' },
        { value: 'STUDENT', label: 'Students' },
      ];
      return;
    }

    this.availableRecipientOptions = isTeacher
      ? [{ value: 'STUDENT', label: 'Students' }]
      : [];
  }

  private loadNotifications(): void {
    this.notificationsLoading = true;
    this.notificationsError = '';
    const params = this.selectedSchoolId != null ? { schoolId: this.selectedSchoolId } : undefined;

    this.backendService.get<NotificationItem[]>('notification', params).subscribe({
      next: (notifications) => { this.notifications = notifications ?? []; this.currentPage = 1; },
      error: (error: HttpErrorResponse) => {
        this.notifications = [];
        this.notificationsError = error.error?.message || 'Failed to load notifications.';
        this.notificationsLoading = false;
      },
      complete: () => { this.notificationsLoading = false; },
    });
  }
}
