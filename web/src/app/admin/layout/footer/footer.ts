import { Component } from '@angular/core';

@Component({
  selector: 'app-admin-footer',
  standalone: false,
  templateUrl: './footer.html',
  styleUrl: './footer.scss',
})
export class AdminFooter {
  currentYear = new Date().getFullYear();
}
