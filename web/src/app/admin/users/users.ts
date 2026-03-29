import { Component, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { BackendService } from '../../util/backend.service';
import { User } from './user';
import { Role } from './role';
import { Status } from './status';

@Component({
  selector: 'app-users',
  standalone: false,
  templateUrl: './users.html',
  styleUrl: './users.scss',
})
export class Users implements OnInit {
  searchTerm = '';
  roleFilter: 'All' | 'SYSTEM_ADMIN' | 'SCHOOL_ADMIN' | 'TEACHER' | 'STUDENT' = 'All';
  isLoading = false;
  errorMessage = '';
  showUserForm = false;
  editingUser: User | null = null;
  users: User[] = [];

  constructor(private backendService: BackendService) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  get filteredUsers(): User[] {
    const query = this.searchTerm.trim().toLowerCase();
    return this.users.filter(user => {
      const userRoles = this.getUserRoles(user).map(role => role.toUpperCase());
      const roleMatch = this.roleFilter === 'All' || userRoles.includes(this.roleFilter);
      const queryMatch = !query
        || this.getFullName(user).toLowerCase().includes(query)
        || (user.email ?? '').toLowerCase().includes(query)
        || this.getRoleLabels(user).toLowerCase().includes(query);
      return roleMatch && queryMatch;
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
    const current = user.status;
    user.status = current === Status.ACTIVE ? Status.INACTIVE : Status.ACTIVE;
  }

  removeUser(user: User) {
    this.users = this.users.filter(item => item.id !== user.id);
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

    this.backendService.get<User[]>('users').subscribe({
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
