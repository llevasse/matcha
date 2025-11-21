import { Component, input } from '@angular/core';

@Component({
  selector: 'app-notification',
  templateUrl: './notification.html',
  styleUrls: ['./notification.scss']
})
export class NotificationComponent{
  profile_picture = input<string | null>(null);
  message = input.required<string>();

  constructor() { }

  ngOnInit() {
  }

}
