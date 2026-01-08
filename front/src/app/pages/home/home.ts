import { Component, inject, signal, viewChildren, ViewContainerRef, viewChild } from '@angular/core';
import { ProfilePreview } from "../../profile-preview/profile-preview";
import { User } from "../../core/class/user"
import { ProfileView } from '../../profile-view/profile-view';
import { ActivatedRoute, Router } from "@angular/router";
import { UserService } from '../../../services/userService';
import { InterestDropdown } from "../edit-profile/interest-dropdown/interest-dropdown";

@Component({
  selector: 'app-home',
  imports: [ProfilePreview, InterestDropdown],
  templateUrl: './home.html',
  styleUrl: './home.scss'
})
export class Home {
  profiles = signal<User[]>([]);
  nbFakeUser: number = 50;
	user: User = new User();
	radius: number | null = 42;
	minAge: number | null = null;
	maxAge: number | null = null;
	minFame: number | null = null;
	maxFame: number | null = null;
	sortBy: string = "distance_ascending";

	loading = signal<boolean>(true)

  private activatedRoute = inject(ActivatedRoute);
  private viewContainer = inject(ViewContainerRef);

	interestWhitelistDropdown = viewChild<InterestDropdown>('interestWhitelistDropdownContainer');
	interestBlacklistDropdown = viewChild<InterestDropdown>('interestBlacklistDropdownContainer');

  previews = viewChildren<ProfilePreview>(ProfilePreview);
  ngOnInit(){  }

  constructor(private userService: UserService, private router: Router) {
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
    //TODO api call to get similar user as HttpClient
    await this.searchForProfile();
	}

  async searchForProfile(){
		this.loading.set(true)
		var whiteListInterestId: number[] = [];
		this.interestWhitelistDropdown()!.selectedValues().forEach((interest)=>{
      whiteListInterestId.push(interest.id);
		});

		var blackListInterestId: number[] = [];
		this.interestBlacklistDropdown()!.selectedValues().forEach((interest)=>{
      blackListInterestId.push(interest.id);
		});

    try{
      this.profiles.set(await this.userService.searchProfile(
        this.radius,
        this.minAge,
        this.maxAge,
        this.minFame,
        this.maxFame,
        whiteListInterestId,
        blackListInterestId,
        this.sortBy));
    }
    catch(e){
      console.error(e);
    }
		this.loading.set(false)
  }

  createProfilePopup(userId: number){
    this.userService.getProfileById(userId).then((returnedUser)=>{
      if (returnedUser){
        var profile = this.viewContainer.createComponent(ProfileView);
        profile.setInput("userId", userId);
        profile.instance.user.set(returnedUser);
        profile.instance.loaded.set(true);

        profile.instance.onClickOutside.subscribe(()=>{
          this.router.navigateByUrl('/');
        });
      }
      else{
        this.router.navigateByUrl('/');
      }
    });
  }

  seeProfile(user: User){
    this.router.navigateByUrl(`/profile/${user.id}`);
  }

  removeProfile(user: User){
    this.profiles.update((list)=>{
      return list.filter((checkedUser)=>{return checkedUser.id != user.id});
    })
  }

  setRadius(event: Event){
    this.radius = Number.parseFloat(((event as InputEvent).target as HTMLInputElement).value);
  }

  setMinAge(event: Event){
    this.minAge = Number.parseFloat(((event as InputEvent).target as HTMLInputElement).value);
  }

  setMaxAge(event: Event){
    this.maxAge = Number.parseFloat(((event as InputEvent).target as HTMLInputElement).value);
  }

  setMinFame(event: Event){
    this.minFame = Number.parseFloat(((event as InputEvent).target as HTMLInputElement).value);
  }

  setMaxFame(event: Event){
    this.maxFame = Number.parseFloat(((event as InputEvent).target as HTMLInputElement).value);
  }

  setSortBy(value: string){
    this.sortBy = value;
    this.searchForProfile()
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
