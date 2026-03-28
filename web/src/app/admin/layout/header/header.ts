import { Component } from '@angular/core';
import { SidebarStateService } from '../sidebar-state';

@Component({
  selector: 'app-header',
  standalone: false,
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class AdminHeader {
  constructor(private sidebarState: SidebarStateService) {}

  toggleSidebar() {
    this.sidebarState.toggle();
  }
}
