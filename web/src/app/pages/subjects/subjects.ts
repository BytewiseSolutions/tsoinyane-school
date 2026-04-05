import { Component, OnDestroy, OnInit } from '@angular/core';
import { SchoolService, PublicSchool } from '../../shared/school';
import { BackendService } from '../../util/backend.service';
import { Subject, takeUntil } from 'rxjs';
import { Status } from '../../admin/users/status';

interface PublicSubject {
  id?: number;
  code: string;
  name: string;
  assignmentCount?: number | null;
  status: Status | null;
}

@Component({
  selector: 'app-subjects',
  standalone: false,
  templateUrl: './subjects.html',
  styleUrl: './subjects.scss',
})
export class Subjects implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private subjectLoadVersion = 0;

  selectedSchool: PublicSchool | null = null;
  subjects: PublicSubject[] = [];
  isLoadingSubjects = false;
  subjectError = '';

  get schoolName(): string {
    return this.selectedSchool?.name ?? 'Tsoinyane Government Combined School';
  }

  constructor(
    private schoolService: SchoolService,
    private backendService: BackendService
  ) {}

  ngOnInit() {
    this.schoolService.selectedSchool$
      .pipe(takeUntil(this.destroy$))
      .subscribe(school => {
        this.selectedSchool = school;
        this.loadSubjects(school?.id ?? null);
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getSubjectIcon(subjectName: string | null | undefined): string {
    const value = (subjectName ?? '').toLowerCase();

    if (value.includes('math')) {
      return 'fa-calculator';
    }

    if (value.includes('english') || value.includes('sesotho') || value.includes('language')) {
      return 'fa-book';
    }

    if (value.includes('science') || value.includes('chemistry')) {
      return 'fa-flask';
    }

    if (value.includes('physics')) {
      return 'fa-atom';
    }

    if (value.includes('biology') || value.includes('agriculture')) {
      return 'fa-seedling';
    }

    if (value.includes('history')) {
      return 'fa-landmark';
    }

    if (value.includes('geography') || value.includes('social')) {
      return 'fa-earth-africa';
    }

    if (value.includes('computer') || value.includes('ict')) {
      return 'fa-computer';
    }

    if (value.includes('business') || value.includes('accounting')) {
      return 'fa-chart-column';
    }

    if (value.includes('music') || value.includes('art')) {
      return 'fa-palette';
    }

    return 'fa-graduation-cap';
  }

  private loadSubjects(schoolId: number | null): void {
    const loadVersion = ++this.subjectLoadVersion;
    this.isLoadingSubjects = true;
    this.subjectError = '';

    this.backendService.get<PublicSubject[]>('subject', schoolId ? { schoolId } : undefined).subscribe({
      next: subjects => {
        if (loadVersion !== this.subjectLoadVersion) {
          return;
        }

        this.subjects = [...(subjects ?? [])]
          .filter(subject => subject.status !== Status.INACTIVE)
          .sort((left, right) =>
            (left.name ?? '').localeCompare(right.name ?? '', undefined, { sensitivity: 'base' })
          );
      },
      error: () => {
        if (loadVersion !== this.subjectLoadVersion) {
          return;
        }

        this.subjects = [];
        this.subjectError = 'Subjects could not be loaded right now.';
      },
      complete: () => {
        if (loadVersion !== this.subjectLoadVersion) {
          return;
        }

        this.isLoadingSubjects = false;
      },
    });
  }
}
