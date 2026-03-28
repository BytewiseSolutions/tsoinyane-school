import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface RoleSetting {
  name: string;
  description: string;
  users: number;
  permissionLevel: 'Full' | 'Limited' | 'Read-only';
}

@Component({
  selector: 'app-roles',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './roles.html',
  styleUrl: './roles.scss',
})
export class Roles implements OnInit {
  roles: RoleSetting[] = this.getDefaultRoles();

  newRole = {
    name: '',
    description: '',
    permissionLevel: 'Read-only' as RoleSetting['permissionLevel'],
  };

  roleError = '';
  message = '';

  ngOnInit() {
    const saved = localStorage.getItem('tgcs_roles');
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        this.roles = parsed as RoleSetting[];
      } else if (parsed && typeof parsed === 'object') {
        this.roles = Object.values(parsed) as RoleSetting[];
      }
    } catch {
      this.roles = this.getDefaultRoles();
    }
  }

  addRole() {
    this.roleError = '';

    const name = this.newRole.name.trim();
    const description = this.newRole.description.trim();

    if (!name || !description) {
      this.roleError = 'Role name and description are required.';
      return;
    }

    const exists = this.roles.some(role => role.name.toLowerCase() === name.toLowerCase());
    if (exists) {
      this.roleError = 'A role with this name already exists.';
      return;
    }

    this.roles.push({
      name,
      description,
      users: 0,
      permissionLevel: this.newRole.permissionLevel,
    });

    this.newRole = {
      name: '',
      description: '',
      permissionLevel: 'Read-only',
    };

    localStorage.setItem('tgcs_roles', JSON.stringify(this.roles));
    this.message = 'Role added successfully.';
    setTimeout(() => (this.message = ''), 2500);
  }

  deleteRole(role: RoleSetting) {
    if (role.name === 'Administrator') {
      this.roleError = 'Administrator role cannot be deleted.';
      return;
    }

    this.roles = this.roles.filter(item => item !== role);
    localStorage.setItem('tgcs_roles', JSON.stringify(this.roles));
    this.message = 'Role removed successfully.';
    setTimeout(() => (this.message = ''), 2500);
  }

  private getDefaultRoles(): RoleSetting[] {
    return [
      { name: 'Administrator', description: 'Full system control and user management.', users: 1, permissionLevel: 'Full' },
      { name: 'Teacher', description: 'Manage classes, marks, and attendance.', users: 15, permissionLevel: 'Limited' },
      { name: 'Clerk', description: 'Manage student records and reports.', users: 2, permissionLevel: 'Limited' },
    ];
  }
}
