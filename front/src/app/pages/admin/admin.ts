import { Component } from '@angular/core';
import { AdminService } from '../../../services/adminService';

@Component({
  selector: 'app-admin',
  imports: [],
  templateUrl: './admin.html',
  styleUrl: './admin.scss',
})
export class Admin {
  constructor(private adminService: AdminService){};

  createUsers(){
    const numberInput = document.querySelector("#createUsersNumberInput")
    const passowrdInput = document.querySelector("#createUsersPasswordInput")
    if (numberInput instanceof HTMLInputElement && passowrdInput instanceof HTMLInputElement){
      this.adminService.createRandomUsers(Number.parseInt(numberInput.value), passowrdInput.value);
    }
  }
}
