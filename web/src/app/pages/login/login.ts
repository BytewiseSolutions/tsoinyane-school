import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: false,
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  rememberMe = false;

  constructor(private router: Router) {}

  onLogin() {
    this.router.navigate(['/admin/dashboard']);
  }

  onForgotPassword() {
    this.router.navigate(['/forgot-password']);
  }
}
