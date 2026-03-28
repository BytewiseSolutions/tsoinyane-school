import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-security',
  standalone: false,
  templateUrl: './security.html',
  styleUrl: './security.scss',
})
export class Security implements OnInit {
  securitySettings = {
    twoFactor: false,
    auditLogging: true,
    allowIpRestriction: false,
    sessionTimeoutMinutes: 30,
    passwordExpiryDays: 90,
    ipWhitelist: '',
  };

  message = '';

  ngOnInit() {
    const saved = localStorage.getItem('tgcs_security_settings');
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        this.securitySettings = { ...this.securitySettings, ...parsed };
      }
    } catch {
      // keep defaults
    }
  }

  saveSecuritySettings() {
    localStorage.setItem('tgcs_security_settings', JSON.stringify(this.securitySettings));
    this.message = 'Security settings saved.';
    setTimeout(() => (this.message = ''), 2500);
  }
}
