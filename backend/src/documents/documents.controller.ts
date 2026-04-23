import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/auth-user.decorator';
import { RoleCode } from '../common/enums/app.enums';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { AuthUser } from '../common/types/auth-user.type';
import { CreateDocumentDto } from './dto/create-document.dto';
import { DeactivateDocumentDto } from './dto/deactivate-document.dto';
import { DocumentQueryDto } from './dto/document-query.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { DocumentsService } from './documents.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  findAll(@Query() query: DocumentQueryDto, @CurrentUser() user: AuthUser) {
    return this.documentsService.findAll(query, user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.documentsService.findOne(id, user);
  }

  @Post()
  create(@Body() dto: CreateDocumentDto, @CurrentUser() user: AuthUser) {
    return this.documentsService.create(dto, user);
  }

  @Put(':id')
  @Roles(RoleCode.ADMIN, RoleCode.MANAGER)
  update(@Param('id') id: string, @Body() dto: UpdateDocumentDto, @CurrentUser() user: AuthUser) {
    return this.documentsService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(RoleCode.ADMIN, RoleCode.MANAGER)
  deactivate(@Param('id') id: string, @Body() dto: DeactivateDocumentDto, @CurrentUser() user: AuthUser) {
    return this.documentsService.deactivate(id, dto, user);
  }
}
