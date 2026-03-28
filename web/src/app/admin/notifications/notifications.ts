import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-notifications',
  standalone: false,
  templateUrl: './notifications.html',
  styleUrl: './notifications.scss',
})
export class Notifications implements OnInit {
  notificationSettings = {
    emailAlerts: true,
    smsAlerts: false,
    eventReminders: true,
    parentSummary: true,
    adminDigest: true,
    reportDay: 'Friday',
  };

  message = '';

  ngOnInit() {
    const saved = localStorage.getItem('tgcs_notification_settings');
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        this.notificationSettings = { ...this.notificationSettings, ...parsed };
      }
    } catch {
      // keep defaults
    }
  }

  saveNotificationSettings() {
    localStorage.setItem('tgcs_notification_settings', JSON.stringify(this.notificationSettings));
    this.message = 'Notification settings saved.';
    setTimeout(() => (this.message = ''), 2500);
  }
}
