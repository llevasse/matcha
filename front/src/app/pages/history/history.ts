import { ActivatedRoute } from '@angular/router';
import { UserService } from './../../../services/userService';
import { Component, inject, signal, ViewContainerRef } from '@angular/core';
import { ProfileView } from '../../profile-view/profile-view';

@Component({
  selector: 'app-history',
  imports: [],
  templateUrl: './history.html',
  styleUrl: './history.scss',
})
export class HistoryPage {
  viewed = signal<viewedClass[]>([]);
  private activatedRoute = inject(ActivatedRoute);
  private viewContainer = inject(ViewContainerRef)
  constructor(private userService: UserService){
    userService.getClientUser().then((user)=>{
      if (user){
        userService.getProfileHistory().then((response)=>{
          response.json().then((obj)=>{
            const userList = obj as {"viewer_id": number, "viewed_id": number,
              "viewer_name": string,"viewer_pfp": string,
              "viewed_name": string,"viewed_pfp": string,
              "time": string}[]

            this.viewed.update((list)=>{
              list = []
              userList.forEach((u)=>{
                list.push(new viewedClass({viewerId: u.viewer_id, viewedId: u.viewed_id,
                  viewerName: u.viewer_name, viewedName: u.viewed_name,
                  viewerPfpUrl: u.viewer_pfp, viewedPfpUrl: u.viewed_pfp,
                  date: new Date(Date.parse(u.time)),
                  received: u.viewed_id == user.id
                }))
              })
              return list;
            })
          })
        })
      }
    });
    if (this.activatedRoute.snapshot.url.length > 1 && this.activatedRoute.snapshot.url[1].path == "profile"){
      this.createProfilePopup(Number.parseInt(this.activatedRoute.snapshot.url[2].path));
    }

  }
  createProfilePopup(userId: number){
    this.userService.getProfileById(userId).then((returnedUser)=>{
      if (returnedUser){
        var profile = this.viewContainer.createComponent(ProfileView);
        profile.setInput("userId", userId);
        profile.instance.user.set(returnedUser);
        profile.instance.loaded.set(true);


        profile.instance.onClickOutside.subscribe(()=>{
          window.history.pushState('','',`/`);
          profile.destroy();
        });
      }
      else{
        window.history.replaceState('','',`/`);
      }
    });
  }

  seeProfile(event: Event, id: number){
    console.log(event, id);
    event.preventDefault();
    window.history.pushState('','',`history/profile/${id}`);
    this.createProfilePopup(id);
  }
}

class viewedClass{
  viewerId: number;
  viewedId: number;
  viewerName: string;
  viewedName: string;
  viewerPfpUrl: string;
  viewedPfpUrl: string;
  date: Date;
  received:boolean; // True if client has been seen, false if client has seen

  constructor(obj: {viewerId: number,
  viewedId: number,
  viewerName: string,
  viewedName: string,
  viewerPfpUrl: string,
  viewedPfpUrl: string,
  date: Date,
  received: boolean}){
    this.viewerId = obj.viewerId;
    this.viewedId = obj.viewedId;
    this.viewerName = obj.viewerName;
    this.viewedName = obj.viewedName;
    this.viewerPfpUrl = obj.viewerPfpUrl;
    this.viewedPfpUrl = obj.viewedPfpUrl;
    this.date = obj.date;
    this.received = obj.received;
  }
}
