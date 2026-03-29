import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface SchoolContext {
  id: number;
  name: string;
}

@Injectable({
  providedIn: 'root',
})
export class SchoolContextService {
  private readonly schoolSubject = new BehaviorSubject<SchoolContext | null>(this.readFromStorage());
  readonly selectedSchool$ = this.schoolSubject.asObservable();

  get selectedSchool(): SchoolContext | null {
    return this.schoolSubject.value;
  }

  setSelectedSchool(school: SchoolContext | null): void {
    const storage = this.getActiveStorage();
    if (!storage || !school) {
      storage?.removeItem('selectedSchoolId');
      storage?.removeItem('selectedSchoolName');
      this.schoolSubject.next(null);
      return;
    }

    storage.setItem('selectedSchoolId', String(school.id));
    storage.setItem('selectedSchoolName', school.name);
    this.schoolSubject.next(school);
  }

  private readFromStorage(): SchoolContext | null {
    const storage = this.getActiveStorage();
    if (!storage) {
      return null;
    }

    const idRaw = storage.getItem('selectedSchoolId');
    const name = storage.getItem('selectedSchoolName');
    const id = Number(idRaw);

    if (!idRaw || Number.isNaN(id) || !name) {
      return null;
    }

    return { id, name };
  }

  private getActiveStorage(): Storage | null {
    if (localStorage.getItem('user')) {
      return localStorage;
    }
    if (sessionStorage.getItem('user')) {
      return sessionStorage;
    }
    return null;
  }
}
