import { Component, OnInit, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { Router, NavigationStart, NavigationEnd, NavigationCancel, NavigationError } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  standalone: false,
  styleUrl: './app.scss'
})
export class App implements OnInit, AfterViewInit {
  loading = false;
  isAdminRoute = false;

  constructor(private router: Router, private cdr: ChangeDetectorRef) {}

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

  ngAfterViewInit() {
    this.isAdminRoute = this.router.url.startsWith('/admin');
    this.cdr.detectChanges();
  }
}
