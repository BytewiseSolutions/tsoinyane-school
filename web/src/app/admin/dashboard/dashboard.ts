import { Component, OnDestroy, OnInit } from '@angular/core';
import { SidebarStateService } from '../layout/sidebar-state';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: false,
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  sidebarCollapsed: boolean;
  mobileOpen = false;

  constructor(private sidebarState: SidebarStateService) {
    this.sidebarCollapsed = this.sidebarState.collapsedValue;
  }

  ngOnInit() {
    this.sidebarState.collapsed$
      .pipe(takeUntil(this.destroy$))
      .subscribe(collapsed => {
        this.sidebarCollapsed = collapsed;
      });

    this.sidebarState.mobileOpen$
      .pipe(takeUntil(this.destroy$))
      .subscribe(open => {
        this.mobileOpen = open;
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
