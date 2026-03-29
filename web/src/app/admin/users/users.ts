import { Component, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { BackendService } from '../../util/backend.service';
import { User } from './user';
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
  users: User[] = [];

  constructor(private backendService: BackendService) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  get filteredUsers(): User[] {
    const query = this.searchTerm.trim().toLowerCase();
    return this.users.filter(user => {
      const roleMatch = this.roleFilter === 'All' || (user.role ?? '').toUpperCase() === this.roleFilter;
      const queryMatch = !query
        || this.getFullName(user).toLowerCase().includes(query)
        || (user.email ?? '').toLowerCase().includes(query)
        || this.getRoleLabel(user.role).toLowerCase().includes(query);
      return roleMatch && queryMatch;
    });
  }

  get totalUsers(): number {
    return this.users.length;
  }

  get totalAdmins(): number {
    return this.users.filter(user => (user.role ?? '').toUpperCase() === 'SYSTEM_ADMIN').length;
  }

  get totalTeachers(): number {
    return this.users.filter(user => (user.role ?? '').toUpperCase() === 'TEACHER').length;
  }

  get totalStudents(): number {
    return this.users.filter(user => (user.role ?? '').toUpperCase() === 'STUDENT').length;
  }

  toggleStatus(user: User) {
    const current = user.status;
    user.status = current === Status.ACTIVE ? Status.INACTIVE : Status.ACTIVE;
  }

  removeUser(user: User) {
    this.users = this.users.filter(item => item.id !== user.id);
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

  getRoleLabel(role?: string | null): string {
    const normalized = (role ?? '').trim().toUpperCase();

    switch (normalized) {
      case 'SYSTEM_ADMIN':
        return 'System Admin';
      case 'SCHOOL_ADMIN':
        return 'School Admin';
      case 'TEACHER':
        return 'Teacher';
      case 'STUDENT':
        return 'Student';
      default:
        return 'Unknown';
    }
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
}
