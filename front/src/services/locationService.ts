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

  async getIP() {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip
    } catch (error) {
      console.error('Error fetching IP address:', error);
      return null
    }
  }

  async getIpLocation(successCallback: Function) {
    navigator.geolocation.getCurrentPosition(async position => {
      const { latitude, longitude } = position.coords;
      fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`).then((response)=>{
        response.json().then((obj)=>{
          let cityName = ""
          if (obj.address.suburb){
            cityName += obj.address.suburb;
          }
          else if (obj.address.village){
            cityName += obj.address.village;
          }
          if (obj.address.city){
            if (cityName != ""){
              cityName += ", "
            }
            cityName += obj.address.city;
          }
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
      let ip = await this.getIP();
      if (!ip) return;
      var params = `&ip=${ip}`;

      return fetch(`${this.locationUrl}/locate?${params}`, {
        headers: {
          "Authorization": "Bearer " + localStorage.getItem('token'),
        }
      }).then(response=>{
        if (response.ok){
          response.json().then(obj=>{
            let locationObj = obj['location'];
            if (locationObj){
              let cityName = locationObj['city']['name'];
              let countryName = locationObj['country']['name'];

              let location = locationObj['location'];
              let lat = location['latitude']
              let lon = location['longitude']

              let cityValue:cityObj = {
                city: cityName,
                state: undefined,
                country: countryName,
                lat: lat,
                lon: lon,
              }
              successCallback.apply(this, [cityValue]);
            }
          })
        }
      })
    }, {enableHighAccuracy: true});
  }
}
