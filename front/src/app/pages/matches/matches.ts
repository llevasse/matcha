import { MatchesService } from './../../../services/matchesService';
import { Component, ComponentRef, inject, signal, viewChildren, ViewContainerRef } from '@angular/core';
import { UserService } from '../../../services/userService';
import { ActivatedRoute, Router } from '@angular/router';
import { User } from '../../core/class/user';
import { ProfileView } from '../../profile-view/profile-view';
import { ProfilePreview } from "../../profile-preview/profile-preview";
import { getClientCity, notifType } from '../../utilities/utils';
import { createNotificationFromWsObject } from '../../core/class/notification';

@Component({
  selector: 'app-matches',
  imports: [ProfilePreview],
  templateUrl: './matches.html',
  styleUrl: './matches.scss'
})
export class Matches {
  previews = viewChildren<ProfilePreview>(ProfilePreview);
  user!: User;
  profileView: ComponentRef<ProfileView> | null = null;
  constructor(private userService: UserService, private matchesService: MatchesService, private router: Router){
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
    //TODO api call to get similar user as client
    this.profiles.set(await this.userService.getUserMatches());

    // Update match list on new match or got unliked
    this.user.ws?.asObservable().pipe().subscribe(async (obj) => {
      const notif = createNotificationFromWsObject(obj)
      if (notif.type == notifType.MATCH || notif.type == notifType.UNLIKED){
        if (notif.type == notifType.UNLIKED && this.profileView){
          this.router.navigateByUrl('/matches');
        }
        else{
          this.profiles.set(await this.userService.getUserMatches());
          this.loaded.set(false)
          this.loaded.set(true)
        }
      }
    })
		this.loaded.set(true)
	}


  loaded = signal(false);
  profiles = signal<User[]>([])

  private activatedRoute = inject(ActivatedRoute);
  private viewContainer = inject(ViewContainerRef);

  createProfilePopup(userId: number){
    this.matchesService.getProfileById(userId).then((returnedUser)=>{
      if (returnedUser){
        this.profileView = this.viewContainer.createComponent(ProfileView);
        this.profileView.setInput("userId", userId);
        this.profileView.setInput("withChat", true);
        this.profileView.setInput("withUnlike", true);
        this.profileView.instance.user.set(returnedUser);
        this.profileView.instance.loaded.set(true);
        this.profileView.instance.onUnlike.subscribe(()=>{
          this.userService.setUserAsUnliked(userId).then((response)=>{
            this.router.navigateByUrl('/matches');
            this.profileView = null;
          })
        })
        this.profileView.instance.onClickOutside.subscribe(()=>{
          this.router.navigateByUrl('/matches');
          this.profileView = null;
        });
      }
      else{
        this.router.navigateByUrl('/matches');
      }
    })
  }

  seeProfile(user: User){
    this.router.navigateByUrl(`/matches/profile/${user.id}`);
  }
}
