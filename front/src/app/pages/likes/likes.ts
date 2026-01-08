import { LikesService } from './../../../services/likesService';
import { Component, inject, signal, viewChildren, ViewContainerRef } from '@angular/core';
import { User } from '../../core/class/user';
import { ProfilePreview } from "../../profile-preview/profile-preview";
import { ActivatedRoute, Router } from '@angular/router';
import { ProfileView } from '../../profile-view/profile-view';
import { UserService } from '../../../services/userService';
import { getClientCity, notifType } from '../../utilities/utils';
import { createNotificationFromWsObject } from '../../core/class/notification';

@Component({
  selector: 'app-likes',
  imports: [ProfilePreview],
  templateUrl: './likes.html',
  styleUrl: './likes.scss'
})
export class Likes {
  previews = viewChildren<ProfilePreview>(ProfilePreview);
  user!: User;
  loaded = signal(false);
  profiles = signal<User[]>([])

  private activatedRoute = inject(ActivatedRoute);
  private viewContainer = inject(ViewContainerRef);

  constructor(private userService: UserService, private likesService: LikesService, private router: Router) {;
    this.getUserProfile();

    console.log(this.activatedRoute.snapshot.url);
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
    this.likesService.getProfileById(userId).then((returnedUser)=>{
      if (returnedUser){
        var profile = this.viewContainer.createComponent(ProfileView);
        profile.setInput("userId", userId);
        profile.instance.user.set(returnedUser);
        profile.instance.loaded.set(true);

        profile.instance.onClickOutside.subscribe(()=>{
          this.router.navigateByUrl('/likes');
        });
      }

      else{
        this.router.navigateByUrl('/likes');
      }
    })
  }

  seeProfile(user: User){
    this.router.navigateByUrl(`/likes/profile/${user.id}`)
  }
}
