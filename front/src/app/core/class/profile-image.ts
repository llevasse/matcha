export class ProfileImage{
  url: string | null = null;
  isMain: boolean = false;
  isNew: boolean = true;
  id : number | null = null;
  file: File | null = null;

  constructor(url: string = ""){this.url = url}
}
