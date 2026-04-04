import { Component, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { BackendService } from '../../../util/backend.service';
import { User } from '../user';
import { Role } from '../role';
import { Grade } from '../../grades/grade';
import { SchoolOption } from '../../school-option';
import { Title } from '../title';
import { Status } from '../status';

@Component({
  selector: 'app-user-details',
  standalone: false,
  templateUrl: './user-details.html',
  styleUrls: ['./user-details.scss'],
})
export class UserDetails implements OnInit {
  readonly titleOptions = Object.values(Title);
  readonly statusOptions = Object.values(Status);

  user: User | null = null;
  isLoading = true;
  errorMessage = '';
  saveMessage = '';
  isSavingSchools = false;
  isSavingTeacherGrades = false;
  isSavingStudentGrade = false;
  isEditingPersonal = false;
  isEditingAccount = false;
  isSavingPersonal = false;
  isSavingAccount = false;
  availableSchools: SchoolOption[] = [];
  availableGrades: Grade[] = [];
  selectedSchoolIds: number[] = [];
  selectedTeacherGradeIds: number[] = [];
  selectedStudentGradeId: number | null = null;
  personalForm = {
    title: Title.Mr as Title | null,
    firstName: '',
    lastName: '',
    phone: '',
  };
  accountForm = {
    email: '',
    status: Status.ACTIVE as Status | null,
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private backendService: BackendService
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    if (!Number.isFinite(id) || id <= 0) {
      this.errorMessage = 'User not found.';
      this.isLoading = false;
      return;
    }

    this.loadUser(id);
    this.loadSchools();
    this.loadGrades();
  }

  goBack(): void {
    this.router.navigate(['/admin/users']);
  }

  closeSaveMessage(): void {
    this.saveMessage = '';
  }

  get fullName(): string {
    if (!this.user) {
      return 'User Details';
    }

    return this.buildDisplayName(this.user) || 'Unknown User';
  }

  get roleLabels(): string {
    const roles = this.getUserRoles();
    if (!roles.length) {
      return 'Unknown';
    }

    return roles
      .map(role => role.replace(/_/g, ' '))
      .map(role => role.charAt(0) + role.slice(1).toLowerCase())
      .join(', ');
  }

  get canAssignSchools(): boolean {
    return this.hasRole(Role.SYSTEM_ADMIN);
  }

  get canAssignTeacherGrades(): boolean {
    return this.hasRole(Role.TEACHER);
  }

  get canAssignStudentGrade(): boolean {
    return this.hasRole(Role.STUDENT) && !this.hasRole(Role.TEACHER);
  }

  get isStudent(): boolean {
    return this.hasRole(Role.STUDENT);
  }

  get isTeacher(): boolean {
    return this.hasRole(Role.TEACHER);
  }

  get teacherGradeSummary(): string {
    const gradeNames = this.user?.teacherGradeNames ?? [];
    return gradeNames.length ? gradeNames.join(', ') : 'N/A';
  }

  get filteredTeacherGrades(): Grade[] {
    if (!this.selectedSchoolIds.length) {
      return [];
    }

    return this.availableGrades.filter(grade => {
      const schoolId = grade.schoolId ?? null;
      return schoolId != null && this.selectedSchoolIds.includes(schoolId);
    });
  }

  get filteredStudentGrades(): Grade[] {
    const schoolIds = this.user?.schoolIds ?? [];
    if (!schoolIds.length) {
      return [];
    }

    return this.availableGrades.filter(grade => {
      const schoolId = grade.schoolId ?? null;
      return schoolId != null && schoolIds.includes(schoolId);
    });
  }

  get statusLabel(): string {
    const status = (this.user?.status ?? '').trim().toUpperCase();

    switch (status) {
      case 'ACTIVE':
        return 'Active';
      case 'INACTIVE':
        return 'Inactive';
      case 'PENDING':
        return 'Pending';
      case 'DELETED':
        return 'Deleted';
      default:
        return 'Unknown';
    }
  }

  formatDate(value?: string | null): string {
    if (!value) {
      return 'N/A';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return 'N/A';
    }

    return new Intl.DateTimeFormat('en-ZA', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  }

  get displayName(): string {
    if (!this.user) {
      return 'N/A';
    }

    return this.buildDisplayName(this.user) || 'N/A';
  }

  onSchoolSelectionChange(schoolId: number, checked: boolean): void {
    if (checked) {
      if (!this.selectedSchoolIds.includes(schoolId)) {
        this.selectedSchoolIds = [...this.selectedSchoolIds, schoolId];
      }
    } else {
      this.selectedSchoolIds = this.selectedSchoolIds.filter(id => id !== schoolId);
    }

    const allowedGradeIds = new Set(this.filteredTeacherGrades.map(grade => grade.id).filter((id): id is number => id != null));
    this.selectedTeacherGradeIds = this.selectedTeacherGradeIds.filter(id => allowedGradeIds.has(id));
  }

  onTeacherGradeSelectionChange(gradeId: number, checked: boolean): void {
    if (checked) {
      if (!this.selectedTeacherGradeIds.includes(gradeId)) {
        this.selectedTeacherGradeIds = [...this.selectedTeacherGradeIds, gradeId];
      }
      return;
    }

    this.selectedTeacherGradeIds = this.selectedTeacherGradeIds.filter(id => id !== gradeId);
  }

  startEditPersonal(): void {
    if (!this.user) {
      return;
    }

    this.personalForm = {
      title: this.user.title ?? Title.Mr,
      firstName: this.user.firstName ?? '',
      lastName: this.user.lastName ?? '',
      phone: this.user.phone ?? '',
    };
    this.isEditingPersonal = true;
    this.errorMessage = '';
    this.saveMessage = '';
  }

  cancelEditPersonal(): void {
    this.isEditingPersonal = false;
  }

  savePersonalInformation(): void {
    if (!this.user?.id || this.isSavingPersonal) {
      return;
    }

    const firstName = this.personalForm.firstName.trim();
    const lastName = this.personalForm.lastName.trim();

    if (!firstName || !lastName) {
      this.errorMessage = 'First name and last name are required.';
      this.saveMessage = '';
      return;
    }

    this.isSavingPersonal = true;
    this.errorMessage = '';
    this.saveMessage = '';

    this.backendService.put<User, User>(`user/${this.user.id}`, this.buildUpdatePayload({
      title: this.personalForm.title,
      firstName,
      lastName,
      phone: this.nullIfBlank(this.personalForm.phone),
    })).subscribe({
      next: (response) => {
        this.applyUserResponse(response);
        this.isEditingPersonal = false;
        this.saveMessage = 'Personal information updated successfully.';
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = error.error?.message || 'Failed to update personal information.';
      },
      complete: () => {
        this.isSavingPersonal = false;
      },
    });
  }

  startEditAccount(): void {
    if (!this.user) {
      return;
    }

    this.accountForm = {
      email: this.user.email ?? '',
      status: this.user.status ?? Status.ACTIVE,
    };
    this.isEditingAccount = true;
    this.errorMessage = '';
    this.saveMessage = '';
  }

  cancelEditAccount(): void {
    this.isEditingAccount = false;
  }

  saveAccountInformation(): void {
    if (!this.user?.id || this.isSavingAccount) {
      return;
    }

    const email = this.accountForm.email.trim().toLowerCase();
    if (!email) {
      this.errorMessage = 'Email is required.';
      this.saveMessage = '';
      return;
    }

    this.isSavingAccount = true;
    this.errorMessage = '';
    this.saveMessage = '';

    this.backendService.put<User, User>(`user/${this.user.id}`, this.buildUpdatePayload({
      email,
      status: this.accountForm.status,
    })).subscribe({
      next: (response) => {
        this.applyUserResponse(response);
        this.isEditingAccount = false;
        this.saveMessage = 'Account information updated successfully.';
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = error.error?.message || 'Failed to update account information.';
      },
      complete: () => {
        this.isSavingAccount = false;
      },
    });
  }

  saveSchoolAssignments(): void {
    if (!this.user?.id || this.isSavingSchools) {
      return;
    }

    this.isSavingSchools = true;
    this.errorMessage = '';
    this.saveMessage = '';

    this.backendService.put<User, User>(`user/${this.user.id}`, this.buildUpdatePayload({
      schoolIds: this.selectedSchoolIds,
      teacherGradeIds: this.selectedTeacherGradeIds,
    })).subscribe({
      next: (response) => {
        this.applyUserResponse(response);
        this.saveMessage = 'School assignments updated successfully.';
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = error.error?.message || 'Failed to update school assignments.';
      },
      complete: () => {
        this.isSavingSchools = false;
      },
    });
  }

  saveTeacherGradeAssignments(): void {
    if (!this.user?.id || this.isSavingTeacherGrades) {
      return;
    }

    this.isSavingTeacherGrades = true;
    this.errorMessage = '';
    this.saveMessage = '';

    this.backendService.put<User, User>(`user/${this.user.id}`, this.buildUpdatePayload({
      schoolIds: this.selectedSchoolIds,
      teacherGradeIds: this.selectedTeacherGradeIds,
    })).subscribe({
      next: (response) => {
        this.applyUserResponse(response);
        this.saveMessage = 'Teacher grade assignments updated successfully.';
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = error.error?.message || 'Failed to update teacher grade assignments.';
      },
      complete: () => {
        this.isSavingTeacherGrades = false;
      },
    });
  }

  saveStudentGradeAssignment(): void {
    if (!this.user?.id || this.isSavingStudentGrade) {
      return;
    }

    if (!this.selectedStudentGradeId) {
      this.errorMessage = 'Please select a grade for the student.';
      this.saveMessage = '';
      return;
    }

    this.isSavingStudentGrade = true;
    this.errorMessage = '';
    this.saveMessage = '';

    this.backendService.put<User, User>(`user/${this.user.id}`, this.buildUpdatePayload({
      gradeId: this.selectedStudentGradeId,
    })).subscribe({
      next: (response) => {
        this.applyUserResponse(response);
        this.saveMessage = 'Student grade updated successfully.';
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = error.error?.message || 'Failed to update student grade.';
      },
      complete: () => {
        this.isSavingStudentGrade = false;
      },
    });
  }

  private loadUser(id: number): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.backendService.get<User>(`user/${id}`).subscribe({
      next: (response) => {
        this.applyUserResponse(response);
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = error.error?.message || 'Failed to load user details.';
      },
      complete: () => {
        this.isLoading = false;
      },
    });
  }

  private loadSchools(): void {
    this.backendService.get<SchoolOption[]>('school').subscribe({
      next: (response) => {
        this.availableSchools = response ?? [];
      },
    });
  }

  private loadGrades(): void {
    this.backendService.get<Grade[]>('grade').subscribe({
      next: (response) => {
        this.availableGrades = response ?? [];
      },
    });
  }

  private buildDisplayName(user: User): string {
    const title = (user.title ?? '').trim();
    const firstName = (user.firstName ?? '').trim();
    const lastName = (user.lastName ?? '').trim();

    return [title, firstName, lastName]
      .filter(part => part.length > 0)
      .join(' ');
  }

  private nullIfBlank(value?: string | null): string | null {
    if (value == null) {
      return null;
    }

    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }

  private hasRole(role: Role): boolean {
    return this.getUserRoles().includes(role);
  }

  private getUserRoles(): Role[] {
    if (this.user?.roles?.length) {
      return this.user.roles;
    }

    if (this.user?.role) {
      return [this.user.role];
    }

    return [];
  }

  private buildUpdatePayload(overrides: Partial<User>): User {
    const user = this.user as User;

    return {
      ...user,
      ...overrides,
      password: null,
      schoolIds: overrides.schoolIds ?? user.schoolIds ?? [],
      gradeId: overrides.gradeId ?? user.gradeId ?? null,
      teacherGradeIds: overrides.teacherGradeIds ?? user.teacherGradeIds ?? [],
    };
  }

  private applyUserResponse(user: User): void {
    this.user = user;
    this.selectedSchoolIds = [...(user.schoolIds ?? [])];
    this.selectedTeacherGradeIds = [...(user.teacherGradeIds ?? [])];
    this.selectedStudentGradeId = user.gradeId ?? null;
    this.personalForm = {
      title: user.title ?? Title.Mr,
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
      phone: user.phone ?? '',
    };
    this.accountForm = {
      email: user.email ?? '',
      status: user.status ?? Status.ACTIVE,
    };
  }
}
