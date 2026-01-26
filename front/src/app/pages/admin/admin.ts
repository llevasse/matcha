import { Component } from '@angular/core';
import { AdminService } from '../../../services/adminService';

@Component({
  selector: 'app-admin',
  imports: [],
  templateUrl: './admin.html',
  styleUrl: './admin.scss',
})
export class Admin {
  constructor(private adminService: AdminService) { };

  createUsers() {
    const numberInput = document.querySelector("#createUsersNumberInput")
    const passowrdInput = document.querySelector("#createUsersPasswordInput")
    if (numberInput instanceof HTMLInputElement && passowrdInput instanceof HTMLInputElement) {
      this.adminService.createRandomUsers(Number.parseInt(numberInput.value), passowrdInput.value);
    }
  }

  createMatch() {
    const username1 = document.querySelector<HTMLInputElement>("#usernameMatch1");
    const username2 = document.querySelector<HTMLInputElement>("#usernameMatch2");
    console.log("username : ", username1, username2);

    if (!username1 || !username2) return;
    console.log("f1");

    const u1 = username1.value.trim();
    const u2 = username2.value.trim();

    if (!u1 || !u2) return;
    console.log("f1");

    this.adminService.createMatch(u1, u2);
  }

}
