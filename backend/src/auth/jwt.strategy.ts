import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { AuthUser } from '../common/types/auth-user.type';
import { RoleCode } from '../common/enums/app.enums';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService, private readonly usersService: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', 'change-me-in-production'),
    });
  }

  async validate(payload: { sub: string }): Promise<AuthUser> {
    const user = await this.usersService.findEntity(payload.sub);
    if (!user?.active) {
      throw new UnauthorizedException('Benutzerkonto ist nicht aktiv.');
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      roleCode: user.role.code as RoleCode,
      roleName: user.role.name,
      departmentId: user.department?.id ?? null,
    };
  }
}
