import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { UserService } from "./userService";

@Injectable({ providedIn: 'root' })
export class AuthService {
  private authUrl = `http://${import.meta.env.NG_APP_BACKEND_HOST}:3000/api/auth`;
  constructor(private http: HttpClient, private userService: UserService) {

  }
  login(credentials: { username: string; password: string }): Promise<any> {
    this.logout();
    return fetch(`${this.authUrl}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(credentials),
    }).then(async (value) => {
      if (value.ok) {
        await value.clone().json().then((value) => {
          localStorage.setItem('token', value['token'])
        })
      }
      return value;
    })
  }

  register(credentials: {
    username: string;
    firstname: string;
    lastname: string;
    email: string;
    password: string;
  }): Promise<any> {
    this.logout();
    return fetch(`${this.authUrl}/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(credentials),
    }).then(async (value) => {
      return value;
    })
  }

  logout(): void {
    this.userService.deleteClient();
    localStorage.removeItem('token');
    document.dispatchEvent(new Event('logout'));
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }
  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  verify() {
    return fetch(`${this.authUrl}/verify`, {
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + localStorage.getItem('token'),
      },
    })
  }

  passwordForgotten(email: string) {
    return fetch(`${this.authUrl}/reset-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });
  }

  resetPassword(passwordInput: string, token: string | null) {
    return this.http.post(`${this.authUrl}/reset-password/confirm`, { password: passwordInput, token: token });
  }

}
