import { Injectable } from "@angular/core";
import { User } from "../app/core/class/user";
import { InterestService } from "./interestService";

@Injectable({ providedIn: 'root' })
export class LikesService {
  baseUrl = `http://${import.meta.env.NG_APP_BACKEND_HOST}:3000`;
  private interationUrl = `${this.baseUrl}/api/interactions`;

  constructor(private interestService: InterestService) {}

  getProfileById(id: number): Promise<User | null>{
    return fetch(`${this.interationUrl}/likes-received/${id}`, {
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

  setUserAsLiked(userIdToLike:number){
    return fetch(`${this.interationUrl}/like`, {
    method: 'POST',
      headers : {
        "Authorization":"Bearer " + localStorage.getItem('token'),
        'content-type': 'application/json',
      },
      body: JSON.stringify({to_user_id:userIdToLike})
    });
  }

  setUserAsUnliked(userIdToUnlike:number){
    return fetch(`${this.interationUrl}/unlike`, {
    method: 'POST',
      headers : {
        "Authorization":"Bearer " + localStorage.getItem('token'),
        'content-type': 'application/json',
      },
      body: JSON.stringify({to_user_id:userIdToUnlike})
    });
  }

  getUsersWhoLikedClient(){
    return fetch(`${this.interationUrl}/likes-received`, {
      headers : {
        "Authorization":"Bearer " + localStorage.getItem('token'),
      },
    }).then(async (value)=>{
      return this.userListFromResponse(value);
    });
  }

  getUsersLikedByClient(){
    return fetch(`${this.interationUrl}/likes-given`, {
      headers : {
        "Authorization":"Bearer " + localStorage.getItem('token'),
      },
    }).then(async (value)=>{
      return this.userListFromResponse(value);
    });
  }
}
