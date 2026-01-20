import { LikesService } from './../../../services/likesService';
import { InterestService } from './../../../services/interestService';
import { UserService } from './../../../services/userService';
import { afterEveryRender, Component, signal, viewChild, ViewEncapsulation } from '@angular/core';
import { Dropdown } from "../../core/dropdown/dropdown";
import { ProfileImageInput } from "../../profile-image-input/profile-image-input";
import { User } from '../../core/class/user';
import { InterestDropdown } from "./interest-dropdown/interest-dropdown";
import { Interest } from '../../core/class/interest';
import { Router } from '@angular/router';
import { BlockOrReportService } from '../../../services/blockOrReportService';
import { ProfilePreview } from "../../profile-preview/profile-preview";

@Component({
	selector: 'app-edit-profile',
	imports: [Dropdown, ProfileImageInput, InterestDropdown, ProfilePreview],
	templateUrl: './edit-profile.html',
	styleUrl: './edit-profile.scss',
  encapsulation: ViewEncapsulation.None,
})
export class EditProfile {

	loading = signal<boolean>(true)
	loaded = false;
	user: User = new User();
	tmpUser = signal<User>(new User());

	userCity =	signal("");

	userSearchCityList =	signal<Map<string, any>[]>([]);
	userSearchCityListStr =  signal<string[]>([]);

	errorMessages = signal<string[]>([]);
	blockedProfiles = signal<User[]>([]);
	likedProfiles = signal<User[]>([]);

	locationInputContainer = viewChild<Dropdown>('locationInputContainer');
	interestDropdown = viewChild<InterestDropdown>('interestDropdownContainer');
	imagesInput = viewChild<ProfileImageInput>('imageContainer');

	maxBirthDay = new Date();

	allowedGenders = ['woman','man', 'non-binary', 'other','prefer not to say'];

	constructor(
	  private userService: UserService,
	  private blockService: BlockOrReportService,
	  private likeService: LikesService,
	  private interestService: InterestService,
	  private router: Router){
		this.user.photos = [];
		this.getUserProfile();

		afterEveryRender(()=>{
      if (!this.loaded && this.imagesInput() && this.interestDropdown()){
        this.imagesInput()!.images.set(this.user.photos);

        this.interestDropdown()!.originalUserInterest.set(Array.from(this.user.interest));
        this.interestDropdown()!.selectedValues.set(Array.from(this.user.interest));
        this.interestDropdown()!.activeSearchResultInSelectedValues.set(Array.from(this.user.interest));
        this.interestDropdown()!.placeholder.set(this.user.interest.join(", "));
        this.loaded = true;
      }
    });
	}
	ngOnInit(){}

	async getUserProfile(){
    var tmpUser: User|null = await this.userService.getClientUser();
    if (tmpUser == null){
      console.error("Could not get client user");
      // this.router.navigate(['/login']);
      return ;
    }
    this.user = tmpUser;

		this.maxBirthDay.setFullYear(this.maxBirthDay.getFullYear() - 18);

    this.tmpUser.set(tmpUser);

		if (tmpUser.cityStr == null){
  		this.getUserCity();
		}
		else{ // call if city was not set by user last time
      this.userCity.set(tmpUser.cityStr);
		}

		await this.getBlockedProfiles();
		await this.getLikedProfiles();

    this.loading.set(false);
	}

	async getBlockedProfiles(){
    this.blockedProfiles.set(await this.blockService.getBlockedUsers())
	}

	async getLikedProfiles(){
    this.likedProfiles.set(await this.likeService.getUsersLikedByClient())
	}

  destroyLikedProfile(user: User){
    this.likedProfiles.update((list)=>{
      return list.filter((checkedUser)=>{return checkedUser.id != user.id})
      ;
    })
  }

