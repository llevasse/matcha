import { Component, ElementRef, HostListener, input, output, signal, forwardRef, inject, Inject, Signal, computed, SimpleChanges } from '@angular/core';

@Component({
  selector: 'app-dropdown',
  imports: [forwardRef(() => DropdownSelector)],
  templateUrl: './dropdown.html',
  styleUrl: './dropdown.scss',
})
export class Dropdown {
  constructor(private ref: ElementRef){ref = inject(ElementRef);}

  ngOnInit(){
    this.e = this.ref.nativeElement;
    this.selectedValues = this.values() ?? [];
    this.selectedValue = this.value() ?? "";
  }

  e:any = HTMLElement;

  value = input<string | null>(null)
  values = input<string[] | null>(null)
  inputId = input<string>("")
  options = input<string[]>([]);

  placeholder = input.required<string>();

  multiChoice = input(false);
  searchable = input(false);
  required = input(false);
  contentDirection = input('column');

  selectedValue: string = "";
  selectedValueIndex: number = 0;
  selectedValues: string[] = [];

  contentClass = signal("inactive");

  AutoSearchTimeout:number = 1000;
  AutoSearchId: NodeJS.Timeout | undefined;

  onSearch = output<void>();
  onSelected = output<Map<string, any>>();

  toggleDropDown(){
    if (this.contentClass() == ""  || this.options().length == 0){
      this.contentClass.set("inactive");
    }
    else{
      this.contentClass.set("");
    }
  }

  search(){
    this.options().length = 0;
    this.toggleDropDown();
    if (this.AutoSearchId != undefined){
      clearTimeout(this.AutoSearchId);
    }
    this.AutoSearchId = setTimeout(()=>{
      console.log('search');
      this.onSearch.emit();
      this.AutoSearchId = undefined;
    }, this.AutoSearchTimeout);
  }

  setSelectedValue(str: string, index: number){
    if (this.multiChoice() == false){
      this.selectedValue = str;
      this.onSelected.emit(new Map<string, any>([['value', str], ['index' , index]]));
    }
    else{
      var index = this.selectedValues.indexOf(str);
      if (index == -1){
        this.selectedValues.push(str);
      }
      else {
        this.selectedValues.splice(index, 1);
      }
      // this.selectedValue = this.selectedValues.join(', ');
      this.onSelected.emit(new Map<string, any>([['value', this.selectedValue], ['list', this.selectedValues]]));
      this.selectedValueIndex = index;
      this.contentClass.set("");
    }
  }

  onClick(event: any) {
    if(this.searchable()){
      if (this.options().length == 0 || event.target.closest("dropdown-selector") != null){
        this.contentClass.set("inactive");
      }
      else{
        this.contentClass.set("");
      }
      return;
    }
    if ((this.multiChoice() == true && event.target.classList.contains('container')) || this.multiChoice() == false){
      this.toggleDropDown();
    }
  }

  @HostListener('document:mousedown', ['$event']) closeDropdown(event: any){
    var closest: HTMLElement = event.target.closest("app-dropdown");
    if (closest == null || (this.e != closest)){
      this.contentClass.set("inactive");
    }
  }
}

@Component({
  selector: 'dropdown-selector',
  imports: [],
  template: `
  <div class="options-container" (click)="click()">
    <a>{{value()}}</a>
  </div>`,
  styleUrl: './dropdown.scss',
})
export class DropdownSelector {
  onClick = output<void>();
  value = input.required<string>();
  click(){
    this.onClick.emit();
  }
}
