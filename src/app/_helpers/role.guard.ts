import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { Role } from '@app/_models/role';
import { AccountService } from '@app/_services/account.service';

export const roleGuard: CanActivateFn = route => {
  const account = inject(AccountService).accountValue;
  const router = inject(Router);
  const roles = route.data['roles'] as Role[] | undefined;

  if (!roles?.length || (account && roles.includes(account.role))) {
    return true;
  }

  router.navigate(['/']);
  return false;
};
