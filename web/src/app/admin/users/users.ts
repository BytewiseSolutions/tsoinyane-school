import { Component, OnDestroy, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { BackendService } from '../../util/backend.service';
import { User } from './user';
import { Role } from './role';
import { Status } from './status';
import { finalize, firstValueFrom, Subject, takeUntil } from 'rxjs';
import { SchoolContextService } from '../layout/school-context';
import { Grade } from '../grades/grade';
import { Title } from './title';

interface ImportRow {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  title?: string;
  phone?: string;
  roles?: string;
  status?: string;
  grade?: string;
}

@Component({
  selector: 'app-users',
  standalone: false,
  templateUrl: './users.html',
  styleUrl: './users.scss',
})
export class Users implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  searchTerm = '';
  roleFilter: 'All' | 'SYSTEM_ADMIN' | 'SCHOOL_ADMIN' | 'TEACHER' | 'STUDENT' = 'All';
  isLoading = false;
  errorMessage = '';
  importMessage = '';
  showUserForm = false;
  isProcessing = false;
  isImporting = false;
  editingUser: User | null = null;
  showDeleteDialog = false;
  userToDelete: User | null = null;
  showStatusDialog = false;
  userToToggleStatus: User | null = null;
  pendingStatus: Status = Status.INACTIVE;
  selectedSchoolId: number | null = null;
  users: User[] = [];

  constructor(
    private backendService: BackendService,
    private schoolContext: SchoolContextService
  ) {}

  ngOnInit(): void {
    this.schoolContext.selectedSchool$
      .pipe(takeUntil(this.destroy$))
      .subscribe(school => {
        this.selectedSchoolId = school?.id ?? null;
      });

    this.loadUsers();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get filteredUsers(): User[] {
    const query = this.searchTerm.trim().toLowerCase();
    return this.users.filter(user => {
      const userRoles = this.getUserRoles(user).map(role => role.toUpperCase());
      const roleMatch = this.roleFilter === 'All' || userRoles.includes(this.roleFilter);
      const schoolMatch = !this.selectedSchoolId
        || !user.schoolIds?.length
        || user.schoolIds.includes(this.selectedSchoolId);
      const queryMatch = !query
        || this.getFullName(user).toLowerCase().includes(query)
        || (user.email ?? '').toLowerCase().includes(query)
        || this.getRoleLabels(user).toLowerCase().includes(query);
      return roleMatch && schoolMatch && queryMatch;
    });
  }

  get totalUsers(): number {
    return this.users.length;
  }

  get totalAdmins(): number {
    return this.users.filter(user => this.getUserRoles(user).includes(Role.SYSTEM_ADMIN)).length;
  }

  get totalTeachers(): number {
    return this.users.filter(user => this.getUserRoles(user).includes(Role.TEACHER)).length;
  }

  get totalStudents(): number {
    return this.users.filter(user => this.getUserRoles(user).includes(Role.STUDENT)).length;
  }

  toggleStatus(user: User) {
    if (!user.id || this.isProcessing) {
      return;
    }

    const current = user.status;
    this.pendingStatus = current === Status.ACTIVE ? Status.INACTIVE : Status.ACTIVE;
    this.userToToggleStatus = user;
    this.showStatusDialog = true;
  }

  cancelToggleStatus() {
    this.userToToggleStatus = null;
    this.showStatusDialog = false;
  }

  confirmToggleStatus() {
    if (!this.userToToggleStatus?.id || this.isProcessing) {
      return;
    }

    const targetUser = this.userToToggleStatus;

    const payload: User = {
      ...targetUser,
      password: null,
      status: this.pendingStatus,
    };

    this.isProcessing = true;
    this.errorMessage = '';

    this.backendService.put<User, User>(`user/${targetUser.id}`, payload)
      .pipe(finalize(() => {
        this.isProcessing = false;
      }))
      .subscribe({
        next: (updatedUser) => {
          this.users = this.users.map(item => (item.id === updatedUser.id ? updatedUser : item));
          this.cancelToggleStatus();
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage = error.error?.message || 'Failed to update user status.';
          this.cancelToggleStatus();
        },
      });
  }

  removeUser(user: User) {
    if (!user.id || this.isProcessing) {
      return;
    }

    this.userToDelete = user;
    this.showDeleteDialog = true;
  }

  cancelDeleteUser() {
    this.userToDelete = null;
    this.showDeleteDialog = false;
  }

  confirmDeleteUser() {
    if (!this.userToDelete?.id || this.isProcessing) {
      return;
    }

    const targetUser = this.userToDelete;

    this.isProcessing = true;
    this.errorMessage = '';

    this.backendService.delete<void>(`user/${targetUser.id}`)
      .pipe(finalize(() => {
        this.isProcessing = false;
      }))
      .subscribe({
        next: () => {
          this.users = this.users.filter(item => item.id !== targetUser.id);
          this.cancelDeleteUser();
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage = error.error?.message || 'Failed to remove user.';
          this.cancelDeleteUser();
        },
      });
  }

  editUser(user: User) {
    this.editingUser = { ...user };
    this.showUserForm = true;
  }

  openAddUserForm() {
    this.editingUser = null;
    this.showUserForm = true;
  }

  openImportUsers(fileInput: HTMLInputElement) {
    fileInput.value = '';
    fileInput.click();
  }

  async importUsersFromFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    if (!this.selectedSchoolId) {
      this.importMessage = 'Select the current school from the top header before importing users.';
      return;
    }

    this.isImporting = true;
    this.errorMessage = '';
    this.importMessage = '';

    try {
      const text = await file.text();
      const rows = this.parseCsv(text);

      if (!rows.length) {
        this.importMessage = 'The selected CSV file is empty.';
        return;
      }

      const grades = await firstValueFrom(this.backendService.get<Grade[]>('grade'));
      const schoolGrades = (grades ?? []).filter(grade => grade.schoolId === this.selectedSchoolId);

      const createdUsers: User[] = [];
      let failures = 0;

      for (const row of rows) {
        try {
          const payload = this.mapImportRowToUser(row, schoolGrades);
          const savedUser = await firstValueFrom(this.backendService.post<User, User>('user', payload));
          createdUsers.unshift(savedUser);
        } catch {
          failures += 1;
        }
      }

      if (createdUsers.length) {
        const existingIds = new Set(this.users.map(user => user.id));
        this.users = [...createdUsers.filter(user => !existingIds.has(user.id)), ...this.users];
      }

      this.importMessage = failures
        ? `Imported ${createdUsers.length} user(s). ${failures} row(s) failed.`
        : `Imported ${createdUsers.length} user(s) successfully.`;
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Failed to import users.';
    } finally {
      this.isImporting = false;
      input.value = '';
    }
  }

  closeAddUserForm() {
    this.showUserForm = false;
    this.editingUser = null;
  }

  onUserSaved(user: User) {
    const exists = this.users.some(item => item.id === user.id);
    this.users = exists
      ? this.users.map(item => (item.id === user.id ? user : item))
      : [user, ...this.users];
    this.showUserForm = false;
    this.editingUser = null;
  }

  private loadUsers() {
    this.isLoading = true;
    this.errorMessage = '';

    this.backendService.get<User[]>('user').subscribe({
      next: (response) => {
        this.users = response;
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = error.error?.message || 'Failed to load users.';
      },
      complete: () => {
        this.isLoading = false;
      },
    });
  }

  private parseCsv(text: string): ImportRow[] {
    const lines = text
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (lines.length < 2) {
      return [];
    }

    const headers = this.parseCsvLine(lines[0]).map(header => header.trim().toLowerCase());
    const rows: ImportRow[] = [];

    for (const line of lines.slice(1)) {
      const values = this.parseCsvLine(line);
      const row: Record<string, string> = {};

      headers.forEach((header, index) => {
        row[header] = (values[index] ?? '').trim();
      });

      rows.push({
        firstName: row['firstname'] || row['first_name'] || '',
        lastName: row['lastname'] || row['last_name'] || '',
        email: row['email'] || '',
        password: row['password'] || '',
        title: row['title'] || '',
        phone: row['phone'] || '',
        roles: row['roles'] || row['role'] || '',
        status: row['status'] || '',
        grade: row['grade'] || row['gradename'] || row['grade_name'] || '',
      });
    }

    return rows;
  }

  private parseCsvLine(line: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let index = 0; index < line.length; index += 1) {
      const char = line[index];
      const next = line[index + 1];

      if (char === '"') {
        if (inQuotes && next === '"') {
          current += '"';
          index += 1;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }

      if (char === ',' && !inQuotes) {
        values.push(current);
        current = '';
        continue;
      }

      current += char;
    }

    values.push(current);
    return values;
  }

  private mapImportRowToUser(row: ImportRow, grades: Grade[]): User {
    const firstName = row.firstName.trim();
    const lastName = row.lastName.trim();
    const email = row.email.trim().toLowerCase();
    const password = row.password.trim();

    if (!firstName || !lastName || !email || !password) {
      throw new Error('Each import row must include firstName, lastName, email, and password.');
    }

    const roles = this.parseRoles(row.roles);
    const isStudent = roles.includes(Role.STUDENT);
    const gradeId = isStudent ? this.resolveGradeId(row.grade, grades) : null;

    return {
      id: 0,
      firstName,
      lastName,
      email,
      password,
      title: this.parseTitle(row.title),
      phone: this.nullIfBlank(row.phone),
      roles,
      status: this.parseStatus(row.status),
      schoolIds: this.selectedSchoolId ? [this.selectedSchoolId] : [],
      gradeId,
    };
  }

  private parseRoles(value?: string): Role[] {
    if (!value?.trim()) {
      return [Role.STUDENT];
    }

    const roles = value
      .split(/[|,;]+/)
      .map(role => role.trim().toUpperCase().replace(/\s+/g, '_'))
      .filter(role => role.length > 0)
      .map(role => role as Role)
      .filter(role => Object.values(Role).includes(role));

    return roles.length ? Array.from(new Set(roles)) : [Role.STUDENT];
  }

  private parseStatus(value?: string): Status {
    const normalized = value?.trim().toUpperCase() as Status | undefined;
    return normalized && Object.values(Status).includes(normalized) ? normalized : Status.ACTIVE;
  }

  private parseTitle(value?: string): Title | null {
    const normalized = value?.trim() as Title | undefined;
    return normalized && Object.values(Title).includes(normalized) ? normalized : null;
  }

  private resolveGradeId(value: string | undefined, grades: Grade[]): number {
    const gradeName = value?.trim().toLowerCase();
    if (!gradeName) {
      throw new Error('Student import rows must include a grade column.');
    }

    const match = grades.find(grade => grade.name.trim().toLowerCase() === gradeName);
    if (!match?.id) {
      throw new Error(`Grade "${value}" was not found for the selected school.`);
    }

    return match.id;
  }

  private nullIfBlank(value?: string): string | null {
    const trimmed = value?.trim() ?? '';
    return trimmed ? trimmed : null;
  }

  getFullName(user: User): string {
    const firstName = (user.firstName ?? '').trim();
    const lastName = (user.lastName ?? '').trim();
    return `${firstName} ${lastName}`.trim() || 'Unknown User';
  }

  getRoleLabels(user: User): string {
    const labels = this.getUserRoles(user).map(role => this.formatRole(role));
    return labels.length ? labels.join(', ') : 'Unknown';
  }

  getStatusLabel(status?: string | null): 'Active' | 'Inactive' | 'Pending' | 'Deleted' {
    const normalized = (status ?? '').trim().toUpperCase();

    switch (normalized) {
      case 'ACTIVE':
        return 'Active';
      case 'INACTIVE':
        return 'Inactive';
      case 'PENDING':
        return 'Pending';
      case 'DELETED':
        return 'Deleted';
      default:
        return 'Inactive';
    }
  }

  private getUserRoles(user: User): Role[] {
    if (user.roles && user.roles.length > 0) {
      return user.roles;
    }
    if (user.role) {
      return [user.role];
    }
    return [];
  }

  private formatRole(role: Role): string {
    switch (role) {
      case Role.SYSTEM_ADMIN:
        return 'System Admin';
      case Role.SCHOOL_ADMIN:
        return 'School Admin';
      case Role.TEACHER:
        return 'Teacher';
      case Role.STUDENT:
        return 'Student';
      default:
        return 'Unknown';
    }
  }
}
