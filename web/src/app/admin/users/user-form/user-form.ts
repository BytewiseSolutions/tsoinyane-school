import { Component, EventEmitter, Output } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { BackendService } from '../../../util/backend.service';
import { User } from '../user';
import { Role } from '../role';
import { Status } from '../status';
import { Title } from '../title';

@Component({
  selector: 'app-user-form',
  standalone: false,
  templateUrl: './user-form.html',
  styleUrl: './user-form.scss',
})
export class UserForm {
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<User>();

  isSubmitting = false;
  errorMessage = '';
  successMessage = '';

  readonly titleOptions = Object.values(Title);
  readonly roleOptions = Object.values(Role);
  readonly statusOptions = Object.values(Status);
  selectedRoles: Role[] = [Role.STUDENT];

  form: User = {
    id: 0,
    studentId: null,
    title: Title.Mr,
    firstName: '',
    lastName: '',
    email: '',
    phone: null,
    password: '',
    roles: [Role.STUDENT],
    status: Status.ACTIVE,
    schoolIds: [],
  };

  constructor(private backendService: BackendService) {}

  onSubmit() {
    this.errorMessage = '';
    this.successMessage = '';

    const firstName = (this.form.firstName ?? '').trim();
    const lastName = (this.form.lastName ?? '').trim();
    const email = (this.form.email ?? '').trim().toLowerCase();
    const password = (this.form.password ?? '').trim();

    if (!firstName || !lastName || !email || !password) {
      this.errorMessage = 'First name, last name, email and password are required.';
      return;
    }

    if (!this.selectedRoles.length) {
      this.errorMessage = 'Please select at least one role.';
      return;
    }

    this.isSubmitting = true;

    const payload: User = {
      ...this.form,
      id: 0,
      firstName,
      lastName,
      email,
      password,
      phone: this.nullIfBlank(this.form.phone),
      studentId: this.nullIfBlank(this.form.studentId),
      roles: this.selectedRoles,
      schoolIds: [],
    };

    this.backendService.post<User, User>('users', payload).subscribe({
      next: (createdUser) => {
        this.successMessage = 'User created successfully.';
        this.saved.emit(createdUser);
        this.close();
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = error.error?.message || 'Failed to create user.';
        this.isSubmitting = false;
      },
      complete: () => {
        this.isSubmitting = false;
      },
    });
  }

  close() {
    this.closed.emit();
  }

  private nullIfBlank(value?: string | null): string | null {
    if (value == null) {
      return null;
    }

    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }
}
