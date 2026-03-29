import { Component } from '@angular/core';
import { SidebarStateService } from '../sidebar-state';
import { AuthUser } from '../../../models/auth-user';
import { BackendService } from '../../../util/backend.service';
import { HttpErrorResponse } from '@angular/common/http';
import { SchoolContextService } from '../school-context';
import { SchoolOption } from '../../school-option';

@Component({
  selector: 'app-header',
  standalone: false,
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class AdminHeader {
  notificationsOpen = false;
  currentUserRole = 'Administrator';
  isSystemAdmin = false;
  schools: SchoolOption[] = [];
  selectedSchoolId: number | null = null;

  notifications = [
    { icon: 'fa-user-graduate', title: 'New Student Enrolled', message: 'Refiloe Mofokeng has been added to Form D.', time: '2 mins ago' },
    { icon: 'fa-chalkboard-teacher', title: 'New Teacher Added', message: 'Mr. Retselisitsoe Phoofolo joined the Geography department.', time: '1 hour ago' },
    { icon: 'fa-calendar-days', title: 'Upcoming Event', message: 'Sports Day is scheduled for March 15, 2026.', time: '3 hours ago' },
    { icon: 'fa-book-open', title: 'Subject Updated', message: 'Physics subject details have been updated.', time: 'Yesterday' },
    { icon: 'fa-gear', title: 'Settings Changed', message: 'School contact information was updated.', time: '2 days ago' },
  ];

  notifPrefs = {
    newStudent: true,
    newTeacher: true,
    upcomingEvents: true,
    systemUpdates: false,
    backupCompleted: true,
    securityAlerts: true,
  };

  constructor(
    private sidebarState: SidebarStateService,
    private backendService: BackendService,
    private schoolContext: SchoolContextService
  ) {}

  ngOnInit() {
    this.loadCurrentUser();
    if (this.isSystemAdmin) {
      this.loadSchoolsForContext();
    }
  }

  toggleSidebar() {
    this.sidebarState.toggle();
  }

  toggleNotifications() {
    this.notificationsOpen = !this.notificationsOpen;
  }

  closeNotifications() {
    this.notificationsOpen = false;
  }

  private loadCurrentUser() {
    const raw = localStorage.getItem('user') ?? sessionStorage.getItem('user');
    if (!raw) {
      return;
    }

    try {
      const user = JSON.parse(raw) as AuthUser;
      const primaryRole = this.resolvePrimaryRole(user);
      if (primaryRole) {
        this.currentUserRole = this.formatRole(primaryRole);
      }
      this.isSystemAdmin = this.hasSystemAdminRole(user);
    } catch {
  
    }
  }

  onSchoolChange() {
    const school = this.schools.find(item => item.id === Number(this.selectedSchoolId));
    if (this.selectedSchoolId == null || !school) {
      this.schoolContext.setSelectedSchool(null);
      return;
    }

    this.schoolContext.setSelectedSchool({ id: school.id, name: school.name });
  }

  private formatRole(role: string): string {
    return role
      .toLowerCase()
      .split('_')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  private hasSystemAdminRole(user: AuthUser): boolean {
    if (this.normalizeRole(user.role) === 'SYSTEM_ADMIN') {
      return true;
    }

    return (user.roles ?? [])
      .map(role => this.normalizeRole(role))
      .includes('SYSTEM_ADMIN');
  }

  private resolvePrimaryRole(user: AuthUser): string {
    if (user.role) {
      return user.role;
    }

    if (user.roles && user.roles.length > 0) {
      return user.roles[0];
    }

    return 'ADMINISTRATOR';
  }

  private normalizeRole(role?: string): string {
    return (role ?? '')
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '_');
  }

  private loadSchoolsForContext() {
    this.backendService.get<SchoolOption[]>('school').subscribe({
      next: (schools) => {
        this.schools = schools ?? [];
        this.selectDefaultSchool();
      },
      error: (_: HttpErrorResponse) => {
        this.schools = [];
      },
    });
  }

  private selectDefaultSchool() {
    if (!this.schools.length) {
      return;
    }

    const existing = this.schoolContext.selectedSchool;
    if (existing) {
      const numericId = Number(existing.id);
      const exists = this.schools.some(school => school.id === numericId);
      if (exists) {
        this.selectedSchoolId = numericId;
        return;
      }
    }

    const defaultSchool = this.schools.find(
      school => school.name.trim().toLowerCase() === 'tsoinyane primary school'
    ) ?? this.schools[0];

    this.selectedSchoolId = defaultSchool.id;
    this.onSchoolChange();
  }
}
