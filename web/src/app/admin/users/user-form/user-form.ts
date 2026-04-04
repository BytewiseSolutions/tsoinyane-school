import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { BackendService } from '../../../util/backend.service';
import { User } from '../user';
import { Role } from '../role';
import { Title } from '../title';
import { SchoolContextService } from '../../layout/school-context';
import { hasRole } from '../../../auth/auth-session';

@Component({
  selector: 'app-user-form',
  standalone: false,
  templateUrl: './user-form.html',
  styleUrl: './user-form.scss',
})
export class UserForm implements OnInit {
  @Input() existingUser: User | null = null;
  @Input() presetRoles: Role[] = [];
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<User>();

  isSubmitting = false;
  errorMessage = '';
  successMessage = '';

  readonly titleOptions = Object.values(Title);
  selectedRoles: Role[] = [];
  isEdit = false;

  get formTitle(): string {
    if (this.isEdit) {
      return 'Edit User';
    }

    const primaryRole = this.selectedRoles[0] ?? this.presetRoles[0] ?? null;

    switch (primaryRole) {
      case Role.SYSTEM_ADMIN:
        return 'Add System Admin';
      case Role.SCHOOL_ADMIN:
        return 'Add School Admin';
      case Role.TEACHER:
        return 'Add Teacher';
      case Role.STUDENT:
        return 'Add Student';
      default:
        return 'Add User';
    }
  }

  get submitButtonLabel(): string {
    if (this.isSubmitting) {
      return 'Saving...';
    }

    if (this.isEdit) {
      return 'Update User';
    }

    const primaryRole = this.selectedRoles[0] ?? this.presetRoles[0] ?? null;

    switch (primaryRole) {
      case Role.SYSTEM_ADMIN:
        return 'Create System Admin';
      case Role.SCHOOL_ADMIN:
        return 'Create School Admin';
      case Role.TEACHER:
        return 'Create Teacher';
      case Role.STUDENT:
        return 'Create Student';
      default:
        return 'Add User';
    }
  }

  get roleOptions(): Role[] {
    const isSystemAdmin = hasRole('SYSTEM_ADMIN');
    
    if (isSystemAdmin) {
      return Object.values(Role);
    } else {
      return [Role.TEACHER, Role.STUDENT];
    }
  }

  form: User = {
    id: 0,
    studentId: null,
    title: Title.Mr,
    firstName: '',
    lastName: '',
    email: '',
    phone: null,
    password: '',
    roles: [],
    schoolIds: [],
    gradeId: null,
    teacherGradeIds: [],
  };

  constructor(
    private backendService: BackendService,
    private schoolContext: SchoolContextService
  ) {}

  ngOnInit(): void {
    const isSystemAdmin = hasRole('SYSTEM_ADMIN');
    
    if (!this.existingUser) {
      const selectedSchool = this.schoolContext.selectedSchool;
      if (selectedSchool) {
        this.form.schoolIds = [selectedSchool.id];
      }

      this.selectedRoles = this.presetRoles.filter(role => this.roleOptions.includes(role));
      return;
    }

    this.isEdit = true;
    
    // Check if school admin is trying to edit a user with restricted roles
    if (!isSystemAdmin && this.existingUser.roles) {
      const hasRestrictedRoles = this.existingUser.roles.some(role => 
        role === Role.SYSTEM_ADMIN || role === Role.SCHOOL_ADMIN
      );
      
      if (hasRestrictedRoles) {
        this.errorMessage = "You don't have permission to edit this user.";
        return;
      }
    }
    
    this.form = {
      ...this.existingUser,
      id: this.existingUser.id,
      password: '',
      schoolIds: this.existingUser.schoolIds ?? [],
      gradeId: this.existingUser.gradeId ?? null,
      teacherGradeIds: this.existingUser.teacherGradeIds ?? [],
    };

    this.selectedRoles = this.existingUser.roles?.length
      ? this.existingUser.roles.filter(role => this.roleOptions.includes(role))
      : (this.existingUser.role ? [this.existingUser.role] : []);

  }

  onSubmit() {
    this.errorMessage = '';
    this.successMessage = '';

    const firstName = (this.form.firstName ?? '').trim();
    const lastName = (this.form.lastName ?? '').trim();
    const email = (this.form.email ?? '').trim().toLowerCase();
    const password = (this.form.password ?? '').trim();

    if (!firstName || !lastName || !email || (!this.isEdit && !password)) {
      this.errorMessage = this.isEdit
        ? 'First name, last name and email are required.'
        : 'First name, last name, email and password are required.';
      return;
    }

    if (!this.selectedRoles.length) {
      this.errorMessage = 'Please select at least one role.';
      return;
    }

    if (this.selectedRoles.length > 1) {
      this.errorMessage = 'Choose one role per user. Edit older mixed-role users to clean them up.';
      return;
    }

    this.isSubmitting = true;

    const payload: User = {
      ...this.form,
      id: this.isEdit ? this.form.id : 0,
      firstName,
      lastName,
      email,
      password: password || null,
      phone: this.nullIfBlank(this.form.phone),
      studentId: this.isStudentRoleSelected() ? (this.form.studentId ?? null) : null,
      roles: this.selectedRoles,
      schoolIds: this.form.schoolIds ?? [],
      gradeId: this.isStudentRoleSelected() ? (this.form.gradeId ?? null) : null,
      teacherGradeIds: this.isTeacherRoleSelected() ? (this.form.teacherGradeIds ?? []) : [],
      status: this.isEdit ? (this.form.status ?? null) : null,
    };

    const request$ = this.isEdit
      ? this.backendService.put<User, User>(`user/${payload.id}`, payload)
      : this.backendService.post<User, User>('user', payload);

    request$.subscribe({
      next: (savedUser) => {
        this.successMessage = this.isEdit ? 'User updated successfully.' : 'User created successfully.';
        this.saved.emit(savedUser);
        this.close();
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = error.error?.message || (this.isEdit ? 'Failed to update user.' : 'Failed to create user.');
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

  isStudentRoleSelected(): boolean {
    return this.selectedRoles.includes(Role.STUDENT);
  }

  isTeacherRoleSelected(): boolean {
    return this.selectedRoles.includes(Role.TEACHER);
  }
}
