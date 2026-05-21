import { catchError, of, timeout } from 'rxjs';

import { AccountService } from '@app/_services';

const publicAccountPaths = [
  '/account/login',
  '/account/register',
  '/account/forgot-password',
  '/account/reset-password',
  '/account/verify-email'
];

export function appInitializer(accountService: AccountService) {
  return () => {
    const path = window.location.pathname;

    if (publicAccountPaths.some(publicPath => path.startsWith(publicPath))) {
      return of(null);
    }

    return accountService.refreshToken()
      .pipe(
        timeout(10000),
        // catch error to start app on success or failure
        catchError(() => of(null))
      );
  };
}
