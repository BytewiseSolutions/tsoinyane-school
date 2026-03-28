import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-settings',
  standalone: false,
  templateUrl: './settings.html',
  styleUrl: './settings.scss',
})
export class Settings implements OnInit {
  schoolInfo = {
    schoolName: 'Tsoinyane Government Combined School',
    location: 'Tsoinyane, Pitseng, Leribe',
    phone: '+266 59181664',
    email: 'info@tsoinyane.co.ls',
  };

  passwordForm = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  };

  academicSettings = {
    academicYear: '2026',
    currentTerm: 'Term 1',
    gradingScale: 'A-F',
    passingMark: 50,
    attendanceThreshold: 75,
    timezone: 'Africa/Maseru',
    language: 'English',
  };

  integrationSettings = {
    smtpHost: 'smtp.example.com',
    smtpPort: 587,
    senderEmail: 'noreply@tsoinyane.co.ls',
    smsProvider: 'None',
    smsApiKey: '',
  };

  sectionMessage: Record<string, string> = {
    school: '',
    password: '',
    academic: '',
    integrations: '',
  };

  passwordError = '';

  ngOnInit() {
    this.schoolInfo = this.loadSetting('tgcs_school_info', this.schoolInfo);
    this.academicSettings = this.loadSetting('tgcs_academic_settings', this.academicSettings);
    this.integrationSettings = this.loadSetting('tgcs_integration_settings', this.integrationSettings);
  }

  saveSchoolInfo() {
    this.persistSetting('tgcs_school_info', this.schoolInfo, 'school', 'School information saved successfully.');
  }

  updatePassword() {
    this.sectionMessage['password'] = '';
    this.passwordError = '';

    if (!this.passwordForm.currentPassword || !this.passwordForm.newPassword || !this.passwordForm.confirmPassword) {
      this.passwordError = 'Please fill in all password fields.';
      return;
    }

    if (this.passwordForm.newPassword.length < 8) {
      this.passwordError = 'New password must be at least 8 characters.';
      return;
    }

    if (this.passwordForm.newPassword !== this.passwordForm.confirmPassword) {
      this.passwordError = 'New password and confirmation do not match.';
      return;
    }

    localStorage.setItem('tgcs_password_last_updated', new Date().toISOString());
    this.passwordForm = { currentPassword: '', newPassword: '', confirmPassword: '' };
    this.setSectionMessage('password', 'Password updated successfully.');
  }

  saveAcademicSettings() {
    this.persistSetting('tgcs_academic_settings', this.academicSettings, 'academic', 'Academic settings saved.');
  }

  saveIntegrationSettings() {
    this.persistSetting('tgcs_integration_settings', this.integrationSettings, 'integrations', 'Integration settings saved.');
  }

  private loadSetting<T>(key: string, fallback: T): T {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;

    try {
      const parsed = JSON.parse(raw);

      if (Array.isArray(fallback)) {
        if (Array.isArray(parsed)) {
          return parsed as T;
        }

        // Recover from older malformed saved data where arrays were stored as objects.
        if (parsed && typeof parsed === 'object') {
          return Object.values(parsed) as T;
        }

        return fallback;
      }

      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return { ...(fallback as object), ...parsed } as T;
      }

      return fallback;
    } catch {
      return fallback;
    }
  }

  private persistSetting(key: string, data: unknown, section: string, message: string) {
    localStorage.setItem(key, JSON.stringify(data));
    this.setSectionMessage(section, message);
  }

  private setSectionMessage(section: string, message: string) {
    this.sectionMessage[section] = message;
    setTimeout(() => {
      this.sectionMessage[section] = '';
    }, 2500);
  }
}
