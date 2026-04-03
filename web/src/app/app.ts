import { Component, OnInit } from '@angular/core';
import { Router, NavigationStart, NavigationEnd, NavigationCancel, NavigationError } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  standalone: false,
  styleUrl: './app.scss'
})
export class App implements OnInit {
  loading = false;
  isAdminRoute = false;

  constructor(private router: Router) {
    this.isAdminRoute = this.router.url.startsWith('/admin');
  }

  ngOnInit() {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationStart) {
        this.loading = true;
        this.isAdminRoute = event.url.startsWith('/admin');
      } else if (
        event instanceof NavigationEnd ||
        event instanceof NavigationCancel ||
        event instanceof NavigationError
      ) {
        if (event instanceof NavigationEnd) {
          this.isAdminRoute = event.urlAfterRedirects.startsWith('/admin');
        }
        this.loading = false;
      }
    });
  }
}
