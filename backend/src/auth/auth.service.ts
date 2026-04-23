import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuditEntityType } from '../common/enums/app.enums';
import { AuditService } from '../audit/audit.service';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly auditService: AuditService,
  ) {}

  async login(dto: LoginDto, context: Record<string, unknown>) {
    const user = await this.usersService.findByLogin(dto.login);
    if (!user?.active) {
      throw new UnauthorizedException('Ungueltige Zugangsdaten.');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Ungueltige Zugangsdaten.');
    }

    await this.auditService.record({
      userId: user.id,
      actionType: 'login',
      entityType: AuditEntityType.AUTH,
      entityId: user.id,
      contextJson: context,
    });

    const profile = this.usersService.toSafeUser(user);
    return {
      accessToken: this.jwtService.sign({
        sub: user.id,
        roleCode: user.role.code,
        departmentId: user.department?.id ?? null,
      }),
      user: profile,
    };
  }

  async me(userId: string) {
    const user = await this.usersService.findEntity(userId);
    if (!user) {
      throw new UnauthorizedException('Benutzer nicht gefunden.');
    }
    return this.usersService.toSafeUser(user);
  }
}
