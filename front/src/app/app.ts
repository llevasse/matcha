import { UserService } from './../services/userService';
import { Component, signal, ViewEncapsulation } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { AuthService } from '../services/authService';
import { User } from './core/class/user';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  encapsulation: ViewEncapsulation.None,
})
export class App {
  clientUser: User | null = null;
  loaded = signal<boolean>(false);
  protected readonly title = signal('matcha-front');
  constructor(private authService: AuthService, private router: Router, private userService: UserService){
    if (this.getCurrentPathName().startsWith("/login") || this.getCurrentPathName().startsWith("/register")){
      this.loaded.set(true);
      return;
    }
    userService.createClientUser().finally(()=>{
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

  toggleGlobalDropdown(){
    var container = document.querySelector("#global-dropdown-button");
    if (container?.classList.contains('inactive')){
      container?.classList.remove('inactive');
    }else{
      container?.classList.add('inactive');
    }
  }
}
