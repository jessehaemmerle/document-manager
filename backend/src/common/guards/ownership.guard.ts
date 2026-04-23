import { ForbiddenException, Injectable } from '@nestjs/common';
import { AuthUser } from '../types/auth-user.type';
import { RoleCode } from '../enums/app.enums';

@Injectable()
export class OwnershipGuard {
  ensureDepartmentAccess(user: AuthUser, departmentId?: string | null) {
    if (user.roleCode === RoleCode.ADMIN) {
      return;
    }

    if (!departmentId || user.departmentId !== departmentId) {
      throw new ForbiddenException('Kein Zugriff auf diese Abteilung.');
    }
  }

  ensureManagerOrAdmin(user: AuthUser) {
    if (![RoleCode.ADMIN, RoleCode.MANAGER].includes(user.roleCode)) {
      throw new ForbiddenException('Aktion nur fuer Fuehrungskraefte oder Admins erlaubt.');
    }
  }
}
