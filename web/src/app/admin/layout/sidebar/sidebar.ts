import { Component, HostListener, Input, OnDestroy, OnInit } from '@angular/core';
import { SidebarStateService } from '../sidebar-state';
import { Subject, takeUntil } from 'rxjs';
import { AuthUser } from '../../../models/auth-user';

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
  currentUserName = 'TGCS Admin';
  currentUserRole = 'Administrator';
  currentUserEmail = 'admin@tsoinyane.co.ls';

  constructor(private sidebarState: SidebarStateService) {}

  ngOnInit() {
    this.applyResponsiveCollapse(true);
    this.loadCurrentUser();

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

  private loadCurrentUser() {
    const raw = localStorage.getItem('user') ?? sessionStorage.getItem('user');
    if (!raw) {
      return;
    }

    try {
      const user = JSON.parse(raw) as AuthUser;
      const lastName = (user.lastName ?? '').trim();
      const title = this.formatTitle(user.title);
      const name = `${title} ${lastName}`.trim();

      if (name) {
        this.currentUserName = name;
      }
      if (user.role) {
        this.currentUserRole = this.formatRole(user.role);
      }
      if (user.email) {
        this.currentUserEmail = user.email;
      }
    } catch {
  
    }
  }

  private formatRole(role: string): string {
    return role
      .toLowerCase()
      .split('_')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  private formatTitle(title?: string): string {
    return title?.trim() ?? '';
  }
}
