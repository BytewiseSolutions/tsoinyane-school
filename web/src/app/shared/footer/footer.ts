import { Component, OnInit } from '@angular/core';
import { SchoolService, PublicSchool } from '../school';

@Component({
  selector: 'app-footer',
  standalone: false,
  templateUrl: './footer.html',
  styleUrl: './footer.scss',
})
export class Footer implements OnInit {
  currentYear = new Date().getFullYear();
  schools: PublicSchool[] = [];
  selectedSchool: PublicSchool | null = null;

  constructor(private schoolService: SchoolService) {}

  ngOnInit(): void {
    this.schoolService.schools$.subscribe(schools => {
      this.schools = schools;
    });
    this.schoolService.selectedSchool$.subscribe(school => {
      this.selectedSchool = school;
    });
  }

  selectSchool(school: PublicSchool): void {
    this.schoolService.setSchool(school);
  }

  getPhoneLink(phone: string | null | undefined): string {
    return `tel:${(phone ?? '').replace(/\s+/g, '')}`;
  }

  getEmailLink(email: string | null | undefined): string {
    return `mailto:${email ?? ''}`;
  }

  getLocationLink(school: PublicSchool): string {
    if (school?.mapLatitude != null && school?.mapLongitude != null) {
      return `https://www.google.com/maps/search/?api=1&query=${school.mapLatitude},${school.mapLongitude}`;
    }

    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(school.location ?? '')}`;
  }
}
