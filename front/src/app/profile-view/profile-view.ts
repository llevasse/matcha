import { Component, ElementRef, inject, Inject, input, output, signal, ViewContainerRef, ViewRef } from '@angular/core';
import { User } from '../core/class/user';
import { ActivatedRoute, Router } from '@angular/router';
import { ImageViewer } from '../core/image-viewer/image-viewer';
import { UserService } from '../../services/userService';
import { Chat } from './chat/chat';
import { createNotificationFromWsObject } from '../core/class/notification';
import { notifType } from '../utilities/utils';

@Component({
  selector: 'app-profile-view',
  imports: [],
  templateUrl: './profile-view.html',
  styleUrl: './profile-view.scss'
})
export class ProfileView {
  loaded = signal(false);
  userId = input.required<number>()
  withChat = input(false)
  withUnlike = input(false)
  user = signal<User>(new User());  // user should be set in parent for now !
  clientUser:User|null = null;
  isOnline = signal(false);

  onClickOutside = output();
  onUnlike = output();

  ngOnInit(){
    if (this.activatedRoute.snapshot.url.length > 3 && this.activatedRoute.snapshot.url[3].path == "chat"){
      this.openChat();
    }
  }

  ngOnDestroy(){
    this.clientUser?.ws?.next({message: `unwatch : ${this.clientUser.id}->${this.userId()}`})
  }

  private viewContainer = inject(ViewContainerRef);
  private activatedRoute = inject(ActivatedRoute);
  private ref = inject(ElementRef);

  constructor(private userService: UserService) {
    //TODO call API to add profile to user history
    userService.getClientUser().then((user)=>{
      if (user){
        this.clientUser = user;
        this.clientUser.ws?.next({message: `watch : ${user.id}->${this.userId()}`})
        this.clientUser.ws?.asObservable().pipe().subscribe({
          next: (msg)=>{
            const notif = createNotificationFromWsObject(msg);
            if (notif.senderId == this.userId()){
              if (notif.type == notifType.ONLINE){
                this.isOnline.set(true);
              }
              else if (notif.type == notifType.OFFLINE){
                this.isOnline.set(false);
              }
              this.loaded.set(false);
              this.loaded.set(true);
            }
          }
        });
      }

    })
    this.ref.nativeElement.addEventListener('click', (e: any)=>{
      if ((e.target as HTMLElement).closest('app-profile-view > .container') == null){
        this.onClickOutside.emit();
      }
    });
  }

  viewImage(event: PointerEvent, index: number){
    event.preventDefault()

    var imageViewer = this.viewContainer.createComponent(ImageViewer);
    imageViewer.instance.image.set(this.user().photos[index]);

    imageViewer.instance.onClickOutside.subscribe(()=>{
      imageViewer.destroy();
    });
  }

  openChat(){
    history.pushState('','', `/matches/profile/${this.userId()}/chat`);

    var chat = this.viewContainer.createComponent(Chat);
    chat.setInput("userId", this.userId());
    chat.instance.onClickOutside.subscribe(()=>{
      chat.destroy();
      this.clientUser?.ws?.next({message: `unwatch : ${this.clientUser.id}->${this.userId()}`});
      history.pushState('','', `/matches/profile/${this.userId()}`);
    });
  }

  unlikeUser(){
    this.onUnlike.emit();
  }
}
