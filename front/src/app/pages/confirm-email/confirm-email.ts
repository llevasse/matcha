import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-confirm-email',
  imports: [],
  templateUrl: './confirm-email.html',
  styleUrl: './confirm-email.scss',
})
export class ConfirmEmail {
  baseUrl = `http://${import.meta.env.NG_APP_BACKEND_HOST}:3000`;
  private confimEmailUrl = `${this.baseUrl}/api/auth/confirm-email`;

  confirmSuccess = signal<boolean>(false);
  confirmFail = signal<boolean>(false);
  
  constructor() {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    if (token) {
      fetch( `${this.confimEmailUrl}?token=${token}`, {
        method: 'GET',
      })
        .then((response) => {
          if (response.ok) {
            this.confirmSuccess.set(true);
          }
          else {
            this.confirmFail.set(true);
          }
        })
        .catch((error) => {
          console.error('Error confirming email:', error);
        });
    } else {
      console.error('No token provided in URL');
    }
  }

  redirectLoginPage() {
    window.location.href = '/login';
  }
}
