import { afterEveryRender, Component, inject, signal, viewChildren, ViewContainerRef } from '@angular/core';
import { User } from '../../core/class/user';
import { ProfilePreview } from "../../profile-preview/profile-preview";
import { ActivatedRoute, Router } from '@angular/router';
import { ProfileView } from '../../profile-view/profile-view';
import { UserService } from '../../../services/userService';
import { getClientCity, notifType } from '../../utilities/utils';
import { createNotificationFromWsObject } from '../../core/class/notification';

@Component({
  selector: 'app-liked',
  imports: [ProfilePreview],
  templateUrl: './liked.html',
  styleUrl: './liked.scss'
})
export class Liked {
  previews = viewChildren<ProfilePreview>(ProfilePreview);
  user!: User;
  loaded = signal(false);
  profiles = signal<User[]>([])

  private activatedRoute = inject(ActivatedRoute);
  private viewContainer = inject(ViewContainerRef);

  constructor(private userService: UserService, private router: Router) {;
    this.getUserProfile();

    if (this.activatedRoute.snapshot.url.length > 1 && this.activatedRoute.snapshot.url[1].path == "profile"){
      this.createProfilePopup(Number.parseInt(this.activatedRoute.snapshot.url[2].path));
    }
  }

  async getUserProfile(){
    var tmpUser: User|null = await this.userService.getClientUser();
    if (tmpUser == null){
      return ;
    }
    this.user = tmpUser;
    this.user = await getClientCity(this.user);
    this.profiles.set(await this.userService.getUsersWhoLikedClient());
    // Update liked list on new match or got unliked
    this.user.ws?.asObservable().pipe().subscribe(async (obj) => {
      const notif = createNotificationFromWsObject(obj)
      if (notif.type == notifType.LIKED || notif.type == notifType.UNLIKED){
        this.profiles.set(await this.userService.getUsersWhoLikedClient());
        this.loaded.set(false)
        this.loaded.set(true)
      }
    })
		this.loaded.set(true)
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
