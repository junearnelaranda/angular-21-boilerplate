import { Routes } from '@angular/router';

import { AuthGuard } from '@app/_helpers/auth.guard';
import { Role } from '@app/_models/role';
import { HomeComponent } from '@app/home/home.component';

export const appRoutes: Routes = [
  { path: '', component: HomeComponent, canActivate: [AuthGuard] },
  {
    path: 'account',
    loadChildren: () => import('@app/account/account.routes').then(m => m.accountRoutes)
  },
  {
    path: 'profile',
    loadChildren: () => import('@app/profile/profile.module').then(m => m.ProfileModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'admin',
    loadChildren: () => import('@app/admin/admin.module').then(m => m.AdminModule),
    canActivate: [AuthGuard],
    data: { roles: [Role.Admin] }
  },
  { path: '**', redirectTo: '' }
];
