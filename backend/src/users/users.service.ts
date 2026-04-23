import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { ILike, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { AuditEntityType, RoleCode } from '../common/enums/app.enums';
import { AuthUser } from '../common/types/auth-user.type';
import { Department } from '../departments/department.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Role } from './role.entity';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Role) private readonly roleRepo: Repository<Role>,
    @InjectRepository(Department) private readonly departmentRepo: Repository<Department>,
    private readonly auditService: AuditService,
  ) {}

  toSafeUser(user: User) {
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      username: user.username,
      role: user.role,
      department: user.department ?? null,
      active: user.active,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async findEntity(id: string) {
    return this.userRepo.findOne({ where: { id } });
  }

  async findByLogin(login: string) {
    return this.userRepo.findOne({
      where: [{ username: login }, { email: login }],
    });
  }

  async findAll(currentUser: AuthUser, search?: string) {
    const where = search
      ? [
          { firstName: ILike(`%${search}%`) },
          { lastName: ILike(`%${search}%`) },
          { email: ILike(`%${search}%`) },
          { username: ILike(`%${search}%`) },
        ]
      : {};
    const users = await this.userRepo.find({ where, order: { lastName: 'ASC', firstName: 'ASC' } });
    const filtered =
      currentUser.roleCode === RoleCode.ADMIN
        ? users
        : users.filter((user) => user.department?.id && user.department.id === currentUser.departmentId);
    return filtered.map((user) => this.toSafeUser(user));
  }

  async findOne(id: string, currentUser: AuthUser) {
    const user = await this.findEntity(id);
    if (!user) throw new NotFoundException('Benutzer nicht gefunden.');
    if (currentUser.roleCode !== RoleCode.ADMIN && user.department?.id !== currentUser.departmentId) {
      throw new NotFoundException('Benutzer nicht gefunden.');
    }
    return this.toSafeUser(user);
  }

  async create(dto: CreateUserDto, currentUser: AuthUser) {
    await this.ensureUnique(dto.email, dto.username);
    const role = await this.roleRepo.findOne({ where: { code: dto.roleCode } });
    if (!role) throw new NotFoundException('Rolle nicht gefunden.');
    const department = dto.departmentId ? await this.departmentRepo.findOne({ where: { id: dto.departmentId } }) : null;
    if (dto.departmentId && !department) throw new NotFoundException('Abteilung nicht gefunden.');

    const user = await this.userRepo.save(
      this.userRepo.create({
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email.toLowerCase(),
        username: dto.username.toLowerCase(),
        passwordHash: await bcrypt.hash(dto.password, 12),
        role,
        department,
        active: true,
      }),
    );

    await this.auditService.record({
      userId: currentUser.id,
      actionType: 'user.created',
      entityType: AuditEntityType.USER,
      entityId: user.id,
      afterJson: this.toSafeUser(user),
    });

    return this.toSafeUser(user);
  }

  async update(id: string, dto: UpdateUserDto, currentUser: AuthUser) {
    const user = await this.findEntity(id);
    if (!user) throw new NotFoundException('Benutzer nicht gefunden.');
    const before = this.toSafeUser(user);

    if (dto.email && dto.email.toLowerCase() !== user.email) await this.ensureUnique(dto.email, user.username, id);
    if (dto.username && dto.username.toLowerCase() !== user.username) await this.ensureUnique(user.email, dto.username, id);

    if (dto.roleCode) {
      const role = await this.roleRepo.findOne({ where: { code: dto.roleCode } });
      if (!role) throw new NotFoundException('Rolle nicht gefunden.');
      user.role = role;
    }
    if (dto.departmentId !== undefined) {
      user.department = dto.departmentId ? await this.departmentRepo.findOne({ where: { id: dto.departmentId } }) : null;
      if (dto.departmentId && !user.department) throw new NotFoundException('Abteilung nicht gefunden.');
    }
    if (dto.password) user.passwordHash = await bcrypt.hash(dto.password, 12);
    if (dto.firstName) user.firstName = dto.firstName;
    if (dto.lastName) user.lastName = dto.lastName;
    if (dto.email) user.email = dto.email.toLowerCase();
    if (dto.username) user.username = dto.username.toLowerCase();
    if (dto.active !== undefined) {
      user.active = dto.active;
      user.deactivatedAt = dto.active ? null : new Date();
    }

    const saved = await this.userRepo.save(user);
    await this.auditService.record({
      userId: currentUser.id,
      actionType: 'user.updated',
      entityType: AuditEntityType.USER,
      entityId: saved.id,
      beforeJson: before,
      afterJson: this.toSafeUser(saved),
    });
    return this.toSafeUser(saved);
  }

  async deactivate(id: string, currentUser: AuthUser) {
    return this.update(id, { active: false }, currentUser);
  }

  async roles() {
    return this.roleRepo.find({ order: { name: 'ASC' } });
  }

  async activeUsersForDepartment(departmentId: string, roleCode?: RoleCode) {
    const users = await this.userRepo.find({
      where: { active: true, department: { id: departmentId } },
      order: { lastName: 'ASC' },
    });
    return roleCode ? users.filter((user) => user.role.code === roleCode) : users;
  }

  private async ensureUnique(email: string, username: string, ignoredId?: string) {
    const existing = await this.userRepo.find({
      where: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }],
    });
    if (existing.some((user) => user.id !== ignoredId)) {
      throw new ConflictException('E-Mail oder Benutzername ist bereits vergeben.');
    }
  }
}
