import { Component, OnInit } from '@angular/core';
import { SchoolService, School } from '../school';

@Component({
  selector: 'app-navbar',
  standalone: false,
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class Navbar implements OnInit {
  menuOpen = false;
  dropdownOpen = false;
  schoolName = 'Tsoinyane Government Combined School';

  constructor(private schoolService: SchoolService) {}

  ngOnInit() {
    this.schoolService.selectedSchool$.subscribe(school => {
      this.schoolName = this.schoolService.getSchoolName(school);
    });
  }

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  closeMenu() {
    this.menuOpen = false;
  }

  toggleDropdown() {
    this.dropdownOpen = !this.dropdownOpen;
  }

  selectSchool(school: School) {
    this.schoolService.setSchool(school);
    this.dropdownOpen = false;
  }
}
