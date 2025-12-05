import { Component, inject, signal, viewChildren, ViewContainerRef, afterEveryRender } from '@angular/core';
import { ProfilePreview } from "../../profile-preview/profile-preview";
import { User } from "../../core/class/user"
import { ProfileView } from '../../profile-view/profile-view';
import { ActivatedRoute } from "@angular/router";
import { UserService } from '../../../services/userService';

@Component({
  selector: 'app-home',
  imports: [ProfilePreview],
  templateUrl: './home.html',
  styleUrl: './home.scss'
})
export class Home {
  profiles = signal<User[]>([]);
  nbFakeUser: number = 50;
	user: User = new User();

	loading = signal<boolean>(true)

  private activatedRoute = inject(ActivatedRoute);
  private viewContainer = inject(ViewContainerRef);

  previews = viewChildren<ProfilePreview>(ProfilePreview);
  ngOnInit(){  }

  constructor(private userService: UserService) {
    this.getUserProfile();
    if (this.activatedRoute.snapshot.url.length > 0 && this.activatedRoute.snapshot.url[0].path == "profile"){
      this.createProfilePopup(Number.parseInt(this.activatedRoute.snapshot.url[1].path));
    }
  }

  async getUserProfile(){
    var tmpUser: User|null = await this.userService.getClientUser();
    if (tmpUser == null){
      return ;
    }
    this.user = tmpUser;
    this.user = await this.getClientCity();
    //TODO api call to get similar user as client
    this.profiles.set(await this.userService.searchProfile());
		this.loading.set(false)
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

  seeProfile(user: User){
    history.pushState('','', `/profile/${user.id}`);
    this.createProfilePopup(user.id);
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
}
