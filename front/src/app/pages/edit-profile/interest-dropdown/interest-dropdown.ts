import { Component, ElementRef, HostListener, input, output, signal, forwardRef, inject, Inject, Signal, computed, SimpleChanges } from '@angular/core';
import { InterestService } from '../../../../services/interestService';
import { Interest } from '../../../core/class/interest';


@Component({
  selector: 'app-interest-dropdown',
  templateUrl: './interest-dropdown.html',
  styleUrl: './interest-dropdown.scss'
})
export class InterestDropdown {
  constructor(private ref: ElementRef, private interestService: InterestService){
    ref = inject(ElementRef);
    this.getAllInterest();
  }

  ngOnInit(){
    this.e = this.ref.nativeElement;
  }

  loading = signal<boolean>(true)

  e:any = HTMLElement;

  allInterest = signal<Interest[]>([]);
  activeSearchResult = signal<Interest[]>([]);
  activeSearchResultInSelectedValues = signal<Interest[]>([]);
  selectedValues = signal<Interest[]>([]);
  originalUserInterest = signal<Interest[]>([]);


  placeholder = signal("Interest");

  contentClass = signal("inactive");

  onSelected = output<Map<string, any>>();

  getAllInterest(){
    this.interestService.getAllInterest().then((value)=>{
      (value as Response).json().then((object)=>{
        var array = Array.from(object);

        this.allInterest.update((list)=>{
          array.forEach((tag)=>{
            var map: Map<string, any> = new Map(Object.entries(tag as Map<string, any>));
            list.push(new Interest(map.get("name"), map.get("id")));
          })
          return list;
        });
        this.setDropdownValues()
      })
    }).finally(()=>{
      this.loading.set(false);
    })
  }

  keydown(event: KeyboardEvent){
    var input =(event.target as HTMLInputElement).value;
    if (event.key === 'Enter'){
      input = input.trim().toLowerCase();
      while (input.startsWith('#')){
        input = input.substring(1)
      }
      input = "#" + input;
      this.interestService.createInterest(input).then((tmp)=>{
        var response: Response = tmp as Response;
        if (response.ok){
          response.json().then((value)=>{
            var map = new Map(Object.entries(value as Map<string, any>));
            var obj: Interest = new Interest(map.get("name"), map.get("id"));
            this.allInterest.update((list)=>{list.push(obj); return list});
            this.selectedValues.update((list)=>{list.push(obj); return list});
            this.setDropdownValues();
          })
        }
      });
      (event.target as HTMLInputElement).value = "";
    }
    else{
      this.activeSearchResult.set(
        this.allInterest().filter((current_string)=>{
          return (current_string.name.includes(input) && (this.selectedValues().find((item)=>{
            return item.name == current_string.name
          }) == undefined))
        })
      );

      this.activeSearchResultInSelectedValues.set(
        this.selectedValues().filter((currentString)=>{
          return (currentString.name.includes(input));
        })
      );
    }
  }

  setDropdownValues(){
    this.activeSearchResult.set(this.allInterest().filter((value)=>{
      return (this.selectedValues().find((item)=>{
        return item.name == value.name
      }) == undefined)
    }));
    this.activeSearchResultInSelectedValues.set(this.selectedValues());
  }

  setSelectedValue(element: Interest){
    this.selectedValues.update((list)=>{
      var index = list.indexOf(element);
      if (index == -1){
        list.push(element);
      }
      else {
        list.splice(index, 1);
      }
      return list;
    })
    var str = "";
    this.selectedValues().forEach((value, index)=>{
      str += `${value.name}${index == this.selectedValues().length - 1 ? "" : ", "}`;
    })
    this.placeholder.set(str);
    this.setDropdownValues()

    this.onSelected.emit(new Map<string, any>([['value', str], ['list', this.selectedValues]]));
  }

  @HostListener('document:mousedown', ['$event']) closeDropdown(event: any){
    var closest: HTMLElement = event.target.closest("app-interest-dropdown");
    if (closest == null || (this.e != closest)){
      this.contentClass.set("inactive");
    }
  }
}
