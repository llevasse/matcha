import { InterestService } from './../../../services/interestService';
import { UserService } from './../../../services/userService';
import { afterEveryRender, Component, signal, viewChild } from '@angular/core';
import { Dropdown } from "../../core/dropdown/dropdown";
import { ProfileImageInput } from "../../profile-image-input/profile-image-input";
import { User } from '../../core/class/user';
import { InterestDropdown } from "./interest-dropdown/interest-dropdown";
import { Interest } from '../../core/class/interest';
import { Router } from '@angular/router';

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

	allowedGenders = ['woman','man', 'non-binary', 'other','prefer not to say'];

	async getUserProfile(){
    var tmpUser: User|null = await this.userService.getClientUser().then((value)=>{return value});
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
		// console.log(tmpUser);
		this.loading.set(false)

	}

	constructor(
	  private userService: UserService,
	  private interestService: InterestService,
	  private router: Router){
		// this.user.createDummy();
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
	}

	processForm(event: SubmitEvent) {
		event.preventDefault();

		this.imagesInput()?.toBeeDeleted.forEach((image)=>{
			if (image.id){
				this.userService.deletePhoto(image.id);
			}
		})


    if (this.imagesInput() && this.imagesInput()?.images().length != 0 && this.imagesInput()!.images().at(0)){
      this.imagesInput()!.images().at(0)!.isMain = true;
      this.imagesInput()!.images().forEach((file)=>{
        if (file.isNew){
          if (!file.isMain){
            this.userService.uploadPhotos(file.file!);
          }
          else{
            this.userService.uploadPhotos(file.file!).then(async (value)=>{
              var obj = await (value as Response).json()
              var map = new Map<String, any>(Object.entries(obj));
              return await  this.userService.setPhotosAsMain(Number.parseInt(map.get('id')));
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
      username: this.tmpUser().username || this.user.username,
      firstname: this.tmpUser().firstName || this.user.firstName,
      lastname: this.tmpUser().lastName || this.user.lastName,
			gender: this.tmpUser().gender || this.user.gender,
			bio: this.tmpUser().bio || this.user.bio,
			birthdate: this.tmpUser().birthday || this.user.birthday,
			city: this.userCity(),
			location_latitude: this.tmpUser().cityLat || this.user.cityLat,
			location_longitude: this.tmpUser().cityLon || this.user.cityLon,
			preferences: this.tmpUser().preferences || this.user.preferences
		});

		this.router.navigate([`/`]);
		return false;
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
}
