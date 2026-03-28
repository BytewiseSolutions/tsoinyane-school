import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SidebarStateService {
  private mobileOpen = new BehaviorSubject<boolean>(false);
  mobileOpen$ = this.mobileOpen.asObservable();

  private collapsed = new BehaviorSubject<boolean>(false);
  collapsed$ = this.collapsed.asObservable();

  toggle() {
    this.mobileOpen.next(!this.mobileOpen.value);
  }

  close() {
    this.mobileOpen.next(false);
  }

  setCollapsed(value: boolean) {
    this.collapsed.next(value);
  }

  toggleCollapsed() {
    this.collapsed.next(!this.collapsed.value);
  }
}
