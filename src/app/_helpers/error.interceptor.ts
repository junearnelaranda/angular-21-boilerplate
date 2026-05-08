import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { AccountService } from '@app/_services/account.service';

export const errorInterceptor: HttpInterceptorFn = (request, next) => {
  const accountService = inject(AccountService);

  return next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      if ([401, 403].includes(error.status) && accountService.accountValue) {
        accountService.logout();
      }

      const message = error.error?.message || error.statusText || 'Something went wrong';
      return throwError(() => new Error(message));
    })
  );
};
