import { Injectable } from "@angular/core";

@Injectable({ providedIn: 'root' })
export class AdminService {
  private adminUrl = `http://${import.meta.env.NG_APP_BACKEND_HOST}:3000/api/admin`;

  createRandomUsers(numberOfUser: number, password: string) {
    return fetch(`${this.adminUrl}/create-users`, {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + localStorage.getItem('token'),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ number_of_users: numberOfUser, password: password }),
    });
  }

  createMatch(username1: string, username2: string) {
    console.log("f2");

    return fetch(`${this.adminUrl}/create-match`, {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + localStorage.getItem('token'),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username1: username1, username2: username2 }),
    });
  }
}
