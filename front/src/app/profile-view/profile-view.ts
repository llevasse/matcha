import { Component, ElementRef, inject, Inject, input, output, signal, ViewContainerRef, ViewRef } from '@angular/core';
import { User } from '../core/class/user';
import { ActivatedRoute } from '@angular/router';
import { ImageViewer } from '../core/image-viewer/image-viewer';
import { UserService } from '../../services/userService';
import { Chat } from './chat/chat';

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
  user = signal<User>(new User);

  onClickOutside = output();

  ngOnInit(){
    this.userService.getProfileById(this.userId()).then((user)=>{
      if (user){
        this.user.set(user);
      }
      this.loaded.set(true);
    });
    if (this.activatedRoute.snapshot.url.length > 3 && this.activatedRoute.snapshot.url[3].path == "chat"){
      this.openChat();
    }
  }

  private viewContainer = inject(ViewContainerRef);
  private activatedRoute = inject(ActivatedRoute);
  private ref = inject(ElementRef);

  constructor(private userService: UserService) {
    //TODO call API to add profile to user history
    this.ref.nativeElement.addEventListener('click', (e: any)=>{
      if ((e.target as HTMLElement).closest('app-profile-view > .container') == null){
        this.onClickOutside.emit();
      }
    });

    console.log(this.activatedRoute.snapshot.url);

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
      history.pushState('','', `/matches/profile/${this.userId()}`);  
    });
  }
}
