import { Component, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { BackendService } from '../../../util/backend.service';
import { User } from '../user';
import { Role } from '../role';
import { Grade } from '../../grades/grade';
import { SchoolOption } from '../../school-option';

@Component({
  selector: 'app-user-details',
  standalone: false,
  templateUrl: './user-details.html',
  styleUrls: ['./user-details.scss'],
})
export class UserDetails implements OnInit {
  user: User | null = null;
  isLoading = true;
  errorMessage = '';
  saveMessage = '';
  isSavingSchools = false;
  isSavingTeacherGrades = false;
  availableSchools: SchoolOption[] = [];
  availableGrades: Grade[] = [];
  selectedSchoolIds: number[] = [];
  selectedTeacherGradeIds: number[] = [];

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

  get fullName(): string {
    if (!this.user) {
      return 'User Details';
    }

    return this.buildDisplayName(this.user) || 'Unknown User';
  }

  get roleLabels(): string {
    const roles = this.user?.roles ?? [];
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

  get isStudent(): boolean {
    return this.hasRole(Role.STUDENT);
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

  private hasRole(role: Role): boolean {
    const roles = this.user?.roles ?? [];
    return roles.includes(role);
  }

  private buildUpdatePayload(overrides: Partial<User>): User {
    const user = this.user as User;

    return {
      ...user,
      ...overrides,
      password: null,
      schoolIds: overrides.schoolIds ?? user.schoolIds ?? [],
      gradeId: user.gradeId ?? null,
      teacherGradeIds: overrides.teacherGradeIds ?? user.teacherGradeIds ?? [],
    };
  }

  private applyUserResponse(user: User): void {
    this.user = user;
    this.selectedSchoolIds = [...(user.schoolIds ?? [])];
    this.selectedTeacherGradeIds = [...(user.teacherGradeIds ?? [])];
  }
}
