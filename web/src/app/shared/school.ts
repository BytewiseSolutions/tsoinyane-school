import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type School = 'combined' | 'primary' | 'high';

@Injectable({ providedIn: 'root' })
export class SchoolService {
  private selectedSchool = new BehaviorSubject<School>('combined');
  selectedSchool$ = this.selectedSchool.asObservable();

  setSchool(school: School) {
    this.selectedSchool.next(school);
  }

  getSchoolName(school: School): string {
    switch (school) {
      case 'primary': return 'Tsoinyane Primary School';
      case 'high': return 'Tsoinyane High School';
      default: return 'Tsoinyane Government Combined School';
    }
  }
}
