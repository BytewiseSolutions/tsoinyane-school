import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { BackendService } from '../../../util/backend.service';
import { User } from '../user';
import { Role } from '../role';
import { Status } from '../status';
import { Title } from '../title';
import { SchoolContextService } from '../../layout/school-context';
import { Grade } from '../../grades/grade';

@Component({
  selector: 'app-user-form',
  standalone: false,
  templateUrl: './user-form.html',
  styleUrl: './user-form.scss',
})
export class UserForm implements OnInit {
  @Input() existingUser: User | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<User>();

  isSubmitting = false;
  errorMessage = '';
  successMessage = '';

  readonly titleOptions = Object.values(Title);
  readonly roleOptions = Object.values(Role);
  readonly statusOptions = Object.values(Status);
  selectedRoles: Role[] = [Role.STUDENT];
  isEdit = false;
  availableGrades: Grade[] = [];

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
    gradeId: null,
    teacherGradeIds: [],
  };

  constructor(
    private backendService: BackendService,
    private schoolContext: SchoolContextService
  ) {}

  ngOnInit(): void {
    if (!this.existingUser) {
      const selectedSchool = this.schoolContext.selectedSchool;
      if (selectedSchool) {
        this.form.schoolIds = [selectedSchool.id];
        this.loadGradesForSchool(selectedSchool.id);
      }
      return;
    }

    this.isEdit = true;
    this.form = {
      ...this.existingUser,
      id: this.existingUser.id,
      password: '',
      schoolIds: this.existingUser.schoolIds ?? [],
      gradeId: this.existingUser.gradeId ?? null,
      teacherGradeIds: this.existingUser.teacherGradeIds ?? [],
    };

    this.selectedRoles = this.existingUser.roles?.length
      ? this.existingUser.roles
      : (this.existingUser.role ? [this.existingUser.role] : [Role.STUDENT]);

    const schoolId = this.form.schoolIds?.[0];
    if (schoolId) {
      this.loadGradesForSchool(schoolId);
    }
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

    if (this.isStudentRoleSelected() && !this.form.gradeId) {
      this.errorMessage = 'Please select a grade for the student.';
      return;
    }

    if (this.isTeacherRoleSelected() && !(this.form.teacherGradeIds?.length ?? 0)) {
      this.errorMessage = 'Please select at least one grade for the teacher.';
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

  private loadGradesForSchool(schoolId: number): void {
    this.backendService.get<Grade[]>('grade').subscribe({
      next: (grades) => {
        this.availableGrades = (grades ?? []).filter(grade => grade.schoolId === schoolId);
      },
      error: () => {
        this.availableGrades = [];
      },
    });
  }
}
