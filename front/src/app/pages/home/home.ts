import { Component, inject, signal, viewChildren, ViewContainerRef, viewChild, HostListener, ComponentRef } from '@angular/core';
import { ProfilePreview } from "../../profile-preview/profile-preview";
import { User } from "../../core/class/user"
import { ProfileView } from '../../profile-view/profile-view';
import { ActivatedRoute } from "@angular/router";
import { UserService } from '../../../services/userService';
import { InterestDropdown } from "../edit-profile/interest-dropdown/interest-dropdown";
import { Dropdown } from "../../core/dropdown/dropdown";
import { LikesService } from '../../../services/likesService';
import { Interest } from '../../core/class/interest';
import { LocationService } from '../../../services/locationService';

type cityObj = {city: string | undefined;
            state: string | undefined;
            country: string | undefined;
            lat: number; lon: number}

@Component({
  selector: 'app-home',
  imports: [ProfilePreview, InterestDropdown, Dropdown],
  templateUrl: './home.html',
  styleUrl: './home.scss'
})
export class Home {
  profiles = signal<User[]>([]);
  nbFakeUser: number = 50;
	user: User = new User();
	radius: number | null = null;
	minAge: number | null = null;
	maxAge: number | null = null;
	minFame: number | null = null;
	maxFame: number | null = null;
	sortBy: string = "compatibility_ascending";
	ascendingOrder:boolean = true;

