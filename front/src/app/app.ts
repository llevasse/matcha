import { UserService } from './../services/userService';
import { Component, signal, ViewEncapsulation } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { AuthService } from '../services/authService';
import { User } from './core/class/user';
import { NotificationComponent } from "./core/notification/notification";
import { MatchaNotification } from './core/class/notification';

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

  loaded = signal<boolean>(false);
  protected readonly title = signal('matcha-front');
  constructor(private authService: AuthService, private router: Router, private userService: UserService){
    if (this.getCurrentPathName().startsWith("/login") || this.getCurrentPathName().startsWith("/register")){
      this.loaded.set(true);
      return;
    }
    userService.createClientUser().then((user)=>{
      if (user){
        user.ws?.subscribe((obj)=>{
          if(obj['type'] == "liked"){
            var fromUserObj = JSON.parse(obj['from']);
            console.log(fromUserObj);
            this.notifList.update((list)=>{
              var notif = new MatchaNotification(`${fromUserObj['username']} liked you`, `http://${import.meta.env.NG_APP_BACKEND_HOST}:3000${fromUserObj['profile_picture']}`);
              notif.action = ()=>{
                this.router.navigate([`/profile/${fromUserObj['id']}`]);
              }
              list.push(notif)
              return list;
            })
            this.loaded.set(false);
            this.loaded.set(true);
          }
        })
      }
      this.loaded.set(true);
    })
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
}
