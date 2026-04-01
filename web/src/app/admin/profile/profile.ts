import { Component, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { BackendService } from '../../util/backend.service';

@Component({
  selector: 'app-profile',
  standalone: false,
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class Profile implements OnInit {
  loading = false;
  saving = false;
  error = '';
  successDialogOpen = false;

  form = {
    id: null as number | null,
    title: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    roles: [] as string[],
    schoolNames: [] as string[],
    status: '',
  };

  constructor(private backendService: BackendService) {}

  ngOnInit(): void {
    this.loading = true;
    this.backendService.get<any>('user/me').subscribe({
      next: (user) => { this.patchForm(user); },
      error: (e: HttpErrorResponse) => { this.error = e.error?.message || 'Failed to load profile.'; },
      complete: () => { this.loading = false; },
    });
  }

  save(): void {
    this.error = '';
    if (!this.form.firstName.trim() || !this.form.lastName.trim()) {
      this.error = 'First name and last name are required.';
      return;
    }

    this.saving = true;
    this.backendService.put<any, any>('user/me', {
      title: this.form.title || null,
      firstName: this.form.firstName.trim(),
      lastName: this.form.lastName.trim(),
      phone: this.form.phone?.trim() || null,
    }).subscribe({
      next: (user) => {
        this.patchForm(user);
        this.successDialogOpen = true;
      },
      error: (e: HttpErrorResponse) => { this.error = e.error?.message || 'Failed to update profile.'; },
      complete: () => { this.saving = false; },
    });
  }

  closeSuccessDialog(): void {
    this.successDialogOpen = false;
  }

  formatRole(role: string): string {
    return role.toLowerCase().split('_').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
  }

  private patchForm(user: any): void {
    this.form = {
      id: user.id,
      title: user.title ?? '',
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
      email: user.email ?? '',
      phone: user.phone ?? '',
      roles: user.roles ?? [],
      schoolNames: user.schoolNames ?? [],
      status: user.status ?? '',
    };
  }
}
