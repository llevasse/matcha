import { InterestService } from './../../../services/interestService';
import { UserService } from './../../../services/userService';
import { afterEveryRender, Component, signal, viewChild } from '@angular/core';
import { Dropdown } from "../../core/dropdown/dropdown";
import { ProfileImageInput } from "../../profile-image-input/profile-image-input";
import { User } from '../../core/class/user';
import { InterestDropdown } from "./interest-dropdown/interest-dropdown";
import { Interest } from '../../core/class/interest';

@Component({
	selector: 'app-edit-profile',
	imports: [Dropdown, ProfileImageInput, InterestDropdown],
	templateUrl: './edit-profile.html',
	styleUrl: './edit-profile.scss',

})
export class EditProfile {
	loading = signal<boolean>(true)
	loaded = false;
	user: User = new User();
	tmpUser = signal<User>(new User());

	userCity =	signal("");

	userSearchCityList =	signal<Map<string, any>[]>([]);
	userSearchCityListStr =  signal<string[]>([]);

	locationInputContainer = viewChild<Dropdown>('locationInputContainer');
	interestDropdown = viewChild<InterestDropdown>('interestDropdownContainer');
	imagesInput = viewChild<ProfileImageInput>('imageContainer');

	maxBirthDay = new Date();

	async getUserProfile(){
    var tmpUser: User|null = await this.userService.getClientUser().then((value)=>{return value});
    if (tmpUser == null){
      console.error("Could not get client user");
      // this.router.navigate(['/login']);
      return ;
    }
    this.user = tmpUser;

		this.maxBirthDay.setFullYear(this.maxBirthDay.getFullYear() - 18);

		this.tmpUser.update((user)=>{
      user.gender = this.user.gender;
      user.orientation = this.user.orientation;
      user.firstName = this.user.firstName;
      user.lastName = this.user.lastName;
      user.username = this.user.username;
      user.birthday = this.user.birthday;
      user.bio = this.user.bio;
      return user;
		})

		this.loading.set(false)
	}

	constructor(
	  private userService: UserService,
	  private interestService: InterestService,){
		this.user.createDummy();
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
	ngOnInit(){
		this.getUserCity();
	}

	processForm(event: SubmitEvent) {
		event.preventDefault();

		this.user.firstName = this.tmpUser().firstName || this.user.firstName;
		this.user.lastName = this.tmpUser().lastName || this.user.lastName;
		this.user.username = this.tmpUser().username || this.user.birthday;
		this.user.birthday = this.tmpUser().birthday || this.user.birthday;
		this.user.bio = this.tmpUser().bio || this.user.bio;
		this.user.gender = this.tmpUser().gender || this.user.gender;
		this.user.orientation = this.tmpUser().orientation || this.user.orientation;
		this.user.cityLat = this.tmpUser().cityLat || this.user.cityLat;
		this.user.cityLon = this.tmpUser().cityLon || this.user.cityLon;

		this.imagesInput()?.toBeeDeleted.forEach((image)=>{
			if (image.id){
				this.userService.deletePhoto(image.id);
			}
		})


    if (this.imagesInput() && this.imagesInput()?.images().length != 0 && this.imagesInput()!.images().at(0)){
      this.imagesInput()!.images().at(0)!.isMain = true;
      this.imagesInput()!.images().forEach((file)=>{
        if (file.isNew){
          console.log(file);
          if (!file.isMain)
            this.userService.uploadPhotos(file.file!);
          else{
            this.userService.uploadPhotos(file.file!).then((value)=>{
              (value as Response).json().then((obj)=>{
                var map = new Map<String, any>(Object.entries(obj));
                this.userService.setPhotosAsMain(Number.parseInt(map.get('id')));
              })
            });
          }
        }
      })
    }

		var interestToAdd: Interest[] = this.interestDropdown()!.selectedValues().filter((interest)=>{
			return this.interestDropdown()!.originalUserInterest().find((interestToTest)=>{return interest == interestToTest}) == undefined
		});

		var interestToRemove: Interest[] = this.interestDropdown()!.originalUserInterest().filter((interest)=>{
			return this.interestDropdown()!.selectedValues().find((interestToTest)=>{return interest == interestToTest}) == undefined
		});

		interestToAdd.forEach((interest)=>{
			this.interestService.assignUserAnInterest(interest.id);
		});
		interestToRemove.forEach((interest)=>{
			this.interestService.unassignUserAnInterest(interest.id);
		});

		this.userService.updateProfile({
      username: this.user.username,
      firstname: this.user.firstName,
      lastname: this.user.lastName,
			gender: this.user.gender,
			bio: this.user.bio,
			birthdate: this.user.birthday,
			city: this.userCity(),
			location_latitude: this.user.cityLat,
			location_longitude: this.user.cityLon,
			preferences: [this.user.orientation]
		});

		// this.router.navigate([`/`]);
		return false;
	}

	setGender(map: Map<string, any>){
		this.tmpUser.update((user)=>{user.gender = map.get('value'); return user});
	}


	setOrientation(map: Map<string, any>){
		this.tmpUser.update((user)=>{user.orientation = map.get('value'); return user});
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
			}
			this.userCity.set(this.user.cityStr);
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
}
