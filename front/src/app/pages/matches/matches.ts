import { Component, inject, signal, ViewContainerRef } from '@angular/core';
import { UserService } from '../../../services/userService';
import { ActivatedRoute, Router } from '@angular/router';
import { User } from '../../core/class/user';
import { ProfileView } from '../../profile-view/profile-view';
import { ProfilePreview } from "../../profile-preview/profile-preview";

@Component({
  selector: 'app-matches',
  imports: [ProfilePreview],
  templateUrl: './matches.html',
  styleUrl: './matches.scss'
})
export class Matches {
  constructor(private userService: UserService, private router: Router){
    this.userService.getUserMatches().then((users)=>{
      this.loaded.set(true);
      this.profiles.set(users)
    });

    if (this.activatedRoute.snapshot.url.length > 1 && this.activatedRoute.snapshot.url[1].path == "profile"){
      this.createProfilePopup(Number.parseInt(this.activatedRoute.snapshot.url[2].path));
    }
  }

  loaded = signal(false);
  profiles = signal<User[]>([])

  private activatedRoute = inject(ActivatedRoute);
  private viewContainer = inject(ViewContainerRef);

  createProfilePopup(userId: number){
    var profile = this.viewContainer.createComponent(ProfileView);
    profile.setInput("userId", userId);
    profile.setInput("withChat", true);
    profile.instance.onClickOutside.subscribe(()=>{
      profile.destroy();
      setTimeout(()=>{  // Error in console if not in timeout ??
        this.router.navigateByUrl('/matches');
        // history.pushState('','', `/matches`);
      }, 100);
    });
  }

  seeProfile(user: User){
    this.router.navigateByUrl(`/matches/profile/${user.id}`);
    // history.pushState('','', `/matches/profile/${user.id}`);
    this.createProfilePopup(user.id);
  }
}
