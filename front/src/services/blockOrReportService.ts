import { Injectable } from "@angular/core";
import { User } from "../app/core/class/user";

@Injectable({ providedIn: 'root' })
export class BlockOrReportService {

  private blockUrl = `http://${import.meta.env.NG_APP_BACKEND_HOST}:3000/api/block`;
  private unblockUrl = `http://${import.meta.env.NG_APP_BACKEND_HOST}:3000/api/block/unblock`;
  private reportUrl = `http://${import.meta.env.NG_APP_BACKEND_HOST}:3000/api/report`;

  private getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('token') || '';

    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  async getBlockedUsers(): Promise<User[]> {
    const response = await fetch(this.blockUrl, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }

    return this.userListFromResponse(response);
  }

  private async userListFromResponse(response: Response): Promise<User[]> {
    const obj = await response.json();

    return Object.values(obj).map(
      (data: any) => new User(data)
    );
  }

  blockUser(userToBlock: number): Promise<Response> {
    return fetch(this.blockUrl, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ to_user_id: userToBlock })
    });
  }

  reportUser(userToReport: number): Promise<Response> {
    return fetch(this.reportUrl, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ to_user_id: userToReport })
    });
  }

  unblockUser(userToBlock: number): Promise<Response> {
    return fetch(this.unblockUrl, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ to_user_id: userToBlock })
    });
  }

}
