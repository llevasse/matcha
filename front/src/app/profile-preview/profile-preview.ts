import { UserService } from './../../services/userService';
import { Component, ElementRef, inject, input, output, signal, ViewRef } from '@angular/core';
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

  allowInteraction = input(true);

  constructor(private userService: UserService){};

  ngOnInit(){
  }

  likeUser(){
    this.userService.setUserAsLiked(this.user().id);
    this.onDestroy.emit();
  }

  dislikeUser(){
    this.onDestroy.emit();
  }
}
