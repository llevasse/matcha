import { Component, signal } from '@angular/core';
import { AuthService } from '../../../services/authService';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.scss',
})
export class ResetPassword {

  resetPasswordErrorMessage: string | null = null;
  sucessPopup = signal<boolean>(false);
  token: string | null = null;

  constructor(private authService: AuthService) {
    const urlParams = new URLSearchParams(window.location.search);
    this.token = urlParams.get('token');
    if (!this.token){
      alert("Invalid token");
    }
  }

  resetPassword(event: SubmitEvent) {
    event.preventDefault();
    const passwordInput = (document.getElementById('reset-password-input') as HTMLInputElement).value;
    const confirmPasswordInput = (document.getElementById('reset-password-confirm-input') as HTMLInputElement).value;
    this.resetPasswordErrorMessage = null;

    if (passwordInput !== confirmPasswordInput) {
      this.resetPasswordErrorMessage = "Passwords do not match.";
      return;
    }

    this.authService.resetPassword(passwordInput, this.token).subscribe({
      next: () => {
        this.sucessPopup.set(true);
      },
      error: () => {
        this.resetPasswordErrorMessage = "Error resetting password. Please try again.";
      }
    });
  }
  redirectLoginPage() {
    window.location.href = '/login';
  }
}
