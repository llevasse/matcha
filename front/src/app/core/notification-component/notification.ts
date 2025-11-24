import { Component, input, output } from '@angular/core';
import { MatchaNotification } from '../class/notification';

@Component({
  selector: 'app-notification',
  templateUrl: './notification.html',
  styleUrls: ['./notification.scss']
})
export class NotificationComponent{
  notification = input.required<MatchaNotification>();

  constructor() { }

  ngOnInit() {
  }
}
