import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { AccountService } from '@app/_services/account.service';
import { environment } from '@environments/environment';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const account = inject(AccountService).accountValue;
  const isApiUrl = request.url.startsWith(environment.apiUrl);

  if (account?.jwtToken && isApiUrl) {
    request = request.clone({
      setHeaders: { Authorization: `Bearer ${account.jwtToken}` }
    });
  }

  return next(request);
};
