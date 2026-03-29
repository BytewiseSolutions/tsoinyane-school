import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-forgot-password',
  standalone: false,
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.scss',
})
export class ForgotPassword {
  email = '';

  constructor(private router: Router) {}

  onSubmit() {
    alert('If this email exists, a reset link has been sent.');
    this.router.navigate(['/login']);
  }
}
