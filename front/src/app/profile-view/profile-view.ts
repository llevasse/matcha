import { LikesService } from './../../services/likesService';
import { Component, ElementRef, inject, Inject, input, output, signal, ViewContainerRef, ViewRef } from '@angular/core';
import { User } from '../core/class/user';
import { ActivatedRoute, Router } from '@angular/router';
import { ImageViewer } from '../core/image-viewer/image-viewer';
import { UserService } from '../../services/userService';
import { Chat } from './chat/chat';
import { createNotificationFromWsObject } from '../core/class/notification';
import { notifType } from '../utilities/utils';
import { BlockOrReportService } from '../../services/blockOrReportService';

@Component({
  selector: 'app-profile-view',
  imports: [],
  templateUrl: './profile-view.html',
  styleUrl: './profile-view.scss'
})
export class ProfileView {

  blockPopup = signal<boolean>(false);
  blockPopupResults = signal<boolean>(false);
  reportPopup = signal<boolean>(false);

  confirmBlock = signal(false);
  failBlock = signal(false);

  loaded = signal(false);
  userId = input.required<number>()
  withChat = input(false)
  withUnlike = input(false)

  withIgnore = input(false)
  withLike = input(false)

  user = signal<User>(new User());  // user should be set in parent for now !
  clientUser:User|null = null;
  isOnline = signal(false);

  onClickOutside = output();
  onUnlike = output();
  onLike = output();
  onIgnore = output();

  onBlocked = output();


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

  constructor(private userService: UserService, private likesService: LikesService, private blockOrReportService: BlockOrReportService) {
    //TODO call API to add profile to user history
    userService.getClientUser().then((user)=>{
      if (user){
        this.clientUser = user;
        userService.addProfileToHistory(this.userId());
        this.clientUser.ws?.next({message: `watch : ${user.id}->${this.userId()}`})
        this.clientUser.ws?.next({message: `viewed : ${user.id}->${this.userId()}`})
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
      if ((e.target as HTMLElement).closest('app-profile-view > .container') == null
      && (e.target as HTMLElement).closest('app-profile-view .popup-block-report') == null ){
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
    this.likesService.setUserAsUnliked(this.userId());
    this.onUnlike.emit();
  }

  likeUser(){
    this.likesService.setUserAsLiked(this.userId());
    this.onLike.emit();
  }

  ignoreUser(){
    this.onIgnore.emit();
  }

  openBlockPopup(){
    this.blockPopup.set(true);
  }

  errorMessage = signal<string | null>(null);

  async blockUser() {
    this.errorMessage.set(null);
    try {
      const response = await this.blockOrReportService.blockUser(this.userId());
      if (response.ok) {
        this.blockPopupResults.set(true);
      } else {
        this.errorMessage.set("An error occurred while blocking the user.");
      }
    } catch (error) {
      this.errorMessage.set("Network error. Please try again later.");
    }
  }

  async reportUser() {
    this.errorMessage.set(null);
    try {
      const response = await this.blockOrReportService.reportUser(this.userId());
      if (response.ok) {
        this.blockPopupResults.set(true);
      } else {
        this.errorMessage.set("An error occurred while reporting the user.");
      }
    } catch (error) {
      this.errorMessage.set("Network error. Please try again later.");
    }
  }

  closeBlockPopup() {
    this.blockPopup.set(false);
    this.blockPopupResults.set(false);
    this.errorMessage.set(null);
  }

  closeBlockPopupAndRedirect(){
    this.closeBlockPopup();
    this.onBlocked.emit();
  }

}
