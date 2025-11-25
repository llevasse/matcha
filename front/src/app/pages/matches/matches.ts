import { afterEveryRender, Component, inject, signal, viewChildren, ViewContainerRef } from '@angular/core';
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
  previews = viewChildren<ProfilePreview>(ProfilePreview);
  user!: User;
  constructor(private userService: UserService, private router: Router){
    this.getUserProfile();

    if (this.activatedRoute.snapshot.url.length > 1 && this.activatedRoute.snapshot.url[1].path == "profile"){
      this.createProfilePopup(Number.parseInt(this.activatedRoute.snapshot.url[2].path));
    }

    afterEveryRender(()=>{
      this.previews().forEach((preview)=>{  // TODO use saved client location
        preview.distance.set(
          preview.getDistanceFromLatLonInKm(
            this.user.cityLat,
            this.user.cityLon,
            preview.user().cityLat,
            preview.user().cityLon,
          )
        );
      });
    })
  }

  async getUserProfile(){
    var tmpUser: User|null = await this.userService.getClientUser();
    if (tmpUser == null){
      return ;
    }
    this.user = tmpUser;
    this.user = await this.getClientCity();
    //TODO api call to get similar user as client
    this.profiles.set(await this.userService.getUserMatches());
		this.loaded.set(true)
	}

	async getClientCity() {
    const url = "http://ip-api.com/json/";
    try {
      if (Number.isNaN(this.user.cityLat) || Number.isNaN(this.user.cityLon)){
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Response status: ${response.status}`);
        }
        const result = await response.json();
        this.user.cityStr = result['city'];
        this.user.cityLon = result['lon'];
        this.user.cityLat = result['lat'];
      }
    } catch (error: any) {
      console.error(error.message);
    }
    return this.user;
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
