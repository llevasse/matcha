import { AuthService } from './../../../services/authService';
import { Component, output, forwardRef, input, signal } from '@angular/core';
import { Input } from '../../core/input/input';
import { Router } from '@angular/router';
import { UserService } from '../../../services/userService';

@Component({
  selector: 'app-login',
  imports: [Input, forwardRef(() => LoginSelector)],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class Login {
  constructor(private authService: AuthService, private router: Router, private userService: UserService){
    authService.logout();
  }

  ngAfterViewInit(){
    if (window.location.pathname.startsWith('/register')){
      this.activateSigninForm();
    }
  }

  loginErrorMessage = signal<String | null>(null);
  registerErrorMessage = signal<String | null>(null);

  activateLoginForm(){
    document.querySelector("#loginForm")?.classList.remove('inactive');
    document.querySelector("#signinForm")?.classList.add('inactive');
    history.replaceState('','', "/login");
  }


  activateSigninForm(){
    document.querySelector("#loginForm")?.classList.add('inactive');
    document.querySelector("#signinForm")?.classList.remove('inactive');
    history.replaceState('','', "/register");
  }

  async signInApiCall(event: SubmitEvent){
    event.preventDefault();
    var first_name = (document.querySelector("#register-first-name-input") as HTMLInputElement).value;
    var last_name = (document.querySelector("#register-last-name-input") as HTMLInputElement).value;
    var username = (document.querySelector("#register-username-input") as HTMLInputElement).value;
    var email = (document.querySelector("#register-mail-input") as HTMLInputElement).value;
    var password = (document.querySelector("#register-password-input") as HTMLInputElement).value;
    if (username && first_name && last_name && email && password){
      this.authService.register({username, firstname: first_name, lastname: last_name, email, password}).then((value)=>{
        if (value.ok){
          history.pushState('','', "/profile");
          this.router.navigate([`/profile`]);
        }
        else{
          if (value['error'] != null){
            this.loginErrorMessage.set(value['error']);
          }
          else{
            this.loginErrorMessage.set(value['message']);
          }
        }
      });
    }
  }

  async loginApiCall(event: SubmitEvent){
    event.preventDefault();
    var username = (document.querySelector("#login-username-input") as HTMLInputElement).value;
    var password = (document.querySelector("#login-password-input") as HTMLInputElement).value;
    if (username && password){
      this.authService.login({username: username, password}).then((value)=>{
        if (value.ok){
          this.userService.createClientUser().then((user)=>{
            if (user == null){
              return ;
            }
            this.router.navigate([user.isFilled() ? `/` : `/profile`]);
          })
        }
        else{
          (value as Response).json().then((value)=>{
            if (value['error'] != null){
              this.loginErrorMessage.set(value['error']);
            }
            else{
              this.loginErrorMessage.set(value['message']);
            }
          })
        }
      });
    }
  }
}


@Component({
  selector: 'login-selector',
  template : `<a (click)="click()">{{value()}}</a>`,
  styleUrl: './login.scss'
})

export class LoginSelector{
  onClick = output<void>();
  value = input.required<String>();
  click(){
    this.onClick.emit();
  }
}
