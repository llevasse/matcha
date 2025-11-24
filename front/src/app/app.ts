import { UserService } from './../services/userService';
import { Component, inject, signal, ViewContainerRef, ViewEncapsulation } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { AuthService } from '../services/authService';
import { User } from './core/class/user';
import { NotificationComponent } from "./core/notification-component/notification";
import { ProfileView } from './profile-view/profile-view';
import { createNotificationFromWsObject, MatchaNotification } from './core/class/notification';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NotificationComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  encapsulation: ViewEncapsulation.None,
})
export class App {
  clientUser: User | null = null;
  notifList = signal<MatchaNotification[]>([]);
  private viewContainer = inject(ViewContainerRef);

  loaded = signal<boolean>(false);
  protected readonly title = signal('matcha-front');
  constructor(private authService: AuthService, private router: Router, private userService: UserService){
    if (this.getCurrentPathName().startsWith("/login") || this.getCurrentPathName().startsWith("/register")){
      this.loaded.set(true);
      return;
    }
    userService.createClientUser().then((user)=>{
      if (user){
        this.clientUser = user;
        user.ws?.subscribe((obj)=>{
          this.notificationHandler(obj);
          this.loaded.set(false);
          this.loaded.set(true);
        })
      }
      this.loaded.set(true);
    })
  }

  createProfilePopup(userId: number){
    var profile = this.viewContainer.createComponent(ProfileView);
    profile.setInput("userId", userId);
    profile.instance.onClickOutside.subscribe(()=>{
      profile.destroy();
      setTimeout(()=>{  // Error in console if not in timeout ??
        history.pushState('','', `/`);
      }, 100);
    });
  }

  seeProfile(userId: number){
    history.pushState('','', `/profile/${userId}`);
    this.createProfilePopup(userId);
  }

  isAuth(){
    return this.authService.isAuthenticated();
  }

  getCurrentPathName(){
    return window.location.pathname;
  }

  goHome(){
    // history.pushState('','', "/");
    this.router.navigate([`/`]);
  }

  goProfile(){
    // history.pushState('','', "/profile");
    this.router.navigate([`/profile`]);
  }

  logout(){
    this.authService.logout();
    // history.pushState('','', "/login");
    this.router.navigate([`/login`]);
  }

  goLikes(){
    this.router.navigate([`/likes`]);
  }

  goMatches(){
    this.router.navigate([`/matches`]);
  }

  toggleNotifDropdown(){
    var container = document.querySelector("#notif-content-container");
    if (container?.classList.contains('inactive')){
      container?.classList.remove('inactive');
    }else{
      container?.classList.add('inactive');
    }
  }

  private removeNotif(notif:MatchaNotification){
    this.notifList.update((list)=>{
      const index = list.findIndex((currentNotif)=>{
        return (currentNotif.senderId == notif.senderId && currentNotif.type == notif.type)
      })
      if (index != -1){
        list.splice(index, 1);
      }
      return list;
    })
  }

  private notificationHandler(obj: any) {
    const notif = createNotificationFromWsObject(obj);
    if (notif.message != ""){
      switch(notif.type){
        case 'liked':{
          notif.action = ()=>{
            this.seeProfile(notif.senderId!);
            this.removeNotif(notif);
          }
          break;
        }
        default:{
          notif.action = ()=>{
            this.removeNotif(notif);
          }
        }
      }
      console.log("New notif :", notif);
      // if (this.notifList().length != 0){
      //   console.log("Last notif :", this.notifList()[this.notifList().length - 1]);
      // }
      if (notif.message != "" && (notif.senderId == null || notif.senderId! != this.clientUser?.id)){
        // this.notifList().at()
        this.notifList.update((list)=>{
          let needPush = true;
          list.forEach((currentNotif)=>{
            if (currentNotif.type == notif.type && currentNotif.senderId == notif.senderId){
              currentNotif.repeated++;
              needPush = false;
            }
          })
          if (needPush){
            list.push(notif)
          }
          return list;
        })
      }
    }
  }
}
