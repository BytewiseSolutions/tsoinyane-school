import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';

export interface PublicSchool {
  id: number;
  name: string;
  email: string;
  phone: string;
  location: string;
}

@Injectable({ providedIn: 'root' })
export class SchoolService {
  private readonly apiUrl = environment.apiUrl.replace(/\/+$/, '');

  private schoolsSubject = new BehaviorSubject<PublicSchool[]>([]);
  schools$ = this.schoolsSubject.asObservable();

  private selectedSchoolSubject = new BehaviorSubject<PublicSchool | null>(null);
  selectedSchool$ = this.selectedSchoolSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadSchools();
  }

  get schools(): PublicSchool[] {
    return this.schoolsSubject.value;
  }

  get selectedSchool(): PublicSchool | null {
    return this.selectedSchoolSubject.value;
  }

  setSchool(school: PublicSchool | null): void {
    this.selectedSchoolSubject.next(school);
  }

  private loadSchools(): void {
    this.http.get<PublicSchool[]>(`${this.apiUrl}/school`).subscribe({
      next: (schools) => {
        this.schoolsSubject.next(schools ?? []);
        if (schools?.length && !this.selectedSchoolSubject.value) {
          this.selectedSchoolSubject.next(schools[0]);
        }
      },
    });
  }
}
