import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/auth-user.decorator';
import { RoleCode } from '../common/enums/app.enums';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { AuthUser } from '../common/types/auth-user.type';
import { DocumentTypesService } from './document-types.service';
import { UpsertDocumentTypeDto } from './dto/upsert-document-type.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('document-types')
export class DocumentTypesController {
  constructor(private readonly service: DocumentTypesService) {}

  @Get()
  findAll(@Query('search') search?: string) {
    return this.service.findAll(search);
  }

  @Post()
  @Roles(RoleCode.ADMIN)
  create(@Body() dto: UpsertDocumentTypeDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto, user);
  }

  @Put(':id')
  @Roles(RoleCode.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpsertDocumentTypeDto, @CurrentUser() user: AuthUser) {
    return this.service.update(id, dto, user);
  }
}
