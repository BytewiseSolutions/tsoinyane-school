import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { PublicSchool, SchoolService } from '../../shared/school';
import { environment } from '../../../environments/environment';

interface AboutCard {
  icon: string;
  title: string;
  description: string;
}

@Component({
  selector: 'app-about',
  standalone: false,
  templateUrl: './about.html',
  styleUrls: ['./about.scss'],
})
export class About implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly apiUrl = environment.apiUrl.replace(/\/+$/, '');

  selectedSchool: PublicSchool | null = null;

  constructor(private schoolService: SchoolService) {}

  ngOnInit(): void {
    this.schoolService.selectedSchool$
      .pipe(takeUntil(this.destroy$))
      .subscribe(school => {
        this.selectedSchool = school;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get schoolName(): string {
    return this.selectedSchool?.name ?? 'Tsoinyane Government Combined School';
  }

  get schoolLocation(): string {
    return this.selectedSchool?.location ?? 'Tsoinyane, Pitseng, Leribe';
  }

  get schoolPhone(): string {
    return this.selectedSchool?.phone ?? '+266 59181664';
  }

  get schoolEmail(): string {
    return this.selectedSchool?.email ?? 'info@tsoinyane.co.ls';
  }

  get schoolTypeLabel(): string {
    if (this.isPrimarySchool) {
      return 'Primary School';
    }

    if (this.isHighSchool) {
      return 'High School';
    }

    return 'Combined School';
  }

  get isPrimarySchool(): boolean {
    return (this.selectedSchool?.name ?? '').toLowerCase().includes('primary');
  }

  get isHighSchool(): boolean {
    return (this.selectedSchool?.name ?? '').toLowerCase().includes('high');
  }

  get introTitle(): string {
    if (this.selectedSchool?.aboutHeadline?.trim()) {
      return this.selectedSchool.aboutHeadline.trim();
    }

    if (this.isPrimarySchool) {
      return 'A strong beginning for young learners';
    }

    if (this.isHighSchool) {
      return 'Focused preparation for senior learners';
    }

    return 'One school community, one learning journey';
  }

  get introParagraphs(): string[] {
    if (this.selectedSchool?.aboutDescription?.trim() || this.selectedSchool?.aboutSupportingText?.trim()) {
      return [
        this.selectedSchool?.aboutDescription?.trim(),
        this.selectedSchool?.aboutSupportingText?.trim(),
      ].filter((value): value is string => Boolean(value));
    }

    if (this.isPrimarySchool) {
      return [
        `${this.schoolName} serves families in ${this.schoolLocation} with a nurturing environment where children grow in literacy, numeracy, confidence, and good learning habits.`,
        'Our primary years focus on strong foundations, caring classroom guidance, and a school culture that helps learners feel safe, supported, and ready to progress.',
      ];
    }

    if (this.isHighSchool) {
      return [
        `${this.schoolName} supports students in ${this.schoolLocation} through disciplined teaching, subject-focused learning, and steady preparation for examinations and further study.`,
        'We aim to help every learner develop academic maturity, responsibility, and the confidence to move into the next stage of life with purpose.',
      ];
    }

    return [
      `${this.schoolName} is a public institution in ${this.schoolLocation} serving the wider Tsoinyane community with both foundational and senior learning opportunities.`,
      'As a combined school, we offer one connected educational path where learners are supported from the early grades through to the senior years in a shared culture of effort and growth.',
    ];
  }

  get highlights(): AboutCard[] {
    return [
      {
        icon: 'fa-school',
        title: this.schoolTypeLabel,
        description: `Serving the ${this.schoolLocation} community with structured, school-based support.`,
      },
      {
        icon: 'fa-phone',
        title: 'School Contact',
        description: this.schoolPhone,
      },
      {
        icon: 'fa-envelope',
        title: 'Email Address',
        description: this.schoolEmail,
      },
    ];
  }

  get aboutImageUrl(): string {
    if (this.selectedSchool?.aboutImageFileId) {
      return `${this.apiUrl}/public/files/${this.selectedSchool.aboutImageFileId}`;
    }

    return this.selectedSchool?.aboutImageUrl?.trim() || '/image2.png';
  }

  get valueCards(): AboutCard[] {
    return [
      {
        icon: 'fa-bullseye',
        title: 'Our Mission',
        description: this.selectedSchool?.missionText?.trim()
          || 'To provide inclusive, high-quality education that equips every learner with knowledge, discipline, and confidence for the future.',
      },
      {
        icon: 'fa-eye',
        title: 'Our Vision',
        description: this.selectedSchool?.visionText?.trim()
          || 'To grow as a respected centre of academic progress, character formation, and community impact in Leribe and beyond.',
      },
      {
        icon: 'fa-heart',
        title: 'Our Values',
        description: this.selectedSchool?.valuesText?.trim()
          || 'We lead with integrity, respect, responsibility, community pride, and a strong commitment to lifelong learning.',
      },
    ];
  }
}
