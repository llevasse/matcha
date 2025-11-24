export class MatchaNotification{
  constructor(message: string, profile_picture: string | null = null){
    this.message = message;
    this.profile_picture = profile_picture;
  }
  message!:string;
  profile_picture: string | null = null;
  action: () => void = ()=>{};
}
