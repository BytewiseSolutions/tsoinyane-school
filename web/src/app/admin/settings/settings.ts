import { Component, OnDestroy, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, takeUntil } from 'rxjs';
import { BackendService } from '../../util/backend.service';
import { SchoolContextService } from '../layout/school-context';
import { SchoolInfo } from './school-info';
import { AcademicSettings } from './academic-settings';
import { SchoolRequest } from './school-request';
import { Term } from './term';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-settings',
  standalone: false,
  templateUrl: './settings.html',
  styleUrl: './settings.scss',
})
export class Settings implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly currentCalendarYear = String(new Date().getFullYear());
  private readonly apiUrl = environment.apiUrl.replace(/\/+$/, '');

  schoolInfo: SchoolInfo = {
    id: null,
    name: '',
    code: '',
    location: '',
    aboutHeadline: '',
    aboutDescription: '',
    aboutSupportingText: '',
    missionText: '',
    visionText: '',
    valuesText: '',
    heroImageUrl: '',
    aboutImageUrl: '',
    mapLatitude: null,
    mapLongitude: null,
    phone: '',
    email: '',
    type: ''
  };
  academicSettings: AcademicSettings = { academicYear: '', currentTerm: Term.TERM_1, passingMark: null, attendanceThreshold: null, language: 'English' };
  heroImageFileId: number | null = null;
  aboutImageFileId: number | null = null;
  selectedHeroImage: File | null = null;
  selectedAboutImage: File | null = null;

  passwordForm = { currentPassword: '', newPassword: '', confirmPassword: '' };

  savingSchool = false;
  savingPublicContent = false;
  savingAcademic = false;
  savingPassword = false;
  uploadingHeroImage = false;
  uploadingAboutImage = false;

  successDialogOpen = false;
  successDialogMessage = '';

  schoolError = '';
  publicContentError = '';
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

  get isCurrentTermAutomatic(): boolean {
    return this.academicSettings.academicYear === this.currentCalendarYear;
  }

  get currentTermHelpText(): string {
    if (this.isCurrentTermAutomatic) {
      return `Current term follows the calendar automatically for ${this.academicSettings.academicYear || this.currentCalendarYear}.`;
    }

    return 'For non-current academic years, you can keep the saved term here.';
  }

  getTermLabel(term: Term | null): string {
    return String(term ?? '').replace('_', ' ');
  }

  get heroImagePreviewUrl(): string {
    if (this.heroImageFileId) {
      return `${this.apiUrl}/public/files/${this.heroImageFileId}`;
    }

    return this.schoolInfo.heroImageUrl || '/image1.png';
  }

  get aboutImagePreviewUrl(): string {
    if (this.aboutImageFileId) {
      return `${this.apiUrl}/public/files/${this.aboutImageFileId}`;
    }

    return this.schoolInfo.aboutImageUrl || '/image2.png';
  }

  get hasHeroImage(): boolean {
    return Boolean(this.heroImageFileId || this.schoolInfo.heroImageUrl);
  }

  get hasAboutImage(): boolean {
    return Boolean(this.aboutImageFileId || this.schoolInfo.aboutImageUrl);
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

  savePublicContent(): void {
    if (!this.schoolInfo.id) return;
    this.publicContentError = '';
    this.savingPublicContent = true;

    this.backendService.put<any, SchoolRequest>(`school/${this.schoolInfo.id}`, this.buildRequest()).subscribe({
      next: (updated: any) => {
        this.patchFromResponse(updated);
        this.setSuccess('school', 'Public school content saved successfully.');
      },
      error: (e: HttpErrorResponse) => { this.publicContentError = e.error?.message || 'Failed to save public school content.'; },
      complete: () => { this.savingPublicContent = false; },
    });
  }

  onImageSelected(slot: 'hero' | 'about', event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;

    if (slot === 'hero') {
      this.selectedHeroImage = file;
    } else {
      this.selectedAboutImage = file;
    }
  }

  uploadImage(slot: 'hero' | 'about'): void {
    if (!this.schoolInfo.id) {
      return;
    }

    const file = slot === 'hero' ? this.selectedHeroImage : this.selectedAboutImage;
    if (!file) {
      this.publicContentError = 'Choose an image first.';
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    this.publicContentError = '';

    if (slot === 'hero') {
      this.uploadingHeroImage = true;
    } else {
      this.uploadingAboutImage = true;
    }

    this.backendService.postFormData<any>(`school/${this.schoolInfo.id}/images/${slot}`, formData).subscribe({
      next: updated => {
        this.patchFromResponse(updated);
        if (slot === 'hero') {
          this.selectedHeroImage = null;
        } else {
          this.selectedAboutImage = null;
        }
        this.setSuccess('school', `${slot === 'hero' ? 'Hero' : 'About'} image uploaded successfully.`);
      },
      error: (e: HttpErrorResponse) => {
        this.publicContentError = e.error?.message || 'Failed to upload image.';
      },
      complete: () => {
        if (slot === 'hero') {
          this.uploadingHeroImage = false;
        } else {
          this.uploadingAboutImage = false;
        }
      },
    });
  }

  deleteImage(slot: 'hero' | 'about'): void {
    if (!this.schoolInfo.id) {
      return;
    }

    this.publicContentError = '';

    if (slot === 'hero') {
      this.uploadingHeroImage = true;
    } else {
      this.uploadingAboutImage = true;
    }

    this.backendService.delete<any>(`school/${this.schoolInfo.id}/images/${slot}`).subscribe({
      next: updated => {
        this.patchFromResponse(updated);
        if (slot === 'hero') {
          this.selectedHeroImage = null;
        } else {
          this.selectedAboutImage = null;
        }
        this.setSuccess('school', `${slot === 'hero' ? 'Hero' : 'About'} image removed successfully.`);
      },
      error: (e: HttpErrorResponse) => {
        this.publicContentError = e.error?.message || 'Failed to remove image.';
      },
      complete: () => {
        if (slot === 'hero') {
          this.uploadingHeroImage = false;
        } else {
          this.uploadingAboutImage = false;
        }
      },
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
    this.heroImageFileId = s.heroImageFileId ?? null;
    this.aboutImageFileId = s.aboutImageFileId ?? null;
    this.schoolInfo = {
      id: s.id,
      name: s.name ?? '',
      code: s.code ?? '',
      location: s.location ?? '',
      aboutHeadline: s.aboutHeadline ?? '',
      aboutDescription: s.aboutDescription ?? '',
      aboutSupportingText: s.aboutSupportingText ?? '',
      missionText: s.missionText ?? '',
      visionText: s.visionText ?? '',
      valuesText: s.valuesText ?? '',
      heroImageUrl: s.heroImageUrl ?? '',
      aboutImageUrl: s.aboutImageUrl ?? '',
      mapLatitude: s.mapLatitude ?? null,
      mapLongitude: s.mapLongitude ?? null,
      phone: s.phone ?? '',
      email: s.email ?? '',
      type: s.type ?? ''
    };
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
