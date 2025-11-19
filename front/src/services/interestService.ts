import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";

@Injectable({ providedIn: 'root' })
export class InterestService {
  baseUrl = `http://localhost:3000`;
  private interestUrl = `${this.baseUrl}/api/tags`;
  constructor(private http: HttpClient) {}
  getAllInterest(): Promise<any> {
    return fetch(`${this.interestUrl}/`, {
      headers : {
        "Authorization":"Bearer " + localStorage.getItem('token'),
      }
    })
  }

  getUserInterest(id: number): Promise<any> {
    return fetch(`${this.interestUrl}/user/${id}`, {
      headers : {
        "Authorization":"Bearer " + localStorage.getItem('token'),
      }
    })
  }

  assignUserAnInterest(interestId: number ){
    return fetch(`${this.interestUrl}/user`, {
      method: "POST",
      headers : {
        "Content-Type": "application/json",
        "Authorization":"Bearer " + localStorage.getItem('token'),
      },
      body: JSON.stringify({tag_id : interestId}),
    })
  }

  unassignUserAnInterest(interestId: number ){
    return fetch(`${this.interestUrl}/user/${interestId}`, {
      method: "DELETE",
      headers : {
        "Authorization":"Bearer " + localStorage.getItem('token'),
      },
    })
  }

  createInterest(interestName: string): Promise<any> {
    return fetch(`${this.interestUrl}/`, {
      method: "POST",
      headers : {
        "Content-Type": "application/json",
        "Authorization":"Bearer " + localStorage.getItem('token'),
      },
      body: JSON.stringify({name : interestName}),
    })
  }
}
