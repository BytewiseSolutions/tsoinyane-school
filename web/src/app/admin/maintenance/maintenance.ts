import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-maintenance',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './maintenance.html',
  styleUrl: './maintenance.scss',
})
export class Maintenance implements OnInit {
  maintenanceSettings = {
    autoBackup: true,
    backupFrequency: 'Weekly',
    retentionDays: 90,
    maintenanceMode: false,
  };

  maintenanceMessage = '';
  adminMessage = '';

  ngOnInit() {
    const saved = localStorage.getItem('tgcs_maintenance_settings');
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        this.maintenanceSettings = { ...this.maintenanceSettings, ...parsed };
      }
    } catch {
      // keep defaults
    }
  }

  saveMaintenanceSettings() {
    localStorage.setItem('tgcs_maintenance_settings', JSON.stringify(this.maintenanceSettings));
    this.maintenanceMessage = 'Maintenance settings saved.';
    setTimeout(() => (this.maintenanceMessage = ''), 2500);
  }

  runBackupNow() {
    localStorage.setItem('tgcs_backup_last_run', new Date().toISOString());
    this.maintenanceMessage = 'Backup started successfully.';
    setTimeout(() => (this.maintenanceMessage = ''), 2500);
  }

  exportSystemConfig() {
    const payload = {
      exportedAt: new Date().toISOString(),
      schoolInfo: this.readObject('tgcs_school_info'),
      academicSettings: this.readObject('tgcs_academic_settings'),
      notificationSettings: this.readObject('tgcs_notification_settings'),
      securitySettings: this.readObject('tgcs_security_settings'),
      integrationSettings: this.readObject('tgcs_integration_settings'),
      maintenanceSettings: this.readObject('tgcs_maintenance_settings'),
      roles: this.readArray('tgcs_roles'),
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tgcs-system-config-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);

    this.adminMessage = 'System configuration exported.';
    setTimeout(() => (this.adminMessage = ''), 2500);
  }

  async importSystemConfig(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const payload = JSON.parse(text);

      if (!payload || typeof payload !== 'object') {
        this.adminMessage = 'Invalid configuration file.';
        return;
      }

      this.writeIfObject('tgcs_school_info', payload['schoolInfo']);
      this.writeIfObject('tgcs_academic_settings', payload['academicSettings']);
      this.writeIfObject('tgcs_notification_settings', payload['notificationSettings']);
      this.writeIfObject('tgcs_security_settings', payload['securitySettings']);
      this.writeIfObject('tgcs_integration_settings', payload['integrationSettings']);
      this.writeIfObject('tgcs_maintenance_settings', payload['maintenanceSettings']);
      this.writeIfArray('tgcs_roles', payload['roles']);

      const refreshed = this.readObject('tgcs_maintenance_settings');
      if (refreshed) {
        this.maintenanceSettings = { ...this.maintenanceSettings, ...refreshed };
      }

      this.adminMessage = 'System configuration imported successfully.';
    } catch {
      this.adminMessage = 'Could not import configuration file.';
    } finally {
      input.value = '';
      setTimeout(() => (this.adminMessage = ''), 2500);
    }
  }

  resetSystemData() {
    const shouldReset = window.confirm('Reset all system settings to defaults? This cannot be undone.');
    if (!shouldReset) return;

    const keysToClear: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key?.startsWith('tgcs_')) keysToClear.push(key);
    }
    keysToClear.forEach(key => localStorage.removeItem(key));

    this.maintenanceSettings = {
      autoBackup: true,
      backupFrequency: 'Weekly',
      retentionDays: 90,
      maintenanceMode: false,
    };

    this.adminMessage = 'System reset completed. Defaults restored.';
    setTimeout(() => (this.adminMessage = ''), 2500);
  }

  private readObject(key: string): Record<string, unknown> | null {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
    } catch {
      return null;
    }
  }

  private readArray(key: string): unknown[] | null {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  private writeIfObject(key: string, value: unknown) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      localStorage.setItem(key, JSON.stringify(value));
    }
  }

  private writeIfArray(key: string, value: unknown) {
    if (Array.isArray(value)) {
      localStorage.setItem(key, JSON.stringify(value));
    }
  }
}
