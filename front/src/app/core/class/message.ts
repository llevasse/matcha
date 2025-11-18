export class Message{
  constructor(content: string, id: number, senderId:number, receiverId: number, sentAt: Date, senderUsername: string){
    this.content = content;
    this.id = id;
    this.senderId = senderId;
    this.receiverId = receiverId;
    this.sentAt = sentAt;
    this.senderUsername = senderUsername;
  }

  content!: string;
  id!: number;
  senderId!: number;
  receiverId!: number;
  sentAt!: Date;
  senderUsername!: string;
}

Message.prototype.toString = function(){
  return `${this.content} at ${this.sentAt} : ${this.content}`
}
