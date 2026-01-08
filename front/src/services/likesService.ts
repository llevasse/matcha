import { Injectable } from "@angular/core";
import { User } from "../app/core/class/user";
import { InterestService } from "./interestService";
import { ProfileImage } from "../app/core/class/profile-image";
import { Interest } from "../app/core/class/interest";

@Injectable({ providedIn: 'root' })
export class LikesService {
  baseUrl = `http://${import.meta.env.NG_APP_BACKEND_HOST}:3000`;
  private pictureUrl = `${this.baseUrl}/api/profiles`;
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
    var user: User;
    await response.json().then((obj)=>{
      user = new User(obj)
    })
    await fetch(`${this.pictureUrl}/${user!.id}`, {
      headers : {
        "Authorization":"Bearer " + localStorage.getItem('token'),
      }
    }).then(async (response)=>{
      return await response.json().then((data)=>{
        (data as []).forEach((value)=>{
          var image = new ProfileImage(`${this.baseUrl}${value['file_path']}`);
          image.isNew = false;
          image.id = value['id'];
          user!.photos.push(image)
        })
        user!.photos.length = 5;
        user!.photos.fill(new ProfileImage(), user!.photos.length);
      })
    })
    await this.interestService.getUserInterest(user!.id).then(async (tmp)=>{
      var response: Response = tmp;
      if (response.ok){
        await response.json().then((obj)=>{
          Array.from(obj).forEach((tag)=>{
            var map: Map<string, any> = new Map(Object.entries(tag as Map<string, any>));
            user!.interest.push(new Interest(map.get("name"), map.get("id")));
          })
        });
      }
    });
    return user!;
  }

  private async userListFromResponse(response: Response){
    var users: User[] = [];
    await response.json().then((obj)=>{
      Object.entries(obj).forEach(async (miniObj)=>{
        var obj = new Map(Object.entries(miniObj[1] as Map<string, any>));
        var user = new User(miniObj[1] as any);
        var image = new ProfileImage(`${this.baseUrl}${obj.get('profile_picture')}`);
        image.isNew = false;
        user.photos.push(image)


        users.push(user);
        return users;
      });
      return users;
    })

    for (var user of users){
      await this.interestService.getUserInterest(user!.id).then(async (tmp)=>{
        var response: Response = tmp;
        const obj = await response.json();
        Array.from(obj).forEach((tag) => {
          var map: Map<string, any> = new Map(Object.entries(tag as Map<string, any>));
          user!.interest.push(new Interest(map.get("name"), map.get("id")));
        });
        return user;
      });
    }
    return users;
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
}
