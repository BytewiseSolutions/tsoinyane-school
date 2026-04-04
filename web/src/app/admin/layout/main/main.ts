import { Component, OnDestroy, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Subject, forkJoin, of, takeUntil } from 'rxjs';
import { SchoolContextService } from '../school-context';
import { BackendService } from '../../../util/backend.service';
import { DashboardRecentStudent, DashboardStats } from './dashboard-stats';
import { SchoolEvent } from '../../events/school-event';
import { getStoredUser, hasRole } from '../../../auth/auth-session';
import { Teacher } from '../../teachers/teacher';
import { SchoolSubject } from '../../subjects/subject';
import { TimetableEntry } from '../../subjects/timetable-entry';
import { Lesson } from '../../subjects/lesson';
import { NotificationItem } from '../header/notification-item';
import { Assessment } from '../../teacher/assessment';

interface DashboardStatCard {
  icon: string;
  label: string;
  value: number;
  route?: string;
}

interface DashboardAttentionItem {
  label: string;
  count: number;
  description: string;
  route: string;
}

@Component({
  selector: 'app-main',
  standalone: false,
  templateUrl: './main.html',
  styleUrl: './main.scss',
})
export class AdminMain implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  selectedSchoolName = 'All Schools';
  currentUserId: number | null = null;
  isTeacherDashboard = false;
  statCards: DashboardStatCard[] = [];
  recentStudents: DashboardRecentStudent[] = [];
  teacherSubjects: SchoolSubject[] = [];
  upcomingLessons: Lesson[] = [];
  upcomingAssessments: Assessment[] = [];
  needsAttention: DashboardAttentionItem[] = [];
  upcomingEvents: SchoolEvent[] = [];
  isLoading = false;
  errorMessage = '';

  constructor(
    private schoolContext: SchoolContextService,
    private backendService: BackendService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadCurrentUser();

    this.schoolContext.selectedSchool$
      .pipe(takeUntil(this.destroy$))
      .subscribe(school => {
        this.selectedSchoolName = school?.name ?? 'All Schools';
        this.loadDashboardStats(school?.id ?? null);
        if (this.isTeacherDashboard) {
          this.upcomingEvents = [];
        } else {
          this.loadUpcomingEvents(school?.id ?? null);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadDashboardStats(schoolId: number | null): void {
    this.isLoading = true;
    this.errorMessage = '';

    if (this.isTeacherDashboard) {
      this.loadTeacherDashboardStats(schoolId);
      return;
    }

    this.backendService.get<DashboardStats>('dashboard', schoolId ? { schoolId } : undefined).subscribe({
      next: (response) => {
        this.statCards = [
          { icon: 'fa-user-graduate', label: 'Total Students', value: response.totalStudents ?? 0 },
          { icon: 'fa-chalkboard-teacher', label: 'Total Teachers', value: response.totalTeachers ?? 0 },
          { icon: 'fa-book-open', label: 'Total Grades', value: response.totalGrades ?? 0 },
          { icon: 'fa-flask', label: 'Total Subjects', value: response.totalSubjects ?? 0 },
        ];
        this.recentStudents = response.recentStudents ?? [];
        this.teacherSubjects = [];
        this.upcomingLessons = [];
        this.upcomingAssessments = [];
        this.needsAttention = [];
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = error.error?.message || 'Failed to load dashboard statistics.';
        this.statCards = [];
        this.recentStudents = [];
        this.teacherSubjects = [];
        this.upcomingLessons = [];
        this.upcomingAssessments = [];
        this.needsAttention = [];
      },
      complete: () => {
        this.isLoading = false;
      },
    });
  }

  getLessonDate(lesson: Lesson): string | null {
    return lesson.startTime ?? lesson.date ?? null;
  }

  getLessonBadge(lesson: Lesson): string {
    if (lesson.status) {
      return String(lesson.status).replace(/_/g, ' ');
    }
    return lesson.submitted ? 'SUBMITTED' : 'SCHEDULED';
  }

  getLessonBadgeClass(lesson: Lesson): string {
    if (lesson.status === 'CANCELLED') {
      return 'inactive';
    }
    return lesson.submitted ? 'active' : 'pending';
  }

  getLessonTrackKey(lesson: Lesson): string | number {
    return lesson.id ?? `${lesson.subjectName ?? 'lesson'}-${this.getLessonDate(lesson) ?? 'unscheduled'}`;
  }

  getAssessmentTrackKey(assessment: Assessment): string | number {
    return assessment.id ?? `${assessment.title ?? 'assessment'}-${assessment.assessmentDate ?? 'unscheduled'}`;
  }

  getAssessmentDate(value: string | null | undefined): string | null {
    return value ?? null;
  }

  openCard(card: DashboardStatCard): void {
    if (!card.route || !this.isTeacherDashboard) {
      return;
    }

    this.router.navigate([card.route]);
  }

  openPanel(route: string): void {
    this.router.navigate([route]);
  }

  openAssessment(assessment: Assessment): void {
    if (!assessment.id) {
      return;
    }

    this.router.navigate(['/admin/my-assessments', assessment.id]);
  }

  openAttentionItem(item: DashboardAttentionItem): void {
    this.router.navigate([item.route]);
  }

  private loadUpcomingEvents(schoolId: number | null): void {
    this.backendService.get<SchoolEvent[]>('event', {
      ...(schoolId ? { schoolId } : {}),
      upcoming: true,
    }).subscribe({
      next: (events) => {
        this.upcomingEvents = events ?? [];
      },
      error: () => {
        this.upcomingEvents = [];
      },
    });
  }

  private loadTeacherDashboardStats(schoolId: number | null): void {
    if (!schoolId || !this.currentUserId) {
      this.statCards = [];
      this.teacherSubjects = [];
      this.upcomingLessons = [];
      this.upcomingAssessments = [];
      this.needsAttention = [];
      this.recentStudents = [];
      this.isLoading = false;
      return;
    }

    forkJoin({
      teachers: this.backendService.get<Teacher[]>('teacher', { schoolId }),
      assignments: this.backendService.get<any[]>('subject-assignment', { schoolId }),
    }).subscribe({
      next: ({ teachers, assignments }) => {
        const teacher = (teachers ?? []).find(item => item.userId === this.currentUserId);
        if (!teacher?.id) {
          this.statCards = [];
          this.teacherSubjects = [];
          this.upcomingLessons = [];
          this.upcomingAssessments = [];
          this.needsAttention = [];
          this.recentStudents = [];
          this.errorMessage = 'No teacher profile was found for the selected school.';
          this.isLoading = false;
          return;
        }

        const teacherSubjects = (assignments ?? [])
          .map(assignment => ({
            id: Number(assignment.subjectId ?? 0),
            subjectId: Number(assignment.subjectId ?? 0),
            assignmentId: Number(assignment.id ?? 0),
            code: assignment.subjectCode ?? '',
            name: assignment.subjectName ?? '',
            schoolId: assignment.schoolId ?? schoolId,
            schoolName: this.selectedSchoolName,
            gradeId: assignment.gradeId ?? null,
            gradeName: assignment.gradeName ?? null,
            teacherId: assignment.teacherId ?? null,
            teacherName: assignment.teacherName ?? null,
            studentCount: assignment.studentCount ?? 0,
            assignmentCount: null,
            status: assignment.status ?? null,
          }))
          .filter(subject => subject.teacherId === teacher.id);
        const gradeCount = new Set(
          teacherSubjects
            .map(subject => subject.gradeId)
            .filter((gradeId): gradeId is number => gradeId != null)
        ).size || (teacher.gradeIds?.length ?? 0);

        this.teacherSubjects = teacherSubjects;
        this.recentStudents = [];

        const subjectRequests = teacherSubjects
          .filter(subject => subject.id != null)
          .map(subject => this.backendService.get<TimetableEntry[]>('timetable', { subjectId: subject.subjectId ?? subject.id! }));

        const timetables$ = subjectRequests.length ? forkJoin(subjectRequests) : of([] as TimetableEntry[][]);
        const assessments$ = this.backendService.get<Assessment[]>('assessment', { schoolId, teacherId: teacher.id });
        const notifications$ = this.backendService.get<NotificationItem[]>('notification', { schoolId });

        timetables$.subscribe({
          next: (timetableGroups) => {
            const timetables = timetableGroups.flat();
            const lessonRequests = timetables
              .filter(timetable => timetable.id != null)
              .map(timetable => this.backendService.get<Lesson[]>('lesson', { timetableId: timetable.id! }));

            const lessons$ = lessonRequests.length ? forkJoin(lessonRequests) : of([] as Lesson[][]);

            forkJoin({
              lessonGroups: lessons$,
              assessments: assessments$,
              notifications: notifications$,
            }).subscribe({
              next: ({ lessonGroups, assessments, notifications }) => {
                const allLessons = lessonGroups.flat();
                const upcomingLessons = allLessons
                  .filter(lesson => {
                    const lessonDate = this.getLessonDate(lesson);
                    return !!lessonDate && new Date(lessonDate).getTime() >= Date.now();
                  })
                  .sort((left, right) => {
                    const leftTime = new Date(this.getLessonDate(left) ?? 0).getTime();
                    const rightTime = new Date(this.getLessonDate(right) ?? 0).getTime();
                    return leftTime - rightTime;
                  })
                  .slice(0, 3);
                const upcomingAssessments = (assessments ?? [])
                  .filter(assessment =>
                    !!assessment.assessmentDate
                    && new Date(assessment.assessmentDate).getTime() >= Date.now()
                  )
                  .sort((left, right) =>
                    new Date(left.assessmentDate ?? 0).getTime() - new Date(right.assessmentDate ?? 0).getTime()
                  )
                  .slice(0, 3);
                const pendingLessonsCount = allLessons.filter(lesson => !lesson.status || lesson.status === 'PENDING').length;
                const unmarkedAssessmentsCount = (assessments ?? []).filter(assessment =>
                  Number(assessment.markedCount ?? 0) < Number(assessment.studentCount ?? 0)
                ).length;
                const unreadNotificationsCount = (notifications ?? []).filter(notification => !notification.read).length;

                this.statCards = [
                  { icon: 'fa-book-open', label: 'My Subjects', value: teacherSubjects.length, route: '/admin/my-subjects' },
                  { icon: 'fa-layer-group', label: 'My Grades', value: gradeCount },
                  { icon: 'fa-calendar-week', label: 'Timetable Slots', value: timetables.length, route: '/admin/my-timetable' },
                  { icon: 'fa-chalkboard', label: 'Lessons Scheduled', value: allLessons.length, route: '/admin/my-lessons' },
                  { icon: 'fa-clipboard-check', label: 'Assessments', value: (assessments ?? []).length, route: '/admin/my-assessments' },
                ];
                this.upcomingLessons = upcomingLessons;
                this.upcomingAssessments = upcomingAssessments;
                this.needsAttention = [
                  {
                    label: 'Pending Lessons',
                    count: pendingLessonsCount,
                    description: 'Lessons still waiting to be submitted.',
                    route: '/admin/my-lessons',
                  },
                  {
                    label: 'Unmarked Assessments',
                    count: unmarkedAssessmentsCount,
                    description: 'Assessments with learners still missing scores.',
                    route: '/admin/my-assessments',
                  },
                  {
                    label: 'Unread Notifications',
                    count: unreadNotificationsCount,
                    description: 'Announcements you have not read yet.',
                    route: '/admin/notifications',
                  },
                ];
              },
              error: () => {
                this.errorMessage = 'Failed to load your lesson dashboard.';
                this.statCards = [];
                this.upcomingLessons = [];
                this.upcomingAssessments = [];
                this.needsAttention = [];
              },
              complete: () => {
                this.isLoading = false;
              },
            });
          },
          error: () => {
            this.errorMessage = 'Failed to load your timetable dashboard.';
            this.statCards = [];
            this.upcomingLessons = [];
            this.upcomingAssessments = [];
            this.needsAttention = [];
            this.isLoading = false;
          },
        });
      },
      error: () => {
        this.errorMessage = 'Failed to load your teacher dashboard.';
        this.statCards = [];
        this.teacherSubjects = [];
        this.upcomingLessons = [];
        this.upcomingAssessments = [];
        this.needsAttention = [];
        this.recentStudents = [];
        this.isLoading = false;
      },
    });
  }

  private loadCurrentUser(): void {
    const user = getStoredUser();
    this.currentUserId = user?.id ?? null;
    this.isTeacherDashboard = hasRole('TEACHER') && !hasRole('SYSTEM_ADMIN') && !hasRole('SCHOOL_ADMIN');
  }
}
