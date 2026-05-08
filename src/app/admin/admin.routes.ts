import { Routes } from '@angular/router';

import { AdminComponent } from './admin.component';

export const adminRoutes: Routes = [
  { path: '', component: AdminComponent },
  { path: 'accounts', loadChildren: () => import('./accounts/accounts.module').then(x => x.AccountsModule) }
];
