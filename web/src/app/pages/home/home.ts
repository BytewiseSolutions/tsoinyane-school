import { Component, OnInit } from '@angular/core';
import { SchoolService, School } from '../../shared/school';

@Component({
  selector: 'app-home',
  standalone: false,
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements OnInit {
  selectedSchool: School = 'combined';
  schoolName = 'Tsoinyane Government Combined School';

  primaryStats = [
    { icon: 'fa-user-graduate', value: '300+', label: 'Students Enrolled' },
    { icon: 'fa-chalkboard-teacher', value: '15+', label: 'Qualified Teachers' },
    { icon: 'fa-trophy', value: '10+', label: 'Years of Excellence' },
    { icon: 'fa-book-open', value: '6', label: 'Subjects Offered' },
  ];

  highStats = [
    { icon: 'fa-user-graduate', value: '200+', label: 'Students Enrolled' },
    { icon: 'fa-chalkboard-teacher', value: '15+', label: 'Qualified Teachers' },
    { icon: 'fa-trophy', value: '10+', label: 'Years of Excellence' },
    { icon: 'fa-book-open', value: '9', label: 'Subjects Offered' },
  ];

  combinedStats = [
    { icon: 'fa-user-graduate', value: '500+', label: 'Students Enrolled' },
    { icon: 'fa-chalkboard-teacher', value: '30+', label: 'Qualified Teachers' },
    { icon: 'fa-school', value: '2', label: 'Schools' },
    { icon: 'fa-trophy', value: '10+', label: 'Years of Excellence' },
  ];

  get stats() {
    if (this.selectedSchool === 'primary') return this.primaryStats;
    if (this.selectedSchool === 'high') return this.highStats;
    return this.combinedStats;
  }

  constructor(private schoolService: SchoolService) {}

  ngOnInit() {
    this.schoolService.selectedSchool$.subscribe(school => {
      this.selectedSchool = school;
      this.schoolName = this.schoolService.getSchoolName(school);
    });
  }
}
