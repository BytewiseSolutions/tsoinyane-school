import { Component } from '@angular/core';
import { SidebarStateService } from '../sidebar-state';

@Component({
  selector: 'app-header',
  standalone: false,
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class AdminHeader {
  notificationsOpen = false;

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

  constructor(private sidebarState: SidebarStateService) {}

  toggleSidebar() {
    this.sidebarState.toggle();
  }

  toggleNotifications() {
    this.notificationsOpen = !this.notificationsOpen;
  }

  closeNotifications() {
    this.notificationsOpen = false;
  }
}
