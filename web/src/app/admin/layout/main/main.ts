import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { SchoolContextService } from '../school-context';

interface DashboardStudent {
  name: string;
  school: string;
  grade: string;
  status: 'Active' | 'Inactive';
}

@Component({
  selector: 'app-main',
  standalone: false,
  templateUrl: './main.html',
  styleUrl: './main.scss',
})
export class AdminMain implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  selectedSchoolName = 'Tsoinyane Primary School';
  totalStudents = 500;
  totalTeachers = 30;
  totalSubjects = 15;
  totalEvents = 4;
  recentStudents: DashboardStudent[] = [];

  private primaryStudents: DashboardStudent[] = [
    { name: 'Thabo Mokoena', school: 'Primary', grade: 'Grade 5', status: 'Active' },
    { name: 'Mpho Nkosi', school: 'Primary', grade: 'Grade 3', status: 'Active' },
    { name: 'Lerato Thabane', school: 'Primary', grade: 'Grade 6', status: 'Active' },
    { name: 'Paballo Nkoe', school: 'Primary', grade: 'Grade 4', status: 'Inactive' },
  ];

  private highStudents: DashboardStudent[] = [
    { name: 'Lineo Letsie', school: 'High School', grade: 'Form C', status: 'Active' },
    { name: 'Palesa Sithole', school: 'High School', grade: 'Form E', status: 'Inactive' },
    { name: 'Mosa Selebalo', school: 'High School', grade: 'Form B', status: 'Active' },
    { name: 'Neo Mphuthi', school: 'High School', grade: 'Form D', status: 'Active' },
  ];

  constructor(private schoolContext: SchoolContextService) {}

  ngOnInit(): void {
    this.schoolContext.selectedSchool$
      .pipe(takeUntil(this.destroy$))
      .subscribe(school => {
        this.selectedSchoolName = school?.name ?? 'Tsoinyane Primary School';
        this.applySchoolDashboard(this.selectedSchoolName);
      });

    this.applySchoolDashboard(this.selectedSchoolName);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private applySchoolDashboard(schoolName: string) {
    const normalized = schoolName.trim().toLowerCase();
    const isHigh = normalized.includes('high');

    if (isHigh) {
      this.totalStudents = 320;
      this.totalTeachers = 24;
      this.totalSubjects = 17;
      this.totalEvents = 5;
      this.recentStudents = this.highStudents;
      return;
    }

    this.totalStudents = 500;
    this.totalTeachers = 30;
    this.totalSubjects = 15;
    this.totalEvents = 4;
    this.recentStudents = this.primaryStudents;
  }
}
