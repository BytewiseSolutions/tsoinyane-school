import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { BackendService } from '../../../util/backend.service';
import { SchoolSubject } from '../subject';
import { Status } from '../../users/status';
import { User } from '../../users/user';
import { Role } from '../../users/role';

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
  selectedStudentIds: number[] = [];
  studentsError = '';

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
      this.selectedStudentIds = this.selectableStudents.map(s => s.id);
    }
  }

  onItemRemoved(item: StudentOption) {
    if (item.id === SELECT_ALL_ID) {
      this.selectedStudentIds = [];
    } else {
      this.selectedStudentIds = this.selectedStudentIds.filter(id => id !== SELECT_ALL_ID);
    }
  }

  assignStudents() {
    const toAdd = this.availableStudents.filter(
      s => this.selectedStudentIds.includes(s.id) && !this.assignedStudents.some(a => a.id === s.id)
    );
    this.assignedStudents = [...this.assignedStudents, ...toAdd];
    this.selectedStudentIds = [];
  }

  removeStudent(student: StudentOption) {
    this.assignedStudents = this.assignedStudents.filter(s => s.id !== student.id);
  }

  transferStudent(student: StudentOption) {
    // TODO: implement transfer logic
  }

  getStatusLabel(status: Status | null | undefined): string {
    return status === Status.INACTIVE ? 'Inactive' : 'Active';
  }

  goBack() {
    this.router.navigate(['/admin/subjects']);
  }

  private loadStudents(schoolId: number | null) {
    if (!schoolId) return;

    this.backendService.get<User[]>('user', { schoolId, role: Role.STUDENT }).subscribe({
      next: (users) => {
        this.availableStudents = (users ?? []).map(u => ({
          id: u.id,
          displayName: [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email || 'Unknown',
          email: u.email ?? null,
          phone: u.phone ?? null,
          studentId: u.studentId ?? null,
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
