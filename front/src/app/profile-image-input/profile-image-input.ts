import { Component, createComponent, inject, signal, ViewContainerRef } from '@angular/core';
import { ImageViewer } from '../core/image-viewer/image-viewer';
import { ProfileImage } from '../core/class/profile-image';

@Component({
  selector: 'profile-image-input',
  templateUrl: './profile-image-input.html',
  styleUrl: './profile-image-input.scss'
})
export class ProfileImageInput {
  index: number = 0;
  images = signal(<ProfileImage[]>[]);
  toBeeDeleted: ProfileImage[] = [];

  private viewContainer = inject(ViewContainerRef);

  constructor(){
    this.images.update((list)=>{
      list.length = 5;
      return list;
    })
  }

  ngAfterViewInit(){
    this.index = this.images().length;
  }

  addImage(index:number){
    var input: HTMLInputElement | null = document.querySelector("#picture" + index);
    if (input){
      if (input.files != null){
        var image = new ProfileImage(URL.createObjectURL(input.files[0]));
        image.file = input.files[0];
        image.isNew = true;
        image.isMain = index == 0;
        this.images()[index] = image;
      }
    }
  }

  labelClick(event: PointerEvent, index: number){
    event.preventDefault()

    var imageViewer = this.viewContainer.createComponent(ImageViewer);
    imageViewer.instance.allowEditing.set(true);
    imageViewer.instance.image.set(this.images()[index]);

    imageViewer.instance.onDelete.subscribe(()=>{
      if (this.images()[index].isNew == false){
        this.toBeeDeleted.push(structuredClone(this.images()[index]));
      }
      this.images.update((images)=>{
        images.splice(index, 1)
        images.length = 5;
        images.fill(new ProfileImage(), images.length);
        return images
      })
    })

    imageViewer.instance.addToDeleteList.subscribe(()=>{
      if (this.images()[index].isNew == false){
        this.toBeeDeleted.push(structuredClone(this.images()[index]));
      }
    })

    imageViewer.instance.onClickOutside.subscribe(()=>{
      imageViewer.destroy();
    });
  }
}
