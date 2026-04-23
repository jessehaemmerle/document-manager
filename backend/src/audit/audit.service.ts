import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, FindOptionsWhere, ILike, Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { AuditLog } from './audit-log.entity';
import { AuditQueryDto } from './dto/audit-query.dto';

interface AuditRecordInput {
  userId?: string | null;
  actionType: string;
  entityType: string;
  entityId: string;
  beforeJson?: Record<string, unknown> | null;
  afterJson?: Record<string, unknown> | null;
  contextJson?: Record<string, unknown> | null;
  comment?: string | null;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog) private readonly auditRepo: Repository<AuditLog>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  async record(input: AuditRecordInput) {
    const user = input.userId ? await this.userRepo.findOne({ where: { id: input.userId } }) : null;
    return this.auditRepo.save(
      this.auditRepo.create({
        user,
        actionType: input.actionType,
        entityType: input.entityType,
        entityId: input.entityId,
        beforeJson: input.beforeJson ?? null,
        afterJson: input.afterJson ?? null,
        contextJson: input.contextJson ?? null,
        comment: input.comment ?? null,
      }),
    );
  }

  async findAll(query: AuditQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: FindOptionsWhere<AuditLog>[] = [];
    const base: FindOptionsWhere<AuditLog> = {};

    if (query.actionType) base.actionType = query.actionType;
    if (query.entityType) base.entityType = query.entityType;
    if (query.userId) base.user = { id: query.userId };
    if (query.from && query.to) base.createdAt = Between(new Date(query.from), new Date(query.to));

    if (query.search) {
      where.push({ ...base, actionType: ILike(`%${query.search}%`) });
      where.push({ ...base, entityType: ILike(`%${query.search}%`) });
      where.push({ ...base, entityId: ILike(`%${query.search}%`) });
      where.push({ ...base, comment: ILike(`%${query.search}%`) });
    }

    const [items, total] = await this.auditRepo.findAndCount({
      where: where.length ? where : base,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return { items, total, page, pageSize };
  }

  async exportCsv(query: AuditQueryDto) {
    const { items } = await this.findAll({ ...query, page: 1, pageSize: 100 });
    const rows = [
      ['Zeitpunkt', 'Benutzer', 'Aktion', 'Entitaet', 'Entitaet-ID', 'Kommentar'],
      ...items.map((entry) => [
        entry.createdAt.toISOString(),
        entry.user ? `${entry.user.firstName} ${entry.user.lastName}` : 'System',
        entry.actionType,
        entry.entityType,
        entry.entityId,
        entry.comment ?? '',
      ]),
    ];
    return rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';')).join('\n');
  }
}
