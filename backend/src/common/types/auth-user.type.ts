import { RoleCode } from '../enums/app.enums';

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  roleCode: RoleCode;
  departmentId: string | null;
  roleName: string;
}
