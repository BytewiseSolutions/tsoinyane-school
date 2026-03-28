import { Component } from '@angular/core';
import { Student } from './student-form/student-form';

@Component({
  selector: 'app-students',
  standalone: false,
  templateUrl: './students.html',
  styleUrl: './students.scss',
})
export class Students {
  showForm = false;
  selectedStudent: Student | null = null;

  students: Student[] = [
    { firstName: 'Lineo', lastName: 'Letsie', gender: 'Female', dob: '2008-07-22', school: 'High School', grade: 'Form C', guardian: 'Mme Letsie', guardianPhone: '+266 5900 0002', status: 'Active' },
    { firstName: 'Mpho', lastName: 'Nkosi', gender: 'Male', dob: '2014-01-05', school: 'Primary', grade: 'Grade 3', guardian: 'Ntate Nkosi', guardianPhone: '+266 5900 0003', status: 'Active' },
    { firstName: 'Palesa', lastName: 'Sithole', gender: 'Female', dob: '2006-11-18', school: 'High School', grade: 'Form E', guardian: 'Mme Sithole', guardianPhone: '+266 5900 0004', status: 'Inactive' },
    { firstName: 'Teboho', lastName: 'Ramokoena', gender: 'Male', dob: '2010-05-14', school: 'Primary', grade: 'Grade 6', guardian: 'Ntate Ramokoena', guardianPhone: '+266 5900 0005', status: 'Active' },
    { firstName: 'Refiloe', lastName: 'Mofokeng', gender: 'Female', dob: '2007-09-30', school: 'High School', grade: 'Form D', guardian: 'Mme Mofokeng', guardianPhone: '+266 5900 0006', status: 'Active' },
  ];

  openForm(student: Student | null = null) {
    this.selectedStudent = student;
    this.showForm = true;
  }

  closeForm() {
    this.showForm = false;
    this.selectedStudent = null;
  }

  onSaved(student: Student) {
    if (this.selectedStudent) {
      const index = this.students.indexOf(this.selectedStudent);
      if (index > -1) this.students[index] = student;
    } else {
      this.students.push(student);
    }
    this.closeForm();
  }

  deleteStudent(student: Student) {
    this.students = this.students.filter(s => s !== student);
  }
}
