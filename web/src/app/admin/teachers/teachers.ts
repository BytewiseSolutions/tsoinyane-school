import { Component } from '@angular/core';
import { Teacher } from './teacher-form/teacher-form';

@Component({
  selector: 'app-teachers',
  standalone: false,
  templateUrl: './teachers.html',
  styleUrl: './teachers.scss',
})
export class Teachers {
  showForm = false;
  selectedTeacher: Teacher | null = null;

  teachers: Teacher[] = [
    { firstName: 'Thabang', lastName: 'Molapo', gender: 'Male', phone: '+266 5900 0001', subject: 'Mathematics', school: 'High School', status: 'Active' },
    { firstName: 'Mamello', lastName: 'Tau', gender: 'Female', phone: '+266 5900 0002', subject: 'English', school: 'Primary', status: 'Active' },
    { firstName: 'Lehlohonolo', lastName: "Nts'i", gender: 'Male', phone: '+266 5900 0003', subject: 'Science', school: 'High School', status: 'Active' },
    { firstName: 'Nthabiseng', lastName: 'Mokhele', gender: 'Female', phone: '+266 5900 0004', subject: 'Sesotho', school: 'Primary', status: 'Active' },
    { firstName: 'Retselisitsoe', lastName: 'Phoofolo', gender: 'Male', phone: '+266 5900 0005', subject: 'Geography', school: 'High School', status: 'Inactive' },
  ];

  openForm(teacher: Teacher | null = null) {
    this.selectedTeacher = teacher;
    this.showForm = true;
  }

  closeForm() {
    this.showForm = false;
    this.selectedTeacher = null;
  }

  onSaved(teacher: Teacher) {
    if (this.selectedTeacher) {
      const index = this.teachers.indexOf(this.selectedTeacher);
      if (index > -1) this.teachers[index] = teacher;
    } else {
      this.teachers.push(teacher);
    }
    this.closeForm();
  }

  deleteTeacher(teacher: Teacher) {
    this.teachers = this.teachers.filter(t => t !== teacher);
  }
}
