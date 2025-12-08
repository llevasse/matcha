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


  searchProfile(radius: number | null = 42, minAge: number | null = null, maxAge: number | null = null, minFame: number | null = null, maxFame: number | null = null, whiteListInterestId: number[] | null, blackListInterestId: number[] | null){
    var users: User[] = [];
    var params = "";

    if (radius){
      params = `&radius=${radius}`;
    }
    if (minAge){
      params += `&age_min=${minAge}`;
    }
    if (maxAge){
      params += `&age_max=${maxAge}`;
    }
    if (minFame){
      params += `&fame_min=${minFame}`;
    }
    if (maxFame){
      params += `&fame_max=${maxFame}`;
    }
    if (maxFame){
      params += `&fame_max=${maxFame}`;
    }
    if (whiteListInterestId){
      params += `&whitelist_interest=${whiteListInterestId}`;
    }
    if (blackListInterestId){
      params += `&blacklist_interest=${blackListInterestId}`;
    }


    return fetch(`${this.profileUrl}/search?${params}`, {
      headers : {
        "Authorization":"Bearer " + localStorage.getItem('token'),
      }
    }).then(async (value)=>{
      if (!value.ok){
        return [];
        // await value.json().then((obj)=>{
        //   throw obj['message'];
        // })
      }
      users = await this.userListFromResponse(value);
      return users;
    })
  }

  private async userFromResponse(response: Response): Promise<User>{
    var user: User;
    await response.json().then((obj)=>{
      user = new User(obj)
      // user = new User(obj['id'], obj['lastname'], obj['firstname'], obj['username'],
      //   obj['birthdate'], obj['city'], obj['location_latitude'], obj['location_longitude'], obj['gender'], 'woman', obj['bio'], [], [], obj['fame'])
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

  updateProfile(values:
    {username: string, firstname: string, lastname: string, email: string, gender: string|null, bio: string, birthdate: string, city: string, location_latitude: number, location_longitude:number, preferences: string[]}): Promise<any> {
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
