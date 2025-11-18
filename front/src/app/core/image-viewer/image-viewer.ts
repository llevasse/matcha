import { Component, ElementRef, inject, input, output, signal } from '@angular/core';
import { ProfileImage } from '../class/profile-image';

@Component({
  selector: 'app-image-viewer',
  imports: [],
  templateUrl: './image-viewer.html',
  styleUrl: './image-viewer.scss'
})
export class ImageViewer {
  image = signal<ProfileImage>(new ProfileImage);
  allowEditing = signal<boolean>(false);
  onClickOutside = output();
  onDelete = output();
  addToDeleteList = output();

  private ref = inject(ElementRef);

  constructor() {
    this.ref.nativeElement.addEventListener('click', (e: any)=>{
      if ((e.target as HTMLElement).closest('app-image-viewer .container') == null){
        this.onClickOutside.emit();
      }
    });
  }

  preventClick(event: PointerEvent){
    event.preventDefault();
  }

  openFileSelector(){
    var imageInput : HTMLInputElement | null = document.querySelector("#picture-input");
    if (imageInput){
      imageInput.click()
    }
  }

  onChange(){
    var input: HTMLInputElement | null = document.querySelector("#picture-input");
    if (input != null){
      if (input.files != null){
        this.addToDeleteList.emit();
        this.image.update((image)=>{
          image.file = input!.files![0];
          image.isNew = true;
          image.url = URL.createObjectURL(image.file);
          return image;
        });
      }
    }
  }

  deletePhoto(){
    this.onDelete.emit();
    this.onClickOutside.emit();
  }
}
