import { UserService } from './../../../services/userService';
import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-history',
  imports: [],
  templateUrl: './history.html',
  styleUrl: './history.scss',
})
export class HistoryPage {
  viewed = signal<viewedClass[]>([]);
  constructor(private userService: UserService){
    userService.getClientUser().then((user)=>{
      if (user){
        userService.getProfileHistory().then((response)=>{
          response.json().then((obj)=>{
            const userList = obj as {"id": number,"username": string,"pictures": string}[]

            this.viewed.update((list)=>{
              list = []
              userList.forEach((u)=>{
                list.push(new viewedClass({viewerId: u.id, viewedId: user.id,
                  viewerName: u.username, viewedName: user.username,
                  viewerPfpUrl: u.pictures, viewedPfpUrl: user.photos[0].url!
                }))
              })
              return list;
            })
          })
        })
      }
    });
  }
}

class viewedClass{
  viewerId: number;
  viewedId: number;
  viewerName: string;
  viewedName: string;
  viewerPfpUrl: string;
  viewedPfpUrl: string;

  constructor(obj: {viewerId: number,
  viewedId: number,
  viewerName: string,
  viewedName: string,
  viewerPfpUrl: string,
  viewedPfpUrl: string}){
    this.viewerId = obj.viewerId;
    this.viewedId = obj.viewedId;
    this.viewerName = obj.viewerName;
    this.viewedName = obj.viewedName;
    this.viewerPfpUrl = obj.viewerPfpUrl;
    this.viewedPfpUrl = obj.viewedPfpUrl;
  }
}
