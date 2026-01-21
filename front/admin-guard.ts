import { AuthService } from './src/services/authService';
import { inject } from '@angular/core';
import { type CanMatchFn } from '@angular/router';

export const adminGuard: CanMatchFn = async (route, state) => {
  const auth = inject(AuthService)

  return await auth.verify().then(async(value)=>{
    return value.json().then((obj)=>{
      return (obj['user']['is_admin'] == true);
    });
  });
};
