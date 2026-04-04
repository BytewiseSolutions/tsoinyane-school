import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { BackendService } from '../../../util/backend.service';
import { NotificationItem } from '../../layout/header/notification-item';
import { NotificationStateService } from '../notification-state';

interface NotificationCreateRequest {
  title: string;
  message: string;
  schoolId?: number;
  scheduledAt?: string;
  expiresAt?: string;
  audienceRoles: string[];
}

interface RecipientOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-notification-form',
  standalone: false,
  templateUrl: './notification-form.html',
  styleUrl: './notification-form.scss',
})
export class NotificationForm implements OnInit {
  @Input() existingNotification: NotificationItem | null = null;
  @Input() selectedSchoolId: number | null = null;
  @Input() selectedSchoolName = '';
  @Input() isSystemAdmin = false;
  @Input() availableRecipientOptions: RecipientOption[] = [];
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<{ scheduled: boolean; isEdit: boolean }>();

  saving = false;
  formError = '';

  form = {
    title: '',
    message: '',
    audienceRoles: ['TEACHER', 'STUDENT'],
    sendToAllSchools: false,
    targetSchoolId: null as number | null,
    targetSchoolName: '',
    scheduledAt: '',
    expiresAt: '',
  };

  get isEdit(): boolean {
    return this.existingNotification != null;
  }

  get canSubmit(): boolean {
    return !this.saving
      && !!this.form.title.trim()
      && !!this.form.message.trim()
      && this.form.audienceRoles.length > 0;
  }

  get targetSchoolLabel(): string {
    if (this.form.sendToAllSchools && this.isSystemAdmin) {
      return 'All schools';
    }
    return this.form.targetSchoolName || this.selectedSchoolName || 'Your assigned school';
  }

  constructor(
    private backendService: BackendService,
    private notificationState: NotificationStateService
  ) {}

  ngOnInit(): void {
    if (this.existingNotification) {
      this.form.title = this.existingNotification.title;
      this.form.message = this.existingNotification.message;
      this.form.audienceRoles = this.normalizeAudienceRoles(
        this.existingNotification.audienceRoles ?? this.getDefaultAudienceRoles()
      );
      this.form.sendToAllSchools = this.isSystemAdmin && this.existingNotification.schoolId == null;
      this.form.targetSchoolId = this.existingNotification.schoolId ?? this.selectedSchoolId;
      this.form.targetSchoolName = this.existingNotification.schoolName ?? this.selectedSchoolName;
      this.form.scheduledAt = this.toDateTimeLocal(this.existingNotification.scheduledAt);
      this.form.expiresAt = this.toDateTimeLocal(this.existingNotification.expiresAt);
    } else {
      this.form.audienceRoles = this.getDefaultAudienceRoles();
      this.form.targetSchoolId = this.selectedSchoolId;
      this.form.targetSchoolName = this.selectedSchoolName;
    }
  }

  hasAudience(role: string): boolean {
    return this.form.audienceRoles.includes(role);
  }

  toggleAudience(role: string, checked: boolean): void {
    if (checked) {
      this.form.audienceRoles = Array.from(new Set([...this.form.audienceRoles, role]));
      return;
    }
    this.form.audienceRoles = this.form.audienceRoles.filter(item => item !== role);
  }

  submit(): void {
    this.formError = '';

    if (!this.isSystemAdmin && this.form.targetSchoolId == null) {
      this.formError = 'Select your assigned school in the header before sending a notification.';
      return;
    }

    if (!this.form.audienceRoles.length) {
      this.formError = 'Select at least one recipient group.';
      return;
    }

    const scheduledAt = this.toIsoDateTime(this.form.scheduledAt);
    const expiresAt = this.toIsoDateTime(this.form.expiresAt);

    if (this.form.scheduledAt && !scheduledAt) {
      this.formError = 'Enter a valid publish date and time.';
      return;
    }

    if (this.form.expiresAt && !expiresAt) {
      this.formError = 'Enter a valid expiry date and time.';
      return;
    }

    if (scheduledAt && expiresAt && new Date(expiresAt).getTime() <= new Date(scheduledAt).getTime()) {
      this.formError = 'Expiry must be after the publish time.';
      return;
    }

    this.saving = true;

    const payload: NotificationCreateRequest = {
      title: this.form.title.trim(),
      message: this.form.message.trim(),
      audienceRoles: this.form.audienceRoles,
    };

    if (scheduledAt) payload.scheduledAt = scheduledAt;
    if (expiresAt) payload.expiresAt = expiresAt;

    if (!this.form.sendToAllSchools || !this.isSystemAdmin) {
      if (this.form.targetSchoolId != null) {
        payload.schoolId = this.form.targetSchoolId;
      }
    }

    const request$ = this.isEdit && this.existingNotification?.id != null
      ? this.backendService.put<NotificationItem, NotificationCreateRequest>(`notification/${this.existingNotification.id}`, payload)
      : this.backendService.post<NotificationItem, NotificationCreateRequest>('notification', payload);

    request$.subscribe({
      next: () => {
        this.notificationState.requestRefresh();
        this.saved.emit({ scheduled: !!scheduledAt && new Date(scheduledAt).getTime() > Date.now(), isEdit: this.isEdit });
        this.close();
      },
      error: (error: HttpErrorResponse) => {
        this.formError = error.error?.message || 'Failed to save notification.';
        this.saving = false;
      },
      complete: () => {
        this.saving = false;
      },
    });
  }

  close(): void {
    this.closed.emit();
  }

  private getDefaultAudienceRoles(): string[] {
    const availableRoles = this.availableRecipientOptions.map(option => option.value);

    if (!availableRoles.length) {
      return [];
    }

    if (availableRoles.length === 1) {
      return [availableRoles[0]];
    }

    if (this.isSystemAdmin) {
      return availableRoles.filter(role => role === 'TEACHER' || role === 'STUDENT');
    }

    return ['TEACHER', 'STUDENT'].filter(role => availableRoles.includes(role));
  }

  private normalizeAudienceRoles(roles: string[]): string[] {
    const availableRoles = new Set(this.availableRecipientOptions.map(option => option.value));
    const normalized = roles.filter(role => availableRoles.has(role));

    return normalized.length ? normalized : this.getDefaultAudienceRoles();
  }

  private toIsoDateTime(value: string): string | undefined {
    if (!value.trim()) return undefined;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return undefined;
    return date.toISOString();
  }

  private toDateTimeLocal(value?: string | null): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }
}
