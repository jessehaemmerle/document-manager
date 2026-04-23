import { Controller, Get, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RoleCode } from '../common/enums/app.enums';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { Document } from '../documents/document.entity';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleCode.ADMIN)
@Controller('exports')
export class ExportsController {
  constructor(@InjectRepository(Document) private readonly documentRepo: Repository<Document>) {}

  @Get('documents.csv')
  async documentsCsv(@Res() response: Response) {
    const documents = await this.documentRepo.find({ order: { title: 'ASC' } });
    const rows = [
      ['Titel', 'Typ', 'Abteilung', 'Status', 'Aktiv', 'Naechste Pruefung', 'Link'],
      ...documents.map((document) => [
        document.title,
        document.documentType.name,
        document.department.name,
        document.currentStatus,
        document.active ? 'Ja' : 'Nein',
        document.nextReviewAt?.toISOString() ?? '',
        document.linkUrl,
      ]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';')).join('\n');
    response.setHeader('Content-Type', 'text/csv; charset=utf-8');
    response.setHeader('Content-Disposition', 'attachment; filename="dokumente.csv"');
    response.send(csv);
  }
}
