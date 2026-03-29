import { Component, OnDestroy, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { BackendService } from '../../util/backend.service';
import { User } from './user';
import { Role } from './role';
import { Status } from './status';
import { finalize, Subject, takeUntil } from 'rxjs';
import { SchoolContextService } from '../layout/school-context';

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
  showUserForm = false;
  isProcessing = false;
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
