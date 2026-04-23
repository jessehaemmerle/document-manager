import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { AuditEntityType } from '../common/enums/app.enums';
import { AuthUser } from '../common/types/auth-user.type';
import { DocumentType } from './document-type.entity';
import { UpsertDocumentTypeDto } from './dto/upsert-document-type.dto';

@Injectable()
export class DocumentTypesService {
  constructor(
    @InjectRepository(DocumentType) private readonly typeRepo: Repository<DocumentType>,
    private readonly auditService: AuditService,
  ) {}

  findAll(search?: string) {
    const where = search ? [{ name: ILike(`%${search}%`) }, { description: ILike(`%${search}%`) }] : {};
    return this.typeRepo.find({ where, order: { name: 'ASC' } });
  }

  async create(dto: UpsertDocumentTypeDto, user: AuthUser) {
    const type = await this.typeRepo.save(this.typeRepo.create({ ...dto, active: dto.active ?? true }));
    await this.auditService.record({
      userId: user.id,
      actionType: 'document_type.created',
      entityType: AuditEntityType.DOCUMENT_TYPE,
      entityId: type.id,
      afterJson: type,
    });
    return type;
  }

  async update(id: string, dto: UpsertDocumentTypeDto, user: AuthUser) {
    const type = await this.typeRepo.findOne({ where: { id } });
    if (!type) throw new NotFoundException('Dokumenttyp nicht gefunden.');
    const before = { ...type };
    Object.assign(type, dto);
    const saved = await this.typeRepo.save(type);
    await this.auditService.record({
      userId: user.id,
      actionType: 'document_type.updated',
      entityType: AuditEntityType.DOCUMENT_TYPE,
      entityId: saved.id,
      beforeJson: before,
      afterJson: saved,
    });
    return saved;
  }
}
