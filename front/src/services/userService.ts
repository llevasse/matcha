import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { User } from "../app/core/class/user";
import { InterestService } from "./interestService";
import { Router } from "@angular/router";
import { ProfileImage } from "../app/core/class/profile-image";
import { Interest } from "../app/core/class/interest";
import { webSocket } from "rxjs/webSocket";

@Injectable({ providedIn: 'root' })
export class UserService {
  baseUrl = `http://${import.meta.env.NG_APP_BACKEND_HOST}:3000`;
  private profileUrl = `${this.baseUrl}/api/users`;
  private pictureUrl = `${this.baseUrl}/api/profiles`;
  private interationUrl = `${this.baseUrl}/api/interactions`;

  private clientUser: User | null = null;

  constructor(private http: HttpClient, private interestService: InterestService, private router: Router) {}

  createClientUser(): Promise<User | null>{
    return this.profile().then(async (tmp)=>{
      var response = tmp as Response;
      if (!response.ok){
        this.router.navigate(['/login']);
      }
      else{
        this.clientUser = await this.userFromResponse(response);
        this.clientUser.ws = webSocket(`ws://${import.meta.env.NG_APP_BACKEND_HOST}:3000`);

        var id = this.clientUser.id;

        this.clientUser.ws.subscribe();
        this.clientUser.ws.next({message: `init : ${id}`})

        return this.clientUser;
      }
      return null;
    }).catch((value)=>{
      console.error(value.message)
      this.router.navigate(['/error-503'])
      return null;
    })
  }

  deleteClient(){
    this.clientUser = null;
  }

  async getClientUser(){
    if (this.clientUser == null){
      await this.createClientUser()
    }
    return this.clientUser;
  }

  profile(): Promise<any> {
    return fetch(`${this.profileUrl}/profile`, {
      headers : {
        "Authorization":"Bearer " + localStorage.getItem('token'),
      }
    })
  }

  getProfileById(id: number): Promise<User | null>{
    return fetch(`${this.profileUrl}/profile/${id}`, {
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

  searchProfile(){
    var users: User[] = [];
    return fetch(`${this.profileUrl}/search`, {
      headers : {
        "Authorization":"Bearer " + localStorage.getItem('token'),
      }
    }).then(async (value)=>{
      users = await this.userListFromResponse(value);
      return users;
    })
  }

  private async userFromResponse(response: Response): Promise<User>{
    var user: User;
    await response.json().then((obj)=>{
      user = new User(obj['id'], obj['lastname'], obj['firstname'], obj['username'],
        obj['birthdate'], obj['city'], NaN, NaN, 'woman', 'woman', obj['bio'])
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
        var user = new User(obj.get('id'), obj.get('lastname'), obj.get('firstname'), obj.get('username'),
          obj.get('birthdate'), obj.get('city'), NaN, NaN, 'woman', 'woman', obj.get('bio'))
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

  updateProfile(values:
    {username: string, firstname: string, lastname: string, gender: string, bio: string, birthdate: string, city: string, preferences: string[]}): Promise<any> {
    return fetch(`${this.profileUrl}/profile`, {
      method: 'POST',
      headers : {
        "Authorization":"Bearer " + localStorage.getItem('token'),
        'content-type': 'application/json',
      },
      body: JSON.stringify(values)
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

  getUsersWhoLikedClient(){
    return fetch(`${this.interationUrl}/likes-received`, {
      headers : {
        "Authorization":"Bearer " + localStorage.getItem('token'),
      },
    }).then(async (value)=>{
      return this.userListFromResponse(value);
    });
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

  getPhotosUrl(): Promise<any> {
    return fetch(`${this.pictureUrl}`, {
      headers : {
        "Authorization":"Bearer " + localStorage.getItem('token'),
      }
    })
  }

  getPhotoData(url: string): Promise<any> {
    return fetch(`${this.baseUrl}${url}`, {
      headers : {
        "Authorization":"Bearer " + localStorage.getItem('token'),
      }
    })
  }

  uploadPhotos(photo: File): Promise<any> {
    const form = new FormData();
    form.append('photo', photo);
    return fetch(`${this.pictureUrl}/upload`, {
      method: 'POST',
      headers : {
        "Authorization":"Bearer " + localStorage.getItem('token'),
      },
      body: form,
    })
  }

  setPhotosAsMain(photoId: number): Promise<any> {
    return fetch(`${this.pictureUrl}/${photoId}/main`, {
      method: 'PUT',
      headers : {
        "Authorization":"Bearer " + localStorage.getItem('token'),
      },
    })
  }

  deletePhoto(photoId: number){
    return fetch(`${this.pictureUrl}/${photoId}`, {
      method: 'DELETE',
      headers : {
        "Authorization":"Bearer " + localStorage.getItem('token'),
      },
    })
  }
}
