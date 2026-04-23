import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/auth-user.decorator';
import { RoleCode } from '../common/enums/app.enums';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { AuthUser } from '../common/types/auth-user.type';
import { UpdateSettingDto } from './dto/update-setting.dto';
import { UpsertEmailTemplateDto } from './dto/upsert-email-template.dto';
import { SettingsService } from './settings.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleCode.ADMIN)
@Controller('settings')
export class SettingsController {
  constructor(private readonly service: SettingsService) {}

  @Get()
  settings() {
    return this.service.settings();
  }

  @Get('email-templates')
  templates() {
    return this.service.templates();
  }

  @Put(':key')
  updateSetting(@Param('key') key: string, @Body() dto: UpdateSettingDto, @CurrentUser() user: AuthUser) {
    return this.service.updateSetting(key, dto, user);
  }

  @Put('email-templates/:key')
  upsertTemplate(@Param('key') key: string, @Body() dto: UpsertEmailTemplateDto, @CurrentUser() user: AuthUser) {
    return this.service.upsertTemplate({ ...dto, key }, user);
  }
}
