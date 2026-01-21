import { LikesService } from './../../services/likesService';
import { BlockOrReportService } from '../../services/blockOrReportService';
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

  constructor(private likesService: LikesService, private blockService: BlockOrReportService) { };

  ngOnInit() {
  }

  likeUser() {
    this.likesService.setUserAsLiked(this.user().id);
    this.onDestroy.emit();
  }

  unblockUser() {
    this.blockService.unblockUser(this.user().id);
    this.onDestroy.emit();
  }

  unlikeUser() {
    this.likesService.setUserAsUnliked(this.user().id);
    this.onDestroy.emit();
  }

  dislikeUser() {
    this.likesService.setUserAsDisliked(this.user().id);
    this.onDestroy.emit();
  }
}
