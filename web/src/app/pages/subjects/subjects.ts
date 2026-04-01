import { Component, OnInit } from '@angular/core';
import { SchoolService, PublicSchool } from '../../shared/school';

@Component({
  selector: 'app-subjects',
  standalone: false,
  templateUrl: './subjects.html',
  styleUrl: './subjects.scss',
})
export class Subjects implements OnInit {
  selectedSchool: PublicSchool | null = null;

  get showPrimary(): boolean {
    const name = this.selectedSchool?.name?.toLowerCase() ?? '';
    return name.includes('primary') || name.includes('combined') || !this.selectedSchool;
  }

  get showHigh(): boolean {
    const name = this.selectedSchool?.name?.toLowerCase() ?? '';
    return name.includes('high') || name.includes('combined') || !this.selectedSchool;
  }

  constructor(private schoolService: SchoolService) {}

  ngOnInit() {
    this.schoolService.selectedSchool$.subscribe(school => {
      this.selectedSchool = school;
    });
  }
}
