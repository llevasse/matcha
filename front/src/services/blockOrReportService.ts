import { Injectable } from "@angular/core";
import { User } from "../app/core/class/user";

@Injectable({ providedIn: 'root' })
export class BlockOrReportService {

  private blockUrl = `http://${import.meta.env.NG_APP_BACKEND_HOST}:3000/api/block`;
  private reportUrl = `http://${import.meta.env.NG_APP_BACKEND_HOST}:3000/api/report`;

  private getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('token') || '';

    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  blockUser(userToBlock: number): Promise<Response> {
    return fetch(this.blockUrl, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ to_user_id: userToBlock })
    });
  }

  getBlockedUsers(){
    return fetch(this.blockUrl, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    }).then((response)=>{
      return this.userListFromResponse(response);
    });
  }

  private async userListFromResponse(response: Response){
    let users: User[] = [];
    return await response.json().then((obj)=>{
      Object.entries(obj).forEach(async (miniObj)=>{
        users.push(new User(miniObj[1] as any));
        return users;
      });
      return users;
    })
  }

  reportUser(userToReport: number): Promise<Response> {
    return fetch(this.reportUrl, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ to_user_id: userToReport })
    });
  }
}
