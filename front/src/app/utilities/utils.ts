import { User } from "../core/class/user";

export const notifType = {
  LIKED: 'liked',
  UNLIKED: 'unliked',
  MATCH: 'match',
  MESSAGE_SENT: 'message'
}

export async function getClientCity(clientUser: User) {
    const url = "http://ip-api.co/json/";
    try {
      if (Number.isNaN(clientUser.cityLat) || Number.isNaN(clientUser.cityLon)){
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Response status: ${response.status}`);
        }
        const result = await response.json();
        clientUser.cityStr = result['city'];
        clientUser.cityLon = result['lon'];
        clientUser.cityLat = result['lat'];
      }
    } catch (error: any) {
      console.error(error.message);
    }
    return clientUser;
  }
