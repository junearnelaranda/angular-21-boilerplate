import { Role } from './role';

export class Account {
  id!: number;
  title!: string;
  firstName!: string;
  lastName!: string;
  email!: string;
  role!: Role;
  verified?: string;
  jwtToken?: string;
}
