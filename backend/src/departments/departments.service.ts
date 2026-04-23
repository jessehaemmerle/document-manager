import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { AuditEntityType, RoleCode } from '../common/enums/app.enums';
import { AuthUser } from '../common/types/auth-user.type';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { Department } from './department.entity';

@Injectable()
export class DepartmentsService {
  constructor(
    @InjectRepository(Department) private readonly departmentRepo: Repository<Department>,
    private readonly auditService: AuditService,
  ) {}

  async findAll(user: AuthUser, search?: string) {
    const where = search ? [{ name: ILike(`%${search}%`) }, { description: ILike(`%${search}%`) }] : {};
    const departments = await this.departmentRepo.find({ where, order: { name: 'ASC' } });
    return user.roleCode === RoleCode.ADMIN ? departments : departments.filter((d) => d.id === user.departmentId);
  }

  async create(dto: CreateDepartmentDto, user: AuthUser) {
    const department = await this.departmentRepo.save(this.departmentRepo.create(dto));
    await this.auditService.record({
      userId: user.id,
      actionType: 'department.created',
      entityType: AuditEntityType.DEPARTMENT,
      entityId: department.id,
      afterJson: department,
    });
    return department;
  }

  async update(id: string, dto: UpdateDepartmentDto, user: AuthUser) {
    const department = await this.departmentRepo.findOne({ where: { id } });
    if (!department) throw new NotFoundException('Abteilung nicht gefunden.');
    const before = { ...department };
    Object.assign(department, dto);
    const saved = await this.departmentRepo.save(department);
    await this.auditService.record({
      userId: user.id,
      actionType: 'department.updated',
      entityType: AuditEntityType.DEPARTMENT,
      entityId: saved.id,
      beforeJson: before,
      afterJson: saved,
    });
    return saved;
  }
}
