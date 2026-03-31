import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { BackendService } from '../../../util/backend.service';
import { SchoolSubject } from '../subject';
import { Status } from '../../users/status';

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
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = error.error?.message || 'Failed to load subject details.';
      },
      complete: () => {
        this.isLoading = false;
      },
    });
  }

  getStatusLabel(status: Status | null | undefined): string {
    return status === Status.INACTIVE ? 'Inactive' : 'Active';
  }

  goBack() {
    this.router.navigate(['/admin/subjects']);
  }
}
