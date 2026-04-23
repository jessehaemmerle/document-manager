import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { AuditEntityType } from '../common/enums/app.enums';
import { AuthUser } from '../common/types/auth-user.type';
import { EmailTemplate } from './email-template.entity';
import { SystemSetting } from './system-setting.entity';
import { UpdateSettingDto } from './dto/update-setting.dto';
import { UpsertEmailTemplateDto } from './dto/upsert-email-template.dto';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(SystemSetting) private readonly settingsRepo: Repository<SystemSetting>,
    @InjectRepository(EmailTemplate) private readonly templateRepo: Repository<EmailTemplate>,
    private readonly auditService: AuditService,
  ) {}

  settings() {
    return this.settingsRepo.find({ order: { key: 'ASC' } });
  }

  templates() {
    return this.templateRepo.find({ order: { key: 'ASC' } });
  }

  async updateSetting(key: string, dto: UpdateSettingDto, user: AuthUser) {
    const setting = await this.settingsRepo.findOne({ where: { key } });
    if (!setting) throw new NotFoundException('Einstellung nicht gefunden.');
    const before = { ...setting };
    setting.value = dto.value;
    const saved = await this.settingsRepo.save(setting);
    await this.auditService.record({
      userId: user.id,
      actionType: 'setting.updated',
      entityType: AuditEntityType.SYSTEM_SETTING,
      entityId: saved.id,
      beforeJson: before,
      afterJson: saved,
    });
    return saved;
  }

  async upsertTemplate(dto: UpsertEmailTemplateDto, user: AuthUser) {
    let template = await this.templateRepo.findOne({ where: { key: dto.key } });
    const before = template ? { ...template } : null;
    template = this.templateRepo.create({ ...(template ?? {}), ...dto, active: dto.active ?? true });
    const saved = await this.templateRepo.save(template);
    await this.auditService.record({
      userId: user.id,
      actionType: before ? 'email_template.updated' : 'email_template.created',
      entityType: AuditEntityType.EMAIL_TEMPLATE,
      entityId: saved.id,
      beforeJson: before,
      afterJson: saved,
    });
    return saved;
  }
}
