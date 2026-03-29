import { Component } from '@angular/core';

type UserRole = 'System Admin' | 'Teacher' | 'Student';

interface UserRow {
  id: number;
  fullName: string;
  email: string;
  role: UserRole;
  status: 'Active' | 'Inactive';
}

@Component({
  selector: 'app-users',
  standalone: false,
  templateUrl: './users.html',
  styleUrl: './users.scss',
})
export class Users {
  searchTerm = '';
  roleFilter: 'All' | UserRole = 'All';

  users: UserRow[] = [
    { id: 1, fullName: 'Lebohang Monamane', email: 'admin@tsoinyane.co.ls', role: 'System Admin', status: 'Active' },
    { id: 2, fullName: 'Thabo Mokoena', email: 'thabo.mokoena@tsoinyane.co.ls', role: 'Teacher', status: 'Active' },
    { id: 3, fullName: 'Mpho Pheko', email: 'mpho.pheko@tsoinyane.co.ls', role: 'Teacher', status: 'Inactive' },
    { id: 4, fullName: 'Lineo Letsie', email: 'lineo.letsie@tsoinyane.co.ls', role: 'Student', status: 'Active' },
    { id: 5, fullName: 'Mpho Nkosi', email: 'mpho.nkosi@tsoinyane.co.ls', role: 'Student', status: 'Inactive' },
    { id: 6, fullName: 'Refiloe Mofokeng', email: 'refiloe.mofokeng@tsoinyane.co.ls', role: 'Student', status: 'Active' },
  ];

  get filteredUsers(): UserRow[] {
    const query = this.searchTerm.trim().toLowerCase();
    return this.users.filter(user => {
      const roleMatch = this.roleFilter === 'All' || user.role === this.roleFilter;
      const queryMatch = !query
        || user.fullName.toLowerCase().includes(query)
        || user.email.toLowerCase().includes(query)
        || user.role.toLowerCase().includes(query);
      return roleMatch && queryMatch;
    });
  }

  get totalUsers(): number {
    return this.users.length;
  }

  get totalAdmins(): number {
    return this.users.filter(user => user.role === 'System Admin').length;
  }

  get totalTeachers(): number {
    return this.users.filter(user => user.role === 'Teacher').length;
  }

  get totalStudents(): number {
    return this.users.filter(user => user.role === 'Student').length;
  }

  toggleStatus(user: UserRow) {
    user.status = user.status === 'Active' ? 'Inactive' : 'Active';
  }

  removeUser(user: UserRow) {
    this.users = this.users.filter(item => item.id !== user.id);
  }
}
