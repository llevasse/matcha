import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";

@Injectable({ providedIn: 'root' })
export class AuthService {
  private authUrl = 'http://147.93.95.154:3000/api/auth';
  constructor(private http: HttpClient) {

  }
  login(credentials: { email: string; password: string }): Promise<any> {
    this.logout();
    return fetch(`${this.authUrl}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(credentials),
    }).then(async (value)=>{
      if (value.ok){
        await value.clone().json().then((value)=>{
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
    password: string; }): Promise<any> {
    this.logout();
    return fetch(`${this.authUrl}/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(credentials),
    }).then(async (value)=>{
      if (value.ok){
        await this.login({email: credentials.email, password: credentials.password})
      }
      return value;
    })
  }

  logout(): void {
    localStorage.removeItem('token');
  }
  getToken(): string | null {
    return localStorage.getItem('token');
  }
  isAuthenticated(): boolean {
    return !!this.getToken();
  }
}
