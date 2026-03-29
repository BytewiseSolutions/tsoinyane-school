import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SidebarStateService {
  private mobileOpen = new BehaviorSubject<boolean>(false);
  mobileOpen$ = this.mobileOpen.asObservable();

  private collapsed = new BehaviorSubject<boolean>(this.getInitialCollapsedState());
  collapsed$ = this.collapsed.asObservable();

  get collapsedValue(): boolean {
    return this.collapsed.value;
  }

  toggle() {
    this.mobileOpen.next(!this.mobileOpen.value);
  }

  close() {
    this.mobileOpen.next(false);
  }

  setCollapsed(value: boolean) {
    if (this.collapsed.value !== value) {
      this.collapsed.next(value);
    }
  }

  toggleCollapsed() {
    this.collapsed.next(!this.collapsed.value);
  }

  private getInitialCollapsedState(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }
    return window.innerWidth <= 768;
  }
}
