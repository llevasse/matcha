import { LikesService } from './../../services/likesService';
import { Component, input, output, signal } from '@angular/core';
import { User } from '../core/class/user';


@Component({
  selector: 'app-profile-preview',
  imports: [],
  templateUrl: './profile-preview.html',
  styleUrl: './profile-preview.scss'
})
export class ProfilePreview {
  user = input.required<User>()
  id = input.required<number>()

  distance = signal<number>(0);

  onClick = output<User>()
  onDestroy = output<void>()

  allowLike = input(true);
  allowIgnore = input(true);
  allowUnblock = input(false);
  allowUnlike = input(false);

  constructor(private likesService: LikesService){};

  ngOnInit(){
  }

  likeUser(){
    this.likesService.setUserAsLiked(this.user().id);
    this.onDestroy.emit();
  }

  unblockUser(){
    //TODO unblock api call
    this.onDestroy.emit();
  }

  unlikeUser(){
    this.likesService.setUserAsUnliked(this.user().id);
    this.onDestroy.emit();
  }

  ignoreUser(){
    this.onDestroy.emit();
  }
}
