import { afterEveryRender, Component, ElementRef, inject, input, output, signal, ViewChild, viewChild } from '@angular/core';
import { ChatService } from '../../../services/chat-service';
import { Message } from '../../core/class/message';
import { UserService } from '../../../services/userService';

@Component({
  selector: 'app-chat',
  imports: [],
  templateUrl: './chat.html',
  styleUrl: './chat.scss',
})
export class Chat {
  private nbOfMessagesPerRequest:number = 50;
  loaded = signal(false);
  messages = signal<Message[]>([]);

  onClickOutside = output();
  userId = input<number>(0);
  private ref = inject(ElementRef);

  private chatContentContainer: HTMLDivElement | null = null;
  private needScrolling: boolean = true;

  constructor(private chatService: ChatService, private userService: UserService){
    this.ref.nativeElement.addEventListener('click', (e: any)=>{
      if ((e.target as HTMLElement).closest('app-chat .container') == null){
        this.onClickOutside.emit();
      }
    });

    afterEveryRender(()=>{
      if (!this.chatContentContainer){
        this.chatContentContainer = (document.getElementById("chat-content-container") as HTMLDivElement | null);
        if (this.chatContentContainer){
          this.chatContentContainer.addEventListener('scroll', ()=>{
            if (this.chatContentContainer!.scrollTop == 0){
              console.log("get previous messages");
              this.chatService.getMessages(this.userId(), this.nbOfMessagesPerRequest, this.messages().length).then((response)=>{
                this.processReceivedMessageListResponse(response).then((response)=>{
                  this.messages.set(response.concat(this.messages()));
                  this.loaded.set(true);
                });
              })
            }
          })
        }
      }
      if (this.chatContentContainer){
        if (this.needScrolling){
          this.chatContentContainer.scrollTop = this.chatContentContainer.scrollHeight;
        }
        this.needScrolling = false;
      }
    })
  }

  private scrollEventHandler(event: Event){
    console.log((event.target as HTMLDivElement).scrollTop);

  }

  ngOnInit(){
    this.chatService.getMessages(this.userId(), this.nbOfMessagesPerRequest).then((response)=>{
      this.processReceivedMessageListResponse(response).then((response)=>{
        this.messages.set(this.messages().concat(response));
        this.loaded.set(true);
      });
    })
    this.userService.getClientUser().then((user)=>{
      if (user && user.ws){ // chat received must be in that format : `${sender_id}:${message}`
        user.ws.asObservable().pipe().subscribe((obj) => {
          var split = obj['message'].split(":");
          const senderId = Number.parseInt(split[0]);
          var mess = new Message(split[1], 0, senderId, senderId == this.userId() ? user.id : this.userId(), new Date(Date.now()), "");
          if (mess.content != undefined && (mess.senderId  == this.userId() || mess.senderId == user.id)){
            this.needScrolling = true;
            this.messages().push(mess); //for some reason, this doesn't call the `checkChanges` function of angular at the right time
            this.loaded.set(false);
            this.loaded.set(true);
          }
        })
      }
    })
  }

  ngDoCheck(){
    console.log("check");
  }

  ngOnChanges(){
    console.log("change");
  }

  private async processReceivedMessageListResponse(response: Response){
    var list: Message[] = []
    if (response.ok){
      await response.json().then((obj)=>{
        Array.from(obj).forEach((element)=>{
          const map = new Map<string, any>(Object.entries(element as []));
          const mess = new Message(
            map.get('content'),
            map.get('id'),
            map.get('sender_id'),
            map.get('receiver_id'),
            new Date(map.get('sent_at')),
            map.get('sender_username'),
          );
          list.push(mess);
        })
      })
    }
    return list;
  }

  inputHandler(event: KeyboardEvent){
    const inputContent = (event.target as HTMLInputElement).value
    if (event.key == "Enter"){
      this.chatService.sendMessage({
        receiver_id: this.userId(),
        content: inputContent,
      }).then((response)=>{
        if (response.ok){
          response.json().then((obj)=>{
            const map = new Map<string, any>(Object.entries(obj));
            this.needScrolling = true;
          })
        }
      });
      (event.target as HTMLInputElement).value = "";
    }
  }
}
