export class Interest{
  constructor(name: string, id: number, isNew: boolean = false){
    this.name = name;
    this.id = id;
    this.isNew = isNew;
  }

  name!: string;
  id!: number;
  isNew: boolean
}

Interest.prototype.toString = function(){
  return this.name
}
