import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { User } from "../app/core/class/user";
import { InterestService } from "./interestService";
import { Router } from "@angular/router";
import { ProfileImage } from "../app/core/class/profile-image";
import { Interest } from "../app/core/class/interest";

@Injectable({ providedIn: 'root' })
export class MatchesService {
  baseUrl = `http://${import.meta.env.NG_APP_BACKEND_HOST}:3000`;
  private pictureUrl = `${this.baseUrl}/api/profiles`;
  private interationUrl = `${this.baseUrl}/api/interactions`;

  constructor(private http: HttpClient, private interestService: InterestService, private router: Router) {}

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
    var users: User[] = [];
    await response.json().then((obj)=>{
      Object.entries(obj).forEach(async (miniObj)=>{
        var obj = new Map(Object.entries(miniObj[1] as Map<string, any>));
        var user = new User(miniObj[1] as any);
        // var user = new User(obj.get('id'), obj.get('lastname'), obj.get('firstname'), obj.get('username'),
        //   obj.get('birthdate'), obj.get('city'), obj.get('location_latitude'), obj.get('location_longitude'), obj.get('gender'), 'woman', obj.get('bio'), [], [], obj.get('fame'))
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
