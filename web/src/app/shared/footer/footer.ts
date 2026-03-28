import { Component } from '@angular/core';
import { SchoolService, School } from '../school';

@Component({
  selector: 'app-footer',
  standalone: false,
  templateUrl: './footer.html',
  styleUrl: './footer.scss',
})
export class Footer {
  currentYear = new Date().getFullYear();

  constructor(private schoolService: SchoolService) {}

  selectSchool(school: School) {
    this.schoolService.setSchool(school);
  }
}
