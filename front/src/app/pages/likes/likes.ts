import { LikesService } from './../../../services/likesService';
import { Component, ComponentRef, inject, signal, viewChildren, ViewContainerRef } from '@angular/core';
import { User } from '../../core/class/user';
import { ProfilePreview } from "../../profile-preview/profile-preview";
import { ActivatedRoute } from '@angular/router';
import { ProfileView } from '../../profile-view/profile-view';
import { UserService } from '../../../services/userService';
import { createNotificationFromWsObject } from '../../core/class/notification';
import { notifType } from '../../utilities/utils';

@Component({
  selector: 'app-likes',
  imports: [ProfilePreview],
  templateUrl: './likes.html',
  styleUrl: './likes.scss'
})
export class Likes {
  previews = viewChildren<ProfilePreview>(ProfilePreview);
  user!: User;
  loaded = signal(false);
  profiles = signal<User[]>([])

  private activatedRoute = inject(ActivatedRoute);
  private viewContainer = inject(ViewContainerRef);

  constructor(private userService: UserService, private likesService: LikesService) {
    ;
    this.getUserProfile();

    if (this.activatedRoute.snapshot.url.length > 1 && this.activatedRoute.snapshot.url[1].path == "profile") {
      this.createProfilePopup(Number.parseInt(this.activatedRoute.snapshot.url[2].path));
    }
  }

  async getUserProfile() {
    var tmpUser: User | null = await this.userService.getClientUser();
    if (tmpUser == null) {
      return;
    }
    this.user = tmpUser;
    this.profiles.set(await this.likesService.getUsersWhoLikedClient());
    // Update liked list on new match or got unliked
    this.user.ws?.asObservable().pipe().subscribe(async (obj) => {
      const notif = createNotificationFromWsObject(obj)
      if (notif.type == notifType.LIKED || notif.type == notifType.UNLIKED) {
        this.profiles.set(await this.likesService.getUsersWhoLikedClient());
        this.loaded.set(false)
        this.loaded.set(true)
      }
    })
    this.loaded.set(true)
  }

  createProfilePopup(userId: number) {
    this.likesService.getProfileById(userId).then((returnedUser) => {
      if (returnedUser) {
        var profile = this.viewContainer.createComponent(ProfileView);
        profile.setInput("userId", userId);
        profile.setInput("withLike", true);
        profile.setInput("withIgnore", true);
        profile.instance.user.set(returnedUser);
        profile.instance.loaded.set(true);

        profile.instance.onClickOutside.subscribe(() => {
          this.closeProfile(profile, null);
        });

        profile.instance.onLike.subscribe(() => {
          this.closeProfile(profile, returnedUser);
        });

        profile.instance.onDislike.subscribe(() => {
          this.closeProfile(profile, returnedUser);
        });

        profile.instance.onBlocked.subscribe(() => {
          this.closeProfile(profile, returnedUser);
        });
      }
      else {
        window.history.replaceState('', '', `/likes`);
      }
    })
  }

  closeProfile(profileComponent: ComponentRef<ProfileView>, userToRemove: User | null) {
    if (userToRemove) {
      this.removeProfile(userToRemove);
    }
    if (profileComponent.instance.blockPopup()) {
      profileComponent.instance.blockPopup.set(false);
    }
    else {
      window.history.pushState('', '', `/likes`);
      profileComponent.destroy();
    }
  }

  seeProfile(user: User) {
    window.history.pushState('', '', `/likes/profile/${user.id}`);
    this.createProfilePopup(user.id);
  }

  removeProfile(user: User) {
    this.profiles.update((list) => {
      return list.filter((checkedUser) => { return checkedUser.id != user.id });
    })
  }
}
