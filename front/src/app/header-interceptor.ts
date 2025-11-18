import { HttpInterceptorFn } from '@angular/common/http';

export const headerInterceptor: HttpInterceptorFn = (req, next) => {
  if (typeof window !== "undefined"){
    const idToken = localStorage.getItem('token');

    if (idToken) {
      const cloned = req.clone({headers: req.headers.set("Authorization","Bearer " + idToken)});
      console.log(cloned);
      return next(cloned);
    }
  }
  return next(req);
};
