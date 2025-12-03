import { WebSocketSubject } from "rxjs/webSocket";
import { Interest } from "./interest";
import { ProfileImage } from "./profile-image";

export class User{
  createDummy(){
    this.id = 42;
    this.lastName = "Doe"
    this.firstName = "Jane"
    this.username = "anon"
    this.birthday = '2000-01-01'
    this.gender = 'Prefer not to say'
    this.preferences = ['woman', 'man']
    this.bio = `Lorem ipsum dolor sit amet consectetur adipiscing elit. Quisque faucibus ex sapien vitae pellentesque sem placerat. In id cursus mi pretium tellus duis convallis. Tempus leo eu aenean sed diam urna tempor. Pulvinar vivamus fringilla lacus nec metus bibendum egestas. Iaculis massa nisl malesuada lacinia integer nunc posuere. Ut hendrerit semper vel class aptent taciti sociosqu. Ad litora torquent per conubia nostra inceptos himenaeos.\r\n
Lorem ipsum dolor sit amet consectetur adipiscing elit. Quisque faucibus ex sapien vitae pellentesque sem placerat. In id cursus mi pretium tellus duis convallis. Tempus leo eu aenean sed diam urna tempor. Pulvinar vivamus fringilla lacus nec metus bibendum egestas. Iaculis massa nisl malesuada lacinia integer nunc posuere. Ut hendrerit semper vel class aptent taciti sociosqu. Ad litora torquent per conubia nostra inceptos himenaeos.\r\n
Lorem ipsum dolor sit amet consectetur adipiscing elit. Quisque faucibus ex sapien vitae pellentesque sem placerat. In id cursus mi pretium tellus duis convallis. Tempus leo eu aenean sed diam urna tempor. Pulvinar vivamus fringilla lacus nec metus bibendum egestas. Iaculis massa nisl malesuada lacinia integer nunc posuere. Ut hendrerit semper vel class aptent taciti sociosqu. Ad litora torquent per conubia nostra inceptos himenaeos.`
    this.interest = [new Interest('#hiking', 0), new Interest('#trail-running', 0), new Interest('#running', 0), new Interest('#crochet', 0), new Interest('#reading', 0), new Interest('#knitting', 0)]
    this.fame = 420;
    this.cityLat = 45.781067835208646;
    this.cityLon = 4.748013596686739;
    this.cityStr = "charbonniere-les-bains"
    this.photos = [
      new ProfileImage('/assets/lambert_pfp.jpg'),
      new ProfileImage('/assets/lambert1.jpg'),
      new ProfileImage('/assets/lambert2.jpg'),
      new ProfileImage('/assets/lambert3.jpg'),
      new ProfileImage('/assets/lambert_lust.jpg'),
      ]
  }

  hashCode(){
    var hash = 0;
    var s = this.toString();
    for (var i = 0; i < s.length; i++) {
        var code = s.charCodeAt(i);
        hash = ((hash<<5)-hash)+code;
        hash = hash & hash;
    }
    return hash;
  }

  constructor(
    obj : {
      id: number,
      lastname: string,
      firstname: string,
      username: string,
      email: string,
      birthdate: string,
      city: string | null,
      location_latitude: number,
      location_longitude: number,
      gender: string|null,
      preferences: string[],
      bio: string,
      interest: Interest[],
      photos: ProfileImage[],
      fame: number,
      last_connection_date: string | null;
    } = {
      id: NaN,
      lastname: "",
      firstname: "",
      username: "",
      email: "",
      birthdate: "",
      last_connection_date: null,
      city: null,
      location_latitude: NaN,
      location_longitude: NaN,
      gender: null,
      preferences: [],
      bio: "",
      interest: [],
      photos: [],
      fame: NaN,
    }
  ){
    this.id = obj.id ?? NaN;
    this.lastName = obj.lastname ?? "";
    this.firstName = obj.firstname ?? "";
    this.username = obj.username ?? "";
    this.email = obj.email;
    this.birthday = obj.birthdate ?? "";
    this.cityStr = obj.city;
    this.cityLat = obj.location_latitude;
    this.cityLon = obj.location_longitude;
    this.gender = obj.gender ?? "";
    this.preferences = obj.preferences ?? [];
    this.bio = obj.bio ?? "";
    this.interest = obj.interest ?? [];
    this.photos = obj.photos ?? [];
    this.fame = obj.fame ?? NaN;
    this.lastConectionDate = obj.last_connection_date == null ? null : new Date(Date.parse(obj.last_connection_date));
    // console.log(this);
  }

  id: number = NaN;
  lastName: string = "";
  firstName: string = "";
  username: string = "";

  email: string = "";

  birthday: string = "";

  lastConectionDate: Date | null = null;

  cityStr: string | null = null;
  cityLat: number = NaN;
  cityLon: number = NaN;

  gender: string | null = null;
  preferences: string[] = [];

  bio: string = "";
  interest: Interest[] = [];

  photos: ProfileImage[] = [];

  fame: number = NaN;

  ws: WebSocketSubject<any> | null = null;

  isFilled(){
    return !(this.birthday == "" || this.gender == "" || this.preferences.length == 0 || this.photos.length == 0)
  }
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
