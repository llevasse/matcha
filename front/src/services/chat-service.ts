import { Injectable } from '@angular/core';
import { UserService } from './userService';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private endpoint = `http://${import.meta.env.NG_APP_BACKEND_HOST}:3000/api/messages`;

  constructor(private userService: UserService){}

  sendMessage(values: {receiver_id: number, content: string}){
    this.userService.getClientUser().then((user)=>{
      if (user){// chat message need be send in this format : `{sender_id}->{receiver_id}:${message}`
        user.ws?.next({message: `${user.id}->${values.receiver_id}:${values.content}`})
        // user.ws?.send(`${user.id}->${values.receiver_id}:${values.content}`);
      }
    })
    return fetch(`${this.endpoint}/`, {
      method: 'POST',
      headers : {
        "Authorization":"Bearer " + localStorage.getItem('token'),
        'content-type': 'application/json',
      },
      body: JSON.stringify(values)
    })
  }

  getMessages(user_id: number, limit:number = 50, offset:number = 0){
    return fetch(`${this.endpoint}/conversation/${user_id}?limit=${limit}&offset=${offset}`, {
      headers : {
        "Authorization":"Bearer " + localStorage.getItem('token'),
        'content-type': 'application/json',
      },
    })
  }
}
