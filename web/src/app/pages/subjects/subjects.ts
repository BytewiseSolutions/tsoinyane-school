import { Component, OnInit } from '@angular/core';
import { SchoolService, School } from '../../shared/school';

@Component({
  selector: 'app-subjects',
  standalone: false,
  templateUrl: './subjects.html',
  styleUrl: './subjects.scss',
})
export class Subjects implements OnInit {
  selectedSchool: School = 'combined';

  get showPrimary() {
    return this.selectedSchool === 'primary' || this.selectedSchool === 'combined';
  }

  get showHigh() {
    return this.selectedSchool === 'high' || this.selectedSchool === 'combined';
  }

  constructor(private schoolService: SchoolService) {}

  ngOnInit() {
    this.schoolService.selectedSchool$.subscribe(school => {
      this.selectedSchool = school;
    });
  }
}
