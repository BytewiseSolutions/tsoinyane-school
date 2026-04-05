import { Component, OnDestroy, OnInit } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Subject, takeUntil } from 'rxjs';
import { PublicSchool, SchoolService } from '../../shared/school';

@Component({
  selector: 'app-contact',
  standalone: false,
  templateUrl: './contact.html',
  styleUrl: './contact.scss',
})
export class Contact implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  selectedSchool: PublicSchool | null = null;

  constructor(
    private schoolService: SchoolService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit() {
    this.schoolService.selectedSchool$
      .pipe(takeUntil(this.destroy$))
      .subscribe(school => {
        this.selectedSchool = school;
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get schoolName(): string {
    return this.selectedSchool?.name ?? 'Tsoinyane Government Combined School';
  }

  get phone(): string {
    return this.selectedSchool?.phone ?? '+266 59181664';
  }

  get phoneLink(): string {
    const normalizedPhone = this.phone.replace(/\s+/g, '');
    return `tel:${normalizedPhone}`;
  }

  get email(): string {
    return this.selectedSchool?.email ?? 'info@tsoinyane.co.ls';
  }

  get emailLink(): string {
    return `mailto:${this.email}`;
  }

  get location(): string {
    return this.selectedSchool?.location ?? 'Tsoinyane, Pitseng, Leribe';
  }

  get locationLink(): string {
    if (this.selectedSchool?.mapLatitude != null && this.selectedSchool?.mapLongitude != null) {
      return `https://www.google.com/maps/search/?api=1&query=${this.selectedSchool.mapLatitude},${this.selectedSchool.mapLongitude}`;
    }

    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(this.location)}`;
  }

  get mapEmbedUrl(): SafeResourceUrl {
    const baseUrl = 'https://www.google.com/maps?q=';

    if (this.selectedSchool?.mapLatitude != null && this.selectedSchool?.mapLongitude != null) {
      return this.sanitizer.bypassSecurityTrustResourceUrl(
        `${baseUrl}${this.selectedSchool.mapLatitude},${this.selectedSchool.mapLongitude}&z=15&output=embed`
      );
    }

    return this.sanitizer.bypassSecurityTrustResourceUrl(
      `${baseUrl}${encodeURIComponent(this.location)}&z=15&output=embed`
    );
  }
}
