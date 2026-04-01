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
}