	selectedCityName = signal<string | null>(null);
	selectedLocation = signal<{lat: number, lon: number}| null>(null);
	userSearchCityList =	signal<cityObj[]>([]);
	userSearchCityListStr =  signal<string[]>([]);
	locationInputContainer = viewChild<Dropdown>('locationInputContainer');


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
	  ['compatibility_descending', 'descending compatibility'],
	  ['compatibility_ascending', 'ascending compatibility'],
	])

	loading = signal<boolean>(true)

	searchOptionPreview = signal<string>('');

  private activatedRoute = inject(ActivatedRoute);
  private viewContainer = inject(ViewContainerRef);

	interestWhitelistDropdown = viewChild<InterestDropdown>('interestWhitelistDropdownContainer');
	interestBlacklistDropdown = viewChild<InterestDropdown>('interestBlacklistDropdownContainer');

  previews = viewChildren<ProfilePreview>(ProfilePreview);


  ngOnInit(){  }


  private getDocHeight() {
    var D = document;
    return Math.max(
      D.body.scrollHeight, D.documentElement.scrollHeight,
      D.body.offsetHeight, D.documentElement.offsetHeight,
      D.body.clientHeight, D.documentElement.clientHeight
    );
  }

  private scrollChecker(){
    if(document.documentElement.scrollTop + document.documentElement.offsetHeight >= this.getDocHeight() - 100) { // make new search request when close to bottom of page
      this.searchForProfile(20, document.querySelectorAll(".profile-list-container app-profile-preview").length, false);
    }
  }

  ngAfterViewInit(){
    document.onscroll = ()=>{this.scrollChecker()};

    // Remove added blocklist element from whitelist
    this.interestBlacklistDropdown()?.onSelected.subscribe((value)=>{
      const tagName = value.get('value');
      this.interestWhitelistDropdown()?.selectedValues.update((list)=>{
        return list.filter((checked_interest)=>{
          return checked_interest.name != tagName;
        })
      });
      this.interestWhitelistDropdown()?.setDisplayedValues();
      this.setOptionPreview();
    });

    // Remove added whitelist element from blacklist
    this.interestWhitelistDropdown()?.onSelected.subscribe((value)=>{
      const tagName = value.get('value');
      this.interestBlacklistDropdown()?.selectedValues.update((list)=>{
        return list.filter((checked_interest)=>{
          return checked_interest.name != tagName;
        })
      });
      this.interestBlacklistDropdown()?.setDisplayedValues();
      this.setOptionPreview();
    });
  }

  ngOnDestroy(){
    document.onscroll = null;
  }

  constructor(private userService: UserService, private locationService: LocationService) {
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
    await this.searchForProfile();
	}

  updateSearch(){
    if (this.updateSearchTimeoutID){
      window.clearTimeout(this.updateSearchTimeoutID!);
      this.updateSearchTimeoutID = null;
    }
    this.updateSearchTimeoutID = window.setTimeout(()=>{this.searchForProfile()}, 1000)
  }

  async searchForProfile(size: number = 20, offset: number = 0, showLoad = true){
    if (showLoad){
      this.loading.set(true)
    }
    var whiteListInterestId: number[] = [];
    this.interestWhitelistDropdown()!.selectedValues().forEach((interest)=>{
      whiteListInterestId.push(interest.id);
    });

    var blackListInterestId: number[] = [];
    this.interestBlacklistDropdown()!.selectedValues().forEach((interest)=>{
      blackListInterestId.push(interest.id);
    });

    try{
      const newProfiles = await this.userService.searchProfile(size, offset,
        this.radius,
        this.minAge,
        this.maxAge,
        this.minFame,
        this.maxFame,
        whiteListInterestId,
        blackListInterestId,
        this.selectedLocation(),
        this.sortBy);
      if (offset == 0){
        this.profiles.set([]);
      }
      this.profiles.update((currentList)=>{
        return currentList.concat(newProfiles);
      })
    }
    catch(e){
      console.error(e);
    }
    if (showLoad){
      this.loading.set(false)
    }
    this.updateSearchTimeoutID = null;
  }

  createProfilePopup(userId: number){
    this.userService.getProfileById(userId).then((returnedUser)=>{
      if (returnedUser){
        var profile = this.viewContainer.createComponent(ProfileView);
        profile.setInput("userId", userId);
        profile.setInput("withLike", true);
        profile.setInput("withIgnore", true);
        profile.instance.user.set(returnedUser);
        profile.instance.loaded.set(true);

        profile.instance.onLike.subscribe(()=>{
          this.closeProfile(profile, returnedUser);
        })

        profile.instance.onIgnore.subscribe(()=>{
          this.closeProfile(profile, returnedUser);
        })

        profile.instance.onClickOutside.subscribe(()=>{
          this.closeProfile(profile, null);
        });

        profile.instance.onBlocked.subscribe(()=>{
          this.closeProfile(profile, returnedUser);
        });
      }
      else{
        window.history.replaceState('','',`/`);
      }
    });
  }

  closeProfile(profileComponent: ComponentRef<ProfileView>, userToRemove: User|null){
    if (userToRemove){
      this.removeProfile(userToRemove);
    }
    if (profileComponent.instance.blockPopup()){
      profileComponent.instance.blockPopup.set(false);
    }
    else{
      window.history.pushState('','',`/`);
      profileComponent.destroy();
    }
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

  async setCurrentLocationAsSearchOrigin() {
    this.locationService.getIpLocation((cityObj:cityObj)=>{
      let cityText = "";
      if (cityObj.city) cityText+= cityObj.city + ", ";
      if (cityObj.state) cityText+= cityObj.state + ", ";
      cityText+= cityObj.country

      this.selectedLocation.set({lat:cityObj.lat,lon:cityObj.lon});
      this.selectedCityName.set(cityText);

      this.userSearchCityList.set([]);
      this.userSearchCityListStr.set([]);
		  this.updateSearch();
    })
  }


	setSelectedCity(map: Map<string, any>){
	  const loc = this.userSearchCityList()[map.get('index')];
    this.selectedLocation.set({lat:loc.lat,lon:loc.lon});
    this.selectedCityName.set(this.userSearchCityListStr()[map.get('index')]);
		this.userSearchCityList.set([]);
		this.userSearchCityListStr.set([]);
		this.updateSearch();
	}


	async searchCity(){
    var e: HTMLInputElement = document.querySelector("#location-input")!;
		this.userSearchCityList.set([]);
		this.userSearchCityListStr.set([]);
		this.locationInputContainer()?.toggleDropDown();
		if (e.value != null && e.value.length > 3) { // todo make api call from back
      this.locationService.searchCity(e.value).then((response)=>{
        if (response.ok){
          response.json().then((obj)=>{
            const cities = obj['cities']
            Object.values(cities).forEach((city)=>{
              let cityObj = city as cityObj
              this.userSearchCityList.update((list) => {
                list.push(cityObj);
                return list;
              })
              let cityText = "";
              if (cityObj.city) cityText+= cityObj.city + ", ";
              if (cityObj.state) cityText+= cityObj.state + ", ";
              cityText+= cityObj.country;
              this.userSearchCityListStr.update((list) => {
                list.push(cityText);
                return list;
              })
            })
        		this.locationInputContainer()?.toggleDropDown();
          })
        }
      })
		}
	}
}
