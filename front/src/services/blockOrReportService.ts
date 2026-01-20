import { Injectable } from "@angular/core";

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

reportUser(userToReport: number): Promise<Response> {
  return fetch(this.reportUrl, {
    method: 'POST',
    headers: this.getAuthHeaders(),
    body: JSON.stringify({ to_user_id: userToReport })
  });
}
}
