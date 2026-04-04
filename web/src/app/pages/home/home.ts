import { Component, OnDestroy, OnInit } from '@angular/core';
import { SchoolService, PublicSchool } from '../../shared/school';
import { BackendService } from '../../util/backend.service';
import { Subject, takeUntil } from 'rxjs';
import { Status } from '../../admin/users/status';

interface HomeStat {
  icon: string;
  value: string;
  label: string;
}

interface HomeFeature {
  icon: string;
  title: string;
  description: string;
}

interface HomeJourneyStep {
  title: string;
  description: string;
}

interface HomeSubject {
  id?: number;
  code: string;
  name: string;
  schoolId: number | null;
  schoolName?: string | null;
  assignmentCount?: number | null;
  status: Status | null;
}

@Component({
  selector: 'app-home',
  standalone: false,
  templateUrl: './home.html',
  styleUrls: ['./home.scss'],
})
export class Home implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  selectedSchool: PublicSchool | null = null;
  schoolName = 'Tsoinyane Government Combined School';
  isLoadingSubjects = false;
  subjectError = '';
  subjects: HomeSubject[] = [];

  readonly primaryStats: HomeStat[] = [
    { icon: 'fa-user-graduate', value: '300+', label: 'Young Learners' },
    { icon: 'fa-chalkboard-teacher', value: '15+', label: 'Dedicated Teachers' },
    { icon: 'fa-seedling', value: '6', label: 'Core Learning Areas' },
    { icon: 'fa-star', value: '10+', label: 'Years of Growth' },
  ];

  readonly highStats: HomeStat[] = [
    { icon: 'fa-user-graduate', value: '200+', label: 'Senior Students' },
    { icon: 'fa-chalkboard-teacher', value: '15+', label: 'Experienced Teachers' },
    { icon: 'fa-flask', value: '9', label: 'Subjects Offered' },
    { icon: 'fa-award', value: '10+', label: 'Years of Excellence' },
  ];

  readonly combinedStats: HomeStat[] = [
    { icon: 'fa-user-graduate', value: '500+', label: 'Students Across Campus' },
    { icon: 'fa-chalkboard-teacher', value: '30+', label: 'Teaching Staff' },
    { icon: 'fa-school', value: '2', label: 'Learning Divisions' },
    { icon: 'fa-trophy', value: '10+', label: 'Years Serving Leribe' },
  ];

  readonly features: HomeFeature[] = [
    {
      icon: 'fa-book-open-reader',
      title: 'Purposeful Learning',
      description: 'A focused curriculum that builds literacy, numeracy, confidence, and academic discipline from the first years of school to the final grades.',
    },
    {
      icon: 'fa-people-group',
      title: 'Community at the Center',
      description: 'Families, teachers, and learners grow together in a school culture shaped by accountability, respect, and strong local roots.',
    },
    {
      icon: 'fa-compass-drafting',
      title: 'Clear Academic Direction',
      description: 'Structured teaching, guided progress, and supportive leadership help learners move from everyday lessons to real long-term achievement.',
    },
  ];

  readonly journeySteps: HomeJourneyStep[] = [
    {
      title: 'Strong Foundations',
      description: 'Learners begin with core skills, routines, and confidence-building support in a caring classroom environment.',
    },
    {
      title: 'Consistent Growth',
      description: 'Students move through clear grade pathways with structured teaching, subject exposure, and steady academic expectations.',
    },
    {
      title: 'Ready for the Future',
      description: 'By the senior years, learners are prepared for examinations, further study, and responsible participation in their communities.',
    },
  ];

  constructor(
    private schoolService: SchoolService,
    private backendService: BackendService
  ) {}

  ngOnInit() {
    this.schoolService.selectedSchool$
      .pipe(takeUntil(this.destroy$))
      .subscribe(school => {
        this.selectedSchool = school;
        this.schoolName = school?.name ?? 'Tsoinyane Government Combined School';
        this.loadSubjects(school?.id ?? null);
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get isPrimarySchool(): boolean {
    return (this.selectedSchool?.name ?? '').toLowerCase().includes('primary');
  }

  get isHighSchool(): boolean {
    return (this.selectedSchool?.name ?? '').toLowerCase().includes('high');
  }

  get stats(): HomeStat[] {
    const liveSubjectCount = this.subjects.length;

    if (this.isPrimarySchool) {
      return this.primaryStats.map(stat =>
        stat.label === 'Core Learning Areas' && liveSubjectCount
          ? { ...stat, value: String(liveSubjectCount) }
          : stat
      );
    }

    if (this.isHighSchool) {
      return this.highStats.map(stat =>
        stat.label === 'Subjects Offered' && liveSubjectCount
          ? { ...stat, value: String(liveSubjectCount) }
          : stat
      );
    }

    return this.combinedStats;
  }

  get eyebrow(): string {
    if (this.isPrimarySchool) {
      return 'Primary School Education';
    }

    if (this.isHighSchool) {
      return 'High School Education';
    }

    return 'Combined School Experience';
  }

  get heroTitle(): string {
    if (this.isPrimarySchool) {
      return `A confident start for every learner at ${this.schoolName}`;
    }

    if (this.isHighSchool) {
      return `Focused secondary learning at ${this.schoolName}`;
    }

    return `Learn, grow, and lead at ${this.schoolName}`;
  }

  get heroDescription(): string {
    if (this.isPrimarySchool) {
      return 'We nurture curiosity, character, and foundational academic strength so young learners can grow into capable and confident students.';
    }

    if (this.isHighSchool) {
      return 'We prepare students for examinations, further study, and a disciplined future through strong teaching and purposeful academic structure.';
    }

    return 'From the early grades to the senior years, our campus supports one connected learning journey rooted in community, discipline, and opportunity.';
  }

  get spotlightTitle(): string {
    if (this.isPrimarySchool) {
      return 'A warm, structured environment where young learners build strong habits early.';
    }

    if (this.isHighSchool) {
      return 'An ambitious academic setting designed to help students perform with purpose.';
    }

    return 'One school community with a shared standard of excellence across both primary and high school learning.';
  }

  get featuredSubjects(): HomeSubject[] {
    return [...this.subjects]
      .sort((left, right) =>
        (left.name ?? '').localeCompare(right.name ?? '', undefined, { sensitivity: 'base' })
      )
      .slice(0, 6);
  }

  private loadSubjects(schoolId: number | null): void {
    this.isLoadingSubjects = true;
    this.subjectError = '';

    this.backendService.get<HomeSubject[]>('subject', schoolId ? { schoolId } : undefined).subscribe({
      next: subjects => {
        this.subjects = (subjects ?? []).filter(subject => subject.status !== Status.INACTIVE);
      },
      error: () => {
        this.subjects = [];
        this.subjectError = 'Subjects could not be loaded right now.';
      },
      complete: () => {
        this.isLoadingSubjects = false;
      },
    });
  }
}
