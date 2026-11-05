import { Role } from '../enums/role.enum';

/** The logged-in user, taken from the JWT and attached to every request. */
export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: Role;
}

export interface JwtPayload {
  sub: number;
  email: string;
  name: string;
  role: Role;
}
