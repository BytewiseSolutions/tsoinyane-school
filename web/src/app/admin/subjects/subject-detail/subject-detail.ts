import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { BackendService } from '../../../util/backend.service';
import { SchoolSubject } from '../subject';
import { Status } from '../../users/status';

interface StudentOption {
  id: number;
  displayName: string;
  email: string | null;
  phone: string | null;
  studentId: string | null;
}

const SELECT_ALL_ID = -1;

@Component({
  selector: 'app-subject-detail',
  standalone: false,
  templateUrl: './subject-detail.html',
  styleUrl: './subject-detail.scss',
})
export class SubjectDetail implements OnInit {
  subject: SchoolSubject | null = null;
  isLoading = true;
  errorMessage = '';
  activeTab: 'students' | 'timetable' = 'students';

  availableStudents: StudentOption[] = [];
  selectableStudents: StudentOption[] = [];
  assignedStudents: StudentOption[] = [];
  selectedStudents: StudentOption[] = [];
  studentsError = '';

  transferringStudent: StudentOption | null = null;
  removingStudent: StudentOption | null = null;
  targetSubjectId: number | null = null;
  availableSubjects: SchoolSubject[] = [];
  isTransferring = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private backendService: BackendService
  ) {}

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    if (!Number.isFinite(id) || id <= 0) {
      this.errorMessage = 'Subject not found.';
      this.isLoading = false;
      return;
    }

    this.backendService.get<SchoolSubject>(`subject/${id}`).subscribe({
      next: (subject) => {
        this.subject = subject;
        this.loadStudents(subject.schoolId);
        this.loadAssignedStudents(id);
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = error.error?.message || 'Failed to load subject details.';
      },
      complete: () => {
        this.isLoading = false;
      },
    });
  }

  onItemAdded(item: StudentOption) {
    if (item.id === SELECT_ALL_ID) {
      this.selectedStudents = [...this.selectableStudents];
    }
  }

  onItemRemoved(item: StudentOption) {
    if (item.id === SELECT_ALL_ID) {
      this.selectedStudents = [];
    } else {
      this.selectedStudents = this.selectedStudents.filter(s => s.id !== SELECT_ALL_ID);
    }
  }

  isAlreadyAssigned(item: StudentOption): boolean {
    return item.id !== SELECT_ALL_ID && this.assignedStudents.some(s => s.id === item.id);
  }

  assignStudents() {
    const toAdd = this.selectedStudents.filter(
      s => s.id !== SELECT_ALL_ID && !this.assignedStudents.some(a => a.id === s.id)
    );
    this.assignedStudents = [...this.assignedStudents, ...toAdd];
    this.selectedStudents = [];
    this.saveAssignedStudents();
  }

  confirmRemove(student: StudentOption) {
    this.removingStudent = student;
  }

  cancelRemove() {
    this.removingStudent = null;
  }

  removeStudent(student: StudentOption) {
    this.assignedStudents = this.assignedStudents.filter(s => s.id !== student.id);
    this.removingStudent = null;
    this.saveAssignedStudents();
  }

  transferStudent(student: StudentOption) {
    this.transferringStudent = student;
    this.targetSubjectId = null;
    this.studentsError = '';

    if (!this.availableSubjects.length && this.subject?.schoolId) {
      this.backendService.get<SchoolSubject[]>('subject', { schoolId: this.subject.schoolId }).subscribe({
        next: (subjects) => {
          this.availableSubjects = (subjects ?? []).filter(s => s.id !== this.subject!.id);
        },
      });
    }
  }

  cancelTransfer() {
    this.transferringStudent = null;
    this.targetSubjectId = null;
  }

  confirmTransfer() {
    if (!this.transferringStudent || !this.targetSubjectId || this.isTransferring) return;

    this.isTransferring = true;
    const student = this.transferringStudent;
    const targetId = this.targetSubjectId;

    this.backendService.get<any[]>(`subject/${targetId}/students`).subscribe({
      next: (existing) => {
        const existingIds = (existing ?? []).map((s: any) => s.id);
        if (existingIds.includes(student.id)) {
          this.studentsError = `${student.displayName} is already assigned to the target subject.`;
          this.isTransferring = false;
          return;
        }

        const newIds = [...existingIds, student.id];
        this.backendService.put(`subject/${targetId}/students`, newIds).subscribe({
          next: () => {
            this.removeStudent(student);
            this.transferringStudent = null;
            this.targetSubjectId = null;
            this.isTransferring = false;
          },
          error: () => {
            this.studentsError = 'Failed to transfer student.';
            this.isTransferring = false;
          },
        });
      },
      error: () => {
        this.studentsError = 'Failed to transfer student.';
        this.isTransferring = false;
      },
    });
  }

  getStatusLabel(status: Status | null | undefined): string {
    return status === Status.INACTIVE ? 'Inactive' : 'Active';
  }

  goBack() {
    this.router.navigate(['/admin/subjects']);
  }

  private loadAssignedStudents(subjectId: number) {
    this.backendService.get<any[]>(`subject/${subjectId}/students`).subscribe({
      next: (students) => {
        this.assignedStudents = (students ?? []).map(s => ({
          id: s.id,
          displayName: s.userFullName,
          email: s.userEmail,
          phone: s.userPhone,
          studentId: s.studentNumber ?? null,
        }));
      },
      error: () => {
        this.studentsError = 'Failed to load assigned students.';
      },
    });
  }

  private saveAssignedStudents() {
    if (!this.subject?.id) return;
    const studentIds = this.assignedStudents.map(s => s.id);
    this.backendService.put(`subject/${this.subject.id}/students`, studentIds).subscribe({
      error: () => {
        this.studentsError = 'Failed to save student assignments.';
      },
    });
  }

  private loadStudents(schoolId: number | null) {
    if (!schoolId) return;

    this.backendService.get<any[]>('student', { schoolId }).subscribe({
      next: (students) => {
        this.availableStudents = (students ?? []).map(s => ({
          id: s.id,
          displayName: s.userFullName || s.userEmail || 'Unknown',
          email: s.userEmail ?? null,
          phone: s.userPhone ?? null,
          studentId: s.studentNumber ?? null,
        }));
        this.selectableStudents = [
          { id: SELECT_ALL_ID, displayName: 'Select All', email: null, phone: null, studentId: null },
          ...this.availableStudents,
        ];
      },
      error: () => {
        this.studentsError = 'Failed to load students.';
      },
    });
  }
}
