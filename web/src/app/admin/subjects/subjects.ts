import { Component } from '@angular/core';
import { SchoolSubject } from './subject-form/subject-form';

@Component({
  selector: 'app-admin-subjects',
  standalone: false,
  templateUrl: './subjects.html',
  styleUrl: './subjects.scss',
})
export class AdminSubjects {
  showForm = false;
  selectedSubject: SchoolSubject | null = null;

  subjects: SchoolSubject[] = [
    { name: 'Mathematics', school: 'Both', teacher: 'Mr. Thabang Molapo', students: 120, status: 'Active' },
    { name: 'English', school: 'Both', teacher: 'Ms. Mamello Tau', students: 120, status: 'Active' },
    { name: 'Physics', school: 'High School', teacher: "Mr. Lehlohonolo Nts'i", students: 60, status: 'Active' },
    { name: 'History', school: 'High School', teacher: 'Ms. Nthabiseng Mokhele', students: 55, status: 'Inactive' },
  ];

  openForm(subject: SchoolSubject | null = null) {
    this.selectedSubject = subject;
    this.showForm = true;
  }

  closeForm() {
    this.showForm = false;
    this.selectedSubject = null;
  }

  onSaved(subject: SchoolSubject) {
    if (this.selectedSubject) {
      const index = this.subjects.indexOf(this.selectedSubject);
      if (index > -1) this.subjects[index] = subject;
    } else {
      this.subjects.push(subject);
    }
    this.closeForm();
  }

  deleteSubject(subject: SchoolSubject) {
    this.subjects = this.subjects.filter(s => s !== subject);
  }
}
