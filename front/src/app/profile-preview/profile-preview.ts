import { UserService } from './../../services/userService';
import { Component, input, output, signal } from '@angular/core';
import { User } from '../core/class/user';


@Component({
  selector: 'app-profile-preview',
  imports: [],
  templateUrl: './profile-preview.html',
  styleUrl: './profile-preview.scss'
})
export class ProfilePreview {
  user = input.required<User>()
  id = input.required<number>()

  distance = signal<number>(0);

  onClick = output<User>()

  allowInteraction = input(true);

  constructor(private userService: UserService){};

  ngOnInit(){
  }

  likeUser(){
    this.userService.setUserAsLiked(this.user().id);
  }

  getDistanceFromLatLonInKm(lat1 : number, lon1:number, lat2:number, lon2:number) {
    var R = 6371; // Radius of the earth in km
    var dLat = this.deg2rad(lat2-lat1);
    var dLon = this.deg2rad(lon2-lon1);
    var a =
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon/2) * Math.sin(dLon/2)
      ;
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return(R * c);
  }

  deg2rad(deg:number) {
    return deg * (Math.PI/180)
  }
}