	async processForm(event: SubmitEvent) {
		event.preventDefault();

		this.errorMessages.set([]);

		this.imagesInput()?.toBeeDeleted.forEach((image)=>{
			if (image.id){
				this.userService.deletePhoto(image.id);
			}
		})


    if (this.imagesInput() && this.imagesInput()?.images().length != 0 && this.imagesInput()!.images().at(0)){
      this.imagesInput()!.images().at(0)!.isMain = true;
      this.imagesInput()!.images().forEach((file)=>{
        if (file.isNew){
          this.userService.uploadPhotos(file.file!).then(async (value)=>{
            const res = value as Response;
            if (!res.ok){
              this.errorMessages.update((list)=>{
                list.push("Error while uploading image");
                return list;
              });
            }
            else{
              file.isNew = false;
              if (file.isMain){
                var obj = await res.json()
                var map = new Map<String, any>(Object.entries(obj));
                const res2: Response = await this.userService.setPhotosAsMain(Number.parseInt(map.get('id')));
                if (!res2.ok){
                  this.errorMessages.update((list)=>{
                    list.push("Error while setting image as main");
                    return list;
                  });
                }
              }
            }
          });
        }
      })
    }

		var interestToAdd: Interest[] = this.interestDropdown()!.selectedValues().filter((interest)=>{
			return this.interestDropdown()!.originalUserInterest().find((interestToTest)=>{return interest == interestToTest}) == undefined
		});

		var interestToRemove: Interest[] = this.interestDropdown()!.originalUserInterest().filter((interest)=>{
			return this.interestDropdown()!.selectedValues().find((interestToTest)=>{return interest == interestToTest}) == undefined
		});

		interestToAdd.forEach(async (interest)=>{
			const res: Response = await this.interestService.assignUserAnInterest(interest.id);
			if (!res.ok){
        this.errorMessages.update((list)=>{
          list.push("Error while assigning interest");
          return list;
        });
      }
		});
		interestToAdd = [];
		interestToRemove.forEach(async (interest)=>{
		  const res: Response = await this.interestService.unassignUserAnInterest(interest.id);
			if (!res.ok){
        this.errorMessages.update((list)=>{
          list.push("Error while assigning interest");
          return list;
        });
      }
		});
		interestToRemove = [];
		this.userService.getClientUser().then((user)=>{
      if(user && this.interestDropdown()?.selectedValues()){
        user.interest = this.interestDropdown()!.selectedValues();
      }
		})

		const res: Response = await this.userService.updateProfile({
      username: this.tmpUser().username || this.user.username,
      firstname: this.tmpUser().firstName || this.user.firstName,
      lastname: this.tmpUser().lastName || this.user.lastName,
      email: this.tmpUser().email || this.user.email,
			gender: this.tmpUser().gender || this.user.gender,
			bio: this.tmpUser().bio || this.user.bio,
			birthdate: this.tmpUser().birthday || this.user.birthday,
			city: this.userCity(),
			location_latitude: this.tmpUser().cityLat || this.user.cityLat,
			location_longitude: this.tmpUser().cityLon || this.user.cityLon,
			preferences: this.tmpUser().preferences || this.user.preferences
		});
    if (!res.ok){
      const obj = await res.json();
      this.errorMessages.update((list)=>{
        list.push(`Error while updating value : ${obj['error']}`);
        return list;
      });
      this.loading.set(true);
      this.loading.set(false);
    }
    if (this.errorMessages().length === 0){
      this.router.navigate([`/`]);
    }
		return false;
	}

	removeBlockedProfile(user: User){
    this.blockedProfiles.update((list)=>{
      return list.filter((blockedUser)=>{return blockedUser.id != user.id});
    })
  }

	setGender(map: Map<string, any>){
		this.tmpUser.update((user)=>{user.gender = map.get('value'); return user});
	}

	setOrientation(map: Map<string, any>){
		this.tmpUser.update((user)=>{user.preferences = map.get('list'); return user});
	}

	setUsername(event: Event){
		this.tmpUser.update((user)=>{user.username = ((event as InputEvent).target as HTMLInputElement).value; return user});
	}

	setLastname(event: Event){
		this.tmpUser.update((user)=>{user.lastName = ((event as InputEvent).target as HTMLInputElement).value; return user});
	}

	setFirstname(event: Event){
		this.tmpUser.update((user)=>{user.firstName = ((event as InputEvent).target as HTMLInputElement).value; return user});
	}

	setEmail(event: Event){
		this.tmpUser.update((user)=>{user.email = ((event as InputEvent).target as HTMLInputElement).value; return user});
	}

	setBirthday(event: Event){
			this.tmpUser.update((user)=>{user.birthday = ((event as InputEvent).target as HTMLInputElement).value; return user});
	}

	setBio(event: Event){
		this.tmpUser.update((user)=>{user.bio = ((event as InputEvent).target as HTMLInputElement).value; return user});
	}

	async getUserCity() {
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
        this.userCity.set(this.user.cityStr!);
			}
		} catch (error: any) {
			console.error(error.message);
		}
	}

	setSelectedCity(map: Map<string, any>){
		this.userCity.set(this.userSearchCityListStr()[map.get('index')])
		this.tmpUser.update((user)=>{
		  user.cityStr = this.userSearchCityListStr()[map.get('index')];
      user.cityLon = this.userSearchCityList()[map.get('index')].get('lon') as number;
      user.cityLat = this.userSearchCityList()[map.get('index')].get('lat') as number;
		  return user
		});
		this.userSearchCityList.set([]);
		this.userSearchCityListStr.set([]);
	}


	async searchCity(){
		var e:HTMLInputElement = document.querySelector("#location-input")!;
		var API_KEY = import.meta.env.NG_APP_GEOCODING_API_KEY;
		this.userSearchCityList.set([]);
		this.userSearchCityListStr.set([]);
		this.locationInputContainer()?.toggleDropDown();
		if (e.value != null && e.value.length > 3){ // todo make api call from back
			const geocodingUrl = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(e.value)}&apiKey=${API_KEY}`;
			 fetch(geocodingUrl).then(response => response.json())
				.then(result => {
					Object.values(result['features']).forEach((value)=>{
						var obj = (value as any)['properties'];
						this.userSearchCityList.update((list) => {
							list.push(new Map([
								['city', obj['city']],
								['state', obj['state']],
								['country', obj['country']],
								['lon', obj['lon']],
								['lat', obj['lat']],
							]));
							return list;
						})
						this.userSearchCityListStr.update((list) => {
							list.push(`${obj['city']}, ${obj['state']}, ${obj['country']}`);
							return list;
						})
					});
					this.locationInputContainer()?.toggleDropDown();
				})
				.catch(error => console.log('error', error));
		}
	}

	toggleDropdown(event: PointerEvent){
    if (event.target instanceof HTMLElement){
      if (event.target.closest(".dropdown") == null){
        event.target.closest(".dropdown-container")?.querySelectorAll(".dropdown").forEach((element)=>{
          if (element.classList.contains("inactive")){
            element.classList.remove("inactive");
          }
          else{
            element.classList.add("inactive");
          }
        })
      }
    }
	}
}
