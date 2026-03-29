import { Component, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { BackendService } from '../../../util/backend.service';
import { User } from '../user';

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

  private loadUser(id: number): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.backendService.get<User>(`user/${id}`).subscribe({
      next: (response) => {
        this.user = response;
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = error.error?.message || 'Failed to load user details.';
      },
      complete: () => {
        this.isLoading = false;
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
}
