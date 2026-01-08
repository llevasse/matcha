import { Injectable } from "@angular/core";
import { User } from "../app/core/class/user";

@Injectable({ providedIn: 'root' })
export class MatchesService {
  baseUrl = `http://${import.meta.env.NG_APP_BACKEND_HOST}:3000`;
  private interationUrl = `${this.baseUrl}/api/interactions`;

  constructor() {}

  getProfileById(id: number): Promise<User | null>{
    return fetch(`${this.interationUrl}/matches/${id}`, {
      headers : {
        "Authorization":"Bearer " + localStorage.getItem('token'),
      }
    }).then(async (value)=>{
      if (value.ok){
        return this.userFromResponse(value);
      }
      return null;
    })
  }

  private async userFromResponse(response: Response): Promise<User>{
    return await response.json().then((obj)=>{
      return new User(obj)
    })
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

  getUserMatches(){
    return fetch(`${this.interationUrl}/matches`, {
      headers : {
        "Authorization":"Bearer " + localStorage.getItem('token'),
      },
    }).then(async (value)=>{
      return this.userListFromResponse(value);
    });
  }
}
