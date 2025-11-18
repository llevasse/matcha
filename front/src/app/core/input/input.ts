import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-input',
  imports: [],
  templateUrl: './input.html',
  styleUrl: './input.scss'
})
export class Input {
  type = input<string>('text');
  placeholder = input<string>();
  prefill = input<string>("");
  autocomplete = input<string>("");
  label = input.required<string>();
  id = input.required<string>();
  required = input<boolean>(false);
  minInputLength = input<number>();

  minInputValue = input();
  maxInputValue = input();

}
