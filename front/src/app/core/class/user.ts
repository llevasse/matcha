import { WebSocketSubject } from "rxjs/webSocket";
import { Interest } from "./interest";
import { ProfileImage } from "./profile-image";
import { Subscription } from "rxjs";

export class User{
  private baseImgUrl = `http://${import.meta.env.NG_APP_BACKEND_HOST}:3000`;

  constructor(
    obj : {
      id: number,
      lastname: string,
      firstname: string,
      username: string,
      email: string,
      birthdate: string,
      age: number | null,
      city: string | null,
      location_latitude: number,
      location_longitude: number,
      distance: number,
      gender: string|null,
      preferences: string[],
      bio: string,
      interest: Interest[],
      photos: ProfileImage[],
      fame: number,
      last_connection_date: string | null,
      tags: {id: number, name: string}[],
      pictures: {id: number, file_path: string, is_main: number, uploaded_at: string}[];
      isValid: boolean,
    } = {
      id: NaN,
      lastname: "",
      firstname: "",
      username: "",
      email: "",
      birthdate: "",
      age: null,
      last_connection_date: null,
      city: null,
      location_latitude: NaN,
      location_longitude: NaN,
      distance: NaN,
      gender: null,
      preferences: [],
      bio: "",
      interest: [],
      photos: [],
      fame: NaN,
      tags: [],
      pictures: [],
      isValid: false,
    }
  ){
    this.id = obj.id ?? NaN;
    this.lastName = obj.lastname ?? "";
    this.firstName = obj.firstname ?? "";
    this.username = obj.username ?? "";
    this.email = obj.email;
    this.birthday = obj.birthdate ?? "";
    this.age = obj.age;
    this.cityStr = obj.city;
    this.cityLat = obj.location_latitude;
    this.cityLon = obj.location_longitude;
    this.distance = obj.distance;
    this.gender = obj.gender ?? "";
    this.preferences = obj.preferences ?? [];
    this.bio = obj.bio ?? "";
    this.interest = obj.interest ?? [];
    this.photos = obj.photos ?? [];
    this.fame = obj.fame ?? NaN;
    this.lastConectionDate = obj.last_connection_date == null ? null : new Date(Date.parse(obj.last_connection_date));
    if (obj.tags && obj.tags.length > 0){
      obj.tags.forEach(({id, name})=>{
        this.interest.push(new Interest(name, id));
      });
    }
    if (obj.pictures && obj.pictures.length > 0){
      obj.pictures.forEach(({id, file_path, is_main, uploaded_at})=>{
        let image = new ProfileImage(`${this.baseImgUrl}${file_path}`);
        image.id = id;
        image.isMain = is_main == 1;
        image.isNew = false;
        this.photos.push(image);
      });
    }
    this.photos.length = 5;
    this.photos.fill(new ProfileImage(), this.photos.length);

    this.isValid = obj.isValid;

    // console.log(this);
  }

  id: number = NaN;
  lastName: string = "";
  firstName: string = "";
  username: string = "";

  email: string = "";

  birthday: string = "";
  age: number | null = null;

  lastConectionDate: Date | null = null;

  cityStr: string | null = null;
  cityLat: number = NaN;
  cityLon: number = NaN;

  distance: number = NaN;

  gender: string | null = null;
  preferences: string[] = [];

  bio: string = "";
  interest: Interest[] = [];

  photos: ProfileImage[] = [];

  fame: number = NaN;

  ws: WebSocketSubject<any> | null = null;

  isAdmin: boolean = false;
  isValid: boolean = false;
}

User.prototype.toString = function(){
  return `id : ${this.id}
  lastName : ${this.lastName}
  firstName : ${this.firstName}
  username : ${this.username}
  birthday : ${this.birthday}
  cityStr : ${this.cityStr}
  cityLat : ${this.cityLat}
  cityLon : ${this.cityLon}
  gender : ${this.gender}
  orientation : ${this.preferences}
  bio : ${this.bio}
  interest : ${this.interest}
  photosUrls : ${this.photos}
  `
}
