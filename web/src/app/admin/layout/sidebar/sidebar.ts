import { Component, HostListener, Input, OnDestroy, OnInit } from '@angular/core';
import { SidebarStateService } from '../sidebar-state';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-sidebar',
  standalone: false,
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar implements OnInit, OnDestroy {
  private readonly mobileBreakpoint = 768;
  private isMobileView = false;
  private destroy$ = new Subject<void>();

  @Input() collapsed = false;
  mobileOpen = false;

  constructor(private sidebarState: SidebarStateService) {}

  ngOnInit() {
    this.applyResponsiveCollapse(true);

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

  @HostListener('window:resize')
  onResize() {
    this.applyResponsiveCollapse();
  }

  toggleSidebar() {
    this.sidebarState.toggleCollapsed();
  }

  closeOnMobile() {
    this.sidebarState.close();
  }

  private applyResponsiveCollapse(force = false) {
    const isMobile = window.innerWidth <= this.mobileBreakpoint;

    if (force || isMobile !== this.isMobileView) {
      this.isMobileView = isMobile;
      this.sidebarState.setCollapsed(isMobile);
    }
  }
}
