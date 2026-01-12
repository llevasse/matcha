import { Component, inject, signal, viewChildren, ViewContainerRef, viewChild, HostListener } from '@angular/core';
import { ProfilePreview } from "../../profile-preview/profile-preview";
import { User } from "../../core/class/user"
import { ProfileView } from '../../profile-view/profile-view';
import { ActivatedRoute } from "@angular/router";
import { UserService } from '../../../services/userService';
import { InterestDropdown } from "../edit-profile/interest-dropdown/interest-dropdown";
import e from 'express';

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
	ascendingOrder:boolean = true;

	updateSearchTimeoutID: number|null = null;

	sortStringToPreview = new Map<string, string>([
	  ['age_ascending', 'ascending age'],
	  ['age_descending', 'descending age'],
	  ['distance_ascending', 'ascending distance'],
	  ['distance_descending', 'descending distance'],
	  ['interest_ascending', 'ascending common interest'],
	  ['interest_descending', 'descending common interest'],
	  ['fame_ascending', 'ascending fame'],
	  ['fame_descending', 'descending fame'],
	])

	loading = signal<boolean>(true)

	searchOptionPreview = signal<string>('');

  private activatedRoute = inject(ActivatedRoute);
  private viewContainer = inject(ViewContainerRef);

	interestWhitelistDropdown = viewChild<InterestDropdown>('interestWhitelistDropdownContainer');
	interestBlacklistDropdown = viewChild<InterestDropdown>('interestBlacklistDropdownContainer');

  previews = viewChildren<ProfilePreview>(ProfilePreview);
  ngOnInit(){  }

  constructor(private userService: UserService) {
    this.getUserProfile();
    if (this.activatedRoute.snapshot.url.length > 0 && this.activatedRoute.snapshot.url[0].path == "profile"){
      this.createProfilePopup(Number.parseInt(this.activatedRoute.snapshot.url[1].path));
    }
    this.setOptionPreview(false);
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

  updateSearch(){
    if (this.updateSearchTimeoutID){
      window.clearTimeout(this.updateSearchTimeoutID!);
      this.updateSearchTimeoutID = null;
    }
    this.updateSearchTimeoutID = window.setTimeout(()=>{this.searchForProfile()}, 1000)
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
    this.updateSearchTimeoutID = null;
  }

  createProfilePopup(userId: number){
    this.userService.getProfileById(userId).then((returnedUser)=>{
      if (returnedUser){
        var profile = this.viewContainer.createComponent(ProfileView);
        profile.setInput("userId", userId);
        profile.instance.user.set(returnedUser);
        profile.instance.loaded.set(true);

        profile.instance.onClickOutside.subscribe(()=>{
          window.history.pushState('','',`/`);
          profile.destroy();
        });
      }
      else{
        window.history.replaceState('','',`/`);
      }
    });
  }

  seeProfile(user: User){
    window.history.pushState('','',`/profile/${user.id}`);
    this.createProfilePopup(user.id);
  }

  removeProfile(user: User){
    this.profiles.update((list)=>{
      return list.filter((checkedUser)=>{return checkedUser.id != user.id});
    })
  }

  setRadius(event: Event){
    this.radius = Number.parseFloat(((event as InputEvent).target as HTMLInputElement).value);
    this.setOptionPreview();
  }

  setMinAge(event: Event){
    this.minAge = Number.parseFloat(((event as InputEvent).target as HTMLInputElement).value);
    this.setOptionPreview();
  }

  setMaxAge(event: Event){
    this.maxAge = Number.parseFloat(((event as InputEvent).target as HTMLInputElement).value);
    this.setOptionPreview();
  }

  setMinFame(event: Event){
    this.minFame = Number.parseFloat(((event as InputEvent).target as HTMLInputElement).value);
    this.setOptionPreview();
  }

  setMaxFame(event: Event){
    this.maxFame = Number.parseFloat(((event as InputEvent).target as HTMLInputElement).value);
    this.setOptionPreview();
  }

  setSortBy(event: PointerEvent, value: string){
    if (event.target instanceof HTMLElement){
      if (event.target.classList.contains("active-sort-selector")){
        if (this.ascendingOrder){
          event.target.classList.replace("ascending", "descending");
          this.ascendingOrder = false;
        }
        else{
          event.target.classList.replace("descending", "ascending");
          this.ascendingOrder = true;
        }
      }
      else{
        if(document.querySelector(".active-sort-selector")){
          document.querySelector(".active-sort-selector")!.className = "";
        }
        event.target.classList.add("active-sort-selector");
        event.target.classList.add("ascending");
        this.ascendingOrder = true;
      }
    }
    this.sortBy = `${value}_${this.ascendingOrder ? "ascending" : "descending"}`;
    this.setOptionPreview();
  }

  setOptionPreview(updateSearch = true){
    if (updateSearch){
      this.updateSearch();
    }
    this.searchOptionPreview.update((preview)=>{
      preview = `Sort by ${this.sortStringToPreview.get(this.sortBy)}`;
      if (this.radius){
        preview += `, max radius = ${this.radius}km`
      }
      if (this.minAge){
        preview += `, min age = ${this.minAge}`
      }
      if (this.maxAge){
        preview += `, max age = ${this.maxAge}`
      }
      if (this.minFame){
        preview += `, min fame = ${this.minFame}`
      }
      if (this.maxFame){
        preview += `, max fame = ${this.maxFame}`
      }
      if (this.interestWhitelistDropdown() && this.interestWhitelistDropdown()!.selectedValues().length > 0){
        let whiteListInterest = ", whitelisted interest : "
        let whiteListInterestNames = new Array<string>();
        this.interestWhitelistDropdown()!.selectedValues().forEach((interest)=>{
          whiteListInterestNames.push(interest.name);
        })
        whiteListInterest += `(${whiteListInterestNames.join(", ")})`;
        preview += whiteListInterest;
      }

      if (this.interestBlacklistDropdown() && this.interestBlacklistDropdown()!.selectedValues().length > 0){
        let blackListInterest = ", blacklisted interest : "
        let blackListInterestNames = new Array<string>();
        this.interestBlacklistDropdown()!.selectedValues().forEach((interest)=>{
          blackListInterestNames.push(interest.name);
        })
        blackListInterest += `(${blackListInterestNames.join(", ")})`;
        preview += blackListInterest;
      }
      return preview;
    })
  }

  toggleSearchOptionsDisplay(){
    const e = document.querySelector("#search-option-container");
    if (e && !e.classList.contains("display-search-options")){
      e.classList.add("display-search-options")
    }
    else{
      e?.classList.remove("display-search-options");
    }
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
