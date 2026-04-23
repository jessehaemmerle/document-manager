import { IsEmail, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { RoleCode } from '../../common/enums/app.enums';

export class CreateUserDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsEmail()
  email: string;

  @IsString()
  username: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  roleCode: RoleCode;

  @IsOptional()
  @IsUUID()
  departmentId?: string;
}
