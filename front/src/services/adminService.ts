import { Injectable } from "@angular/core";

@Injectable({ providedIn: 'root' })
export class AdminService {
  private adminUrl = `http://${import.meta.env.NG_APP_BACKEND_HOST}:3000/api/admin`;

  createRandomUsers(numberOfUser: number, password: string){
    return fetch(`${this.adminUrl}/create-users`, {
      method: "POST",
      headers: {
        "Authorization":"Bearer " + localStorage.getItem('token'),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({number_of_users: numberOfUser, password: password}),
    });
  }
}
