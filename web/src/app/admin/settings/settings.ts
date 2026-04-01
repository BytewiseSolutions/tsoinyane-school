import { Component, OnDestroy, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, takeUntil } from 'rxjs';
import { BackendService } from '../../util/backend.service';
import { SchoolContextService } from '../layout/school-context';
import { SchoolInfo } from './school-info';
import { AcademicSettings } from './academic-settings';
import { SchoolRequest } from './school-request';
import { Term } from './term';

@Component({
  selector: 'app-settings',
  standalone: false,
  templateUrl: './settings.html',
  styleUrl: './settings.scss',
})
export class Settings implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  schoolInfo: SchoolInfo = { id: null, name: '', code: '', location: '', phone: '', email: '', type: '' };
  academicSettings: AcademicSettings = { academicYear: '', currentTerm: Term.TERM_1, passingMark: null, attendanceThreshold: null, language: 'English' };

  passwordForm = { currentPassword: '', newPassword: '', confirmPassword: '' };

  savingSchool = false;
  savingAcademic = false;
  savingPassword = false;

  successDialogOpen = false;
  successDialogMessage = '';

  schoolError = '';
  academicError = '';
  passwordError = '';

  constructor(
    private backendService: BackendService,
    private schoolContext: SchoolContextService
  ) {}

  ngOnInit(): void {
    this.schoolContext.selectedSchool$
      .pipe(takeUntil(this.destroy$))
      .subscribe(school => {
        if (school?.id) this.loadSchool(school.id);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  saveSchoolInfo(): void {
    if (!this.schoolInfo.id) return;
    this.schoolError = '';
    this.savingSchool = true;

    this.backendService.put<SchoolInfo, SchoolRequest>(`school/${this.schoolInfo.id}`, this.buildRequest()).subscribe({
      next: (updated: any) => {
        this.patchFromResponse(updated);
        this.setSuccess('school', 'School information saved successfully.');
      },
      error: (e: HttpErrorResponse) => { this.schoolError = e.error?.message || 'Failed to save school information.'; },
      complete: () => { this.savingSchool = false; },
    });
  }

  saveAcademicSettings(): void {
    if (!this.schoolInfo.id) return;
    this.academicError = '';
    this.savingAcademic = true;

    this.backendService.put<any, SchoolRequest>(`school/${this.schoolInfo.id}`, this.buildRequest()).subscribe({
      next: (updated: any) => {
        this.patchFromResponse(updated);
        this.setSuccess('academic', 'Academic settings saved successfully.');
      },
      error: (e: HttpErrorResponse) => { this.academicError = e.error?.message || 'Failed to save academic settings.'; },
      complete: () => { this.savingAcademic = false; },
    });
  }

  updatePassword(): void {
    this.passwordError = '';

    if (!this.passwordForm.currentPassword || !this.passwordForm.newPassword || !this.passwordForm.confirmPassword) {
      this.passwordError = 'Please fill in all password fields.';
      return;
    }

    if (this.passwordForm.newPassword.length < 8) {
      this.passwordError = 'New password must be at least 8 characters.';
      return;
    }

    if (this.passwordForm.newPassword !== this.passwordForm.confirmPassword) {
      this.passwordError = 'Passwords do not match.';
      return;
    }

    this.savingPassword = true;

    this.backendService.post<any, { currentPassword: string; newPassword: string }>('auth/change-password', {
      currentPassword: this.passwordForm.currentPassword,
      newPassword: this.passwordForm.newPassword,
    }).subscribe({
      next: () => {
        this.passwordForm = { currentPassword: '', newPassword: '', confirmPassword: '' };
        this.setSuccess('password', 'Password updated successfully.');
      },
      error: (e: HttpErrorResponse) => { this.passwordError = e.error?.message || 'Failed to update password.'; },
      complete: () => { this.savingPassword = false; },
    });
  }

  private loadSchool(id: number): void {
    this.backendService.get<any>(`school`).subscribe({
      next: (schools: any[]) => {
        const school = schools.find((s: any) => s.id === id);
        if (school) this.patchFromResponse(school);
      },
    });
  }

  private patchFromResponse(s: any): void {
    this.schoolInfo = { id: s.id, name: s.name ?? '', code: s.code ?? '', location: s.location ?? '', phone: s.phone ?? '', email: s.email ?? '', type: s.type ?? '' };
    this.academicSettings = { academicYear: s.academicYear ?? '', currentTerm: s.currentTerm ?? Term.TERM_1, passingMark: s.passingMark ?? null, attendanceThreshold: s.attendanceThreshold ?? null, language: s.language ?? 'English' };
  }

  private buildRequest(): SchoolRequest {
    return { ...this.schoolInfo, ...this.academicSettings };
  }

  closeSuccessDialog(): void {
    this.successDialogOpen = false;
    this.successDialogMessage = '';
  }

  private setSuccess(section: 'school' | 'academic' | 'password', message: string): void {
    this.successDialogMessage = message;
    this.successDialogOpen = true;
  }
}
