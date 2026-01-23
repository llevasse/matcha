import { Injectable } from "@angular/core";

type cityObj = {city: string | undefined;
            state: string | undefined;
            country: string | undefined;
            lat: number; lon: number}


@Injectable({ providedIn: 'root' })
export class LocationService {
  baseUrl = `http://${import.meta.env.NG_APP_BACKEND_HOST}:3000`;
  private locationUrl = `${this.baseUrl}/api/location`;

  searchCity(locationName: string) {
    var params = `&content=${locationName}`;

    return fetch(`${this.locationUrl}/search?${params}`, {
      headers: {
        "Authorization": "Bearer " + localStorage.getItem('token'),
      }
    })
  }

  async getIpLocation(successCallback: Function) {
    navigator.geolocation.getCurrentPosition(async position => {
      const { latitude, longitude } = position.coords;
      fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`).then((response)=>{
        response.json().then((obj)=>{
          let cityName = (obj.address.suburb ? `${obj.address.suburb}, ` : "") + obj.address.city;
          let cityValue:cityObj = {
            city: cityName,
            state: obj.address.state,
            country: obj.address.country,
            lat: Number.parseFloat(obj.lat),
            lon: Number.parseFloat(obj.lon),
          }
          successCallback.apply(this, [cityValue]);
        })
      })
    }, async error => {
      const url = "http://ip-api.com/json/";
      try {
        const response = await fetch(url);
        if (response.ok) {
          response.json().then((obj)=>{
            let cityValue:cityObj = {
              city: obj['city'],
              state: obj['state'],
              country: obj['country'],
              lat: Number.parseFloat(obj.lat),
              lon: Number.parseFloat(obj.lon),
            }
            successCallback.apply(this, [cityValue]);
          });
        }
      } catch (error: any) {
        console.error(error.message);
      }
    }, {enableHighAccuracy: true});
  }
}
