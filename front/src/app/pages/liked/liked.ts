import { Component, inject, signal, ViewContainerRef } from '@angular/core';
import { User } from '../../core/class/user';
import { ProfilePreview } from "../../profile-preview/profile-preview";
import { ActivatedRoute, Router } from '@angular/router';
import { ProfileView } from '../../profile-view/profile-view';
import { UserService } from '../../../services/userService';

@Component({
  selector: 'app-liked',
  imports: [ProfilePreview],
  templateUrl: './liked.html',
  styleUrl: './liked.scss'
})
export class Liked {
  loaded = signal(false);
  profiles = signal<User[]>([])

  private activatedRoute = inject(ActivatedRoute);
  private viewContainer = inject(ViewContainerRef);

  constructor(private userService: UserService, private router: Router) {;
    this.userService.getUsersWhoLikedClient().then((users)=>{
      this.loaded.set(true);
      this.profiles.set(users)
    });

    if (this.activatedRoute.snapshot.url.length > 1 && this.activatedRoute.snapshot.url[1].path == "profile"){
      this.createProfilePopup(Number.parseInt(this.activatedRoute.snapshot.url[2].path));
    }
  }

  createProfilePopup(userId: number){
    var profile = this.viewContainer.createComponent(ProfileView);
    profile.setInput("userId", userId);
    profile.instance.onClickOutside.subscribe(()=>{
      profile.destroy();
      setTimeout(()=>{  // Error in console if not in timeout ??
        this.router.navigateByUrl(`/liked`)
        // history.pushState('','', `/liked`);
      }, 100);
    });
  }

  seeProfile(user: User){
    this.router.navigateByUrl(`/liked/profile/${user.id}`)
    // history.pushState('','', );
    this.createProfilePopup(user.id);
  }
}
