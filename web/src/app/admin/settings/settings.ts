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

  schoolMessage = '';
  passwordMessage = '';
  passwordError = '';

  ngOnInit() {
    const savedSchoolInfo = localStorage.getItem('tgcs_school_info');
    if (savedSchoolInfo) {
      this.schoolInfo = { ...this.schoolInfo, ...JSON.parse(savedSchoolInfo) };
    }
  }

  saveSchoolInfo() {
    localStorage.setItem('tgcs_school_info', JSON.stringify(this.schoolInfo));
    this.schoolMessage = 'School information saved successfully.';
    setTimeout(() => (this.schoolMessage = ''), 2500);
  }

  updatePassword() {
    this.passwordMessage = '';
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

    this.passwordForm = { currentPassword: '', newPassword: '', confirmPassword: '' };
    this.passwordMessage = 'Password updated successfully.';
    setTimeout(() => (this.passwordMessage = ''), 2500);
  }
}
