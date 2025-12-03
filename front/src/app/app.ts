import { UserService } from './../services/userService';
import { Component, HostListener, inject, signal, ViewContainerRef, ViewEncapsulation } from '@angular/core';
import { Event, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { AuthService } from '../services/authService';
import { User } from './core/class/user';
import { NotificationComponent } from "./core/notification-component/notification";
import { createNotificationFromWsObject, MatchaNotification } from './core/class/notification';
import { notifType } from './utilities/utils';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NotificationComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  encapsulation: ViewEncapsulation.None,
})
export class App {
  clientUser: User | null = null;
  notifList = signal<MatchaNotification[]>([
    // new MatchaNotification("New match", "", null, null, notifType.MATCH),
    // new MatchaNotification("New like", "", null, null, notifType.LIKED),
    // new MatchaNotification("New message", "", null, null, notifType.MESSAGE_SENT),
    // new MatchaNotification("Unliked", "", null, null, notifType.UNLIKED),
    // new MatchaNotification("New match", "", null, null, notifType.MATCH),
    // new MatchaNotification("New message", "", null, null, notifType.MESSAGE_SENT),
    // new MatchaNotification("New message", "", null, null, notifType.MESSAGE_SENT),

  ]);

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

  ngOnInit(){
    this.router.events.subscribe((event: Event)=>{
      if (event instanceof NavigationEnd){  // TODO handle for liked and match notif
        console.log(event.url);
        if (RegExp("^\/matches\/profile\/.*\/chat$").test(event.url)){  // check if url leads to chat and clear related notif if need be
          const profileId: number = Number.parseInt(event.url.split("/")[3])
          this.removeNotif(new MatchaNotification("","", profileId, null, notifType.MESSAGE_SENT));
        }
        if (RegExp("^\/matches.*$").test(event.url)){
          this.notifList.set(
            this.notifList().filter((notif)=>{
              return notif.type != notifType.MATCH;
            })
          );
        }
        if (RegExp("^\/likes.*$").test(event.url)){
          this.notifList.set(
            this.notifList().filter((notif)=>{
              return notif.type != notifType.LIKED && notif.type != notifType.UNLIKED;
            })
          );
        }
      }
    });
  }

  isAuth(){
    return this.authService.isAuthenticated();
  }

  getCurrentPathName(){
    return window.location.pathname;
  }

  goHome(){
    this.router.navigate([`/`]);
  }

  goProfile(){
    this.router.navigate([`/profile`]);
  }

  logout(){
    this.authService.logout();
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
    if (container?.classList.contains('inactive') && container?.children.length != 0){
      container?.classList.remove('inactive');
    }else{
      container?.classList.add('inactive');
    }
  }

  @HostListener('document:mousedown', ['$event']) closeNotifDropdown(event: any){
    if (event.target.closest("#notif-dropdown-container") == null && event.target.closest("#notif-content-container") == null){
      var container = document.querySelector("#notif-content-container");
      if (container && !container?.classList.contains("inactive")){
        container?.classList.add('inactive');
      }
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
        case notifType.LIKED:{
          notif.action = ()=>{
            this.router.navigateByUrl(`/likes/profile/${notif.senderId}`);
            this.removeNotif(notif);
          }
          break;
        }
        case notifType.UNLIKED:{
          notif.action = ()=>{
            this.removeNotif(notif);
          }
          break;
        }
        case notifType.MATCH:{
          if (RegExp("^\/matches.*$").test(this.router.url)){
            return ;
          }
          notif.action = ()=>{
            this.router.navigateByUrl(`/matches/profile/${notif.senderId}`)
            this.removeNotif(notif);
          }
          break;
        }
        case notifType.MESSAGE_SENT:{
          notif.action = ()=>{
            this.router.navigateByUrl(`/matches/profile/${notif.senderId}/chat`)
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
      if (notif.message != "" && (notif.senderId == null || notif.senderId! != this.clientUser?.id)){
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
