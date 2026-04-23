import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/auth-user.decorator';
import { RoleCode } from '../common/enums/app.enums';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { AuthUser } from '../common/types/auth-user.type';
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Get()
  @Roles(RoleCode.ADMIN, RoleCode.MANAGER, RoleCode.EMPLOYEE)
  findAll(@CurrentUser() user: AuthUser, @Query('search') search?: string) {
    return this.departmentsService.findAll(user, search);
  }

  @Post()
  @Roles(RoleCode.ADMIN)
  create(@Body() dto: CreateDepartmentDto, @CurrentUser() user: AuthUser) {
    return this.departmentsService.create(dto, user);
  }

  @Put(':id')
  @Roles(RoleCode.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateDepartmentDto, @CurrentUser() user: AuthUser) {
    return this.departmentsService.update(id, dto, user);
  }
}
