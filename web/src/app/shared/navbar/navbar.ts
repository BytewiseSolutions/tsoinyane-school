import { Component, OnInit } from '@angular/core';
import { SchoolService, PublicSchool } from '../school';

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
  schools: PublicSchool[] = [];
  selectedSchool: PublicSchool | null = null;

  constructor(private schoolService: SchoolService) {}

  ngOnInit() {
    this.schoolService.loadPublicSchools();
    
    this.schoolService.schools$.subscribe(schools => {
      this.schools = schools;
    });

    this.schoolService.selectedSchool$.subscribe(school => {
      this.selectedSchool = school;
      this.schoolName = school?.name ?? 'Tsoinyane Government Combined School';
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

  selectSchool(school: PublicSchool) {
    this.schoolService.setSchool(school);
    this.dropdownOpen = false;
  }
}
