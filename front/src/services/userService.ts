import { Injectable } from "@angular/core";
import { User } from "../app/core/class/user";
import { Router } from "@angular/router";
import { webSocket } from "rxjs/webSocket";

@Injectable({ providedIn: 'root' })
export class UserService {
  baseUrl = `http://${import.meta.env.NG_APP_BACKEND_HOST}:3000`;
  private profileUrl = `${this.baseUrl}/api/users`;
  private pictureUrl = `${this.baseUrl}/api/profiles`;

  private clientUser: User | null = null;

  constructor(private router: Router) {}

  createClientUser(): Promise<User | null>{
    console.log("call to create user");
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
      document.dispatchEvent(new Event("error503"));
      return null;
    })
  }

  deleteClient(){
    if (this.clientUser?.ws){
      this.clientUser.ws.complete();
    }
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


  searchProfile(size:number, offset:number, radius: number | null = 42, minAge: number | null = null, maxAge: number | null = null, minFame: number | null = null, maxFame: number | null = null, whiteListInterestId: number[] | null, blackListInterestId: number[] | null, location : {lat: number, lon: number} | null, sortBy:string){
    var users: User[] = [];
    var params = `&limit=${size}&offset=${offset}`;

    if (radius){
      params += `&radius=${radius}`;
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

    if (location){
      params += `&lat=${location.lat}&lon=${location.lon}`;
    }

    params += `&sort_by=${sortBy}`;



    return fetch(`${this.profileUrl}/search?${params}`, {
      headers : {
        "Authorization":"Bearer " + localStorage.getItem('token'),
      }
    }).then(async (value)=>{
      if (!value.ok){
        return [];
      }
      users = await this.userListFromResponse(value);
      return users;
    })
  }

  addProfileToHistory(userId:number){
    return fetch(`${this.profileUrl}/add_to_history`, {
      method: 'POST',
      headers : {
        "Authorization":"Bearer " + localStorage.getItem('token'),
        'content-type': 'application/json',
      },
      body: JSON.stringify({user_id:userId})
    })
  }

  getProfileHistory(){
    return fetch(`${this.profileUrl}/history`, {
      headers : {
        "Authorization":"Bearer " + localStorage.getItem('token'),
      }
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
