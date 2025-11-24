export class MatchaNotification{
  constructor(message: string, raw_message: string, sender_id: number|null = null, receiver_id: number|null = null, type: string|null = null, profile_picture: string | null = null){
    this.message = message;
    this.rawMessage = raw_message;
    this.profilePicture = profile_picture;
    this.senderId = sender_id;
    this.receiverId = receiver_id;
    this.type = type;
  }
  senderId: number|null;
  receiverId: number|null;
  message!:string;
  rawMessage!:string
  profilePicture: string | null = null;
  type: string| null= null;
  action: () => void = ()=>{};
}

export function createNotificationFromWsObject(obj:any): MatchaNotification{
  const notif = new MatchaNotification("", "");
  if ((obj['type'] as string|undefined)){
    const type:string = obj['type'];
    const fromUserObj = JSON.parse(obj['from']);
    const username = fromUserObj['username'];

    notif.type = type;
    notif.senderId = fromUserObj['id'];
    notif.rawMessage = obj['content'];

    if (fromUserObj['profile_picture']){
      notif.profilePicture = `http://${import.meta.env.NG_APP_BACKEND_HOST}:3000${fromUserObj['profile_picture']}`
    }

    switch(type){
      case 'liked':
        notif.message = `${username} liked you`
        break;
      case 'match':
        notif.message = `It's a match with ${username}!`
        break;
      case 'message':
        const messageSplit = notif.rawMessage.split(':')
        const info = messageSplit[0].split("->");
        notif.senderId = Number.parseInt(info[0]);
        notif.receiverId = Number.parseInt(info[1]);
        notif.message = `New message from ${username}!`
        notif.message.split(":")
        break;
    }
  }
  return notif;
}
