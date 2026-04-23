import 'reflect-metadata';
import * as bcrypt from 'bcrypt';
import { AppDataSource } from './data-source';
import { Department } from '../departments/department.entity';
import { DocumentType } from '../document-types/document-type.entity';
import { Document } from '../documents/document.entity';
import {
  DocumentSourceType,
  ReviewAssignmentStatus,
  ReviewCycleStatus,
  ReviewIntervalType,
  RoleCode,
} from '../common/enums/app.enums';
import { ReviewCycle } from '../reviews/review-cycle.entity';
import { ReviewAssignment } from '../reviews/review-assignment.entity';
import { ReviewAction } from '../reviews/review-action.entity';
import { Role } from '../users/role.entity';
import { User } from '../users/user.entity';
import { SystemSetting } from '../settings/system-setting.entity';
import { EmailTemplate } from '../settings/email-template.entity';
import { Notification } from '../notifications/notification.entity';

async function upsert<T extends { id: string }>(repo: any, where: Record<string, unknown>, values: Partial<T>) {
  const existing = await repo.findOne({ where });
  return repo.save(repo.create({ ...(existing ?? {}), ...values }));
}

async function main() {
  await AppDataSource.initialize();
  const roleRepo = AppDataSource.getRepository(Role);
  const departmentRepo = AppDataSource.getRepository(Department);
  const userRepo = AppDataSource.getRepository(User);
  const typeRepo = AppDataSource.getRepository(DocumentType);
  const documentRepo = AppDataSource.getRepository(Document);
  const cycleRepo = AppDataSource.getRepository(ReviewCycle);
  const assignmentRepo = AppDataSource.getRepository(ReviewAssignment);
  const actionRepo = AppDataSource.getRepository(ReviewAction);
  const settingRepo = AppDataSource.getRepository(SystemSetting);
  const templateRepo = AppDataSource.getRepository(EmailTemplate);
  const notificationRepo = AppDataSource.getRepository(Notification);

  const adminRole = await upsert<Role>(roleRepo, { code: RoleCode.ADMIN }, { code: RoleCode.ADMIN, name: 'Admin', description: 'Vollzugriff' });
  const managerRole = await upsert<Role>(roleRepo, { code: RoleCode.MANAGER }, { code: RoleCode.MANAGER, name: 'Fuehrungskraft', description: 'Abteilungsverwaltung' });
  const employeeRole = await upsert<Role>(roleRepo, { code: RoleCode.EMPLOYEE }, { code: RoleCode.EMPLOYEE, name: 'Mitarbeiter', description: 'Pruefaufgaben bearbeiten' });

  const qa = await upsert<Department>(departmentRepo, { name: 'Qualitaetssicherung' }, { name: 'Qualitaetssicherung', description: 'QM, Richtlinien und Audits', active: true });
  const it = await upsert<Department>(departmentRepo, { name: 'IT' }, { name: 'IT', description: 'IT-Betrieb und Informationssicherheit', active: true });

  const passwordHash = await bcrypt.hash('Passwort123!', 12);
  const admin = await upsert<User>(userRepo, { username: 'admin' }, { firstName: 'Anna', lastName: 'Admin', email: 'admin@example.internal', username: 'admin', passwordHash, role: adminRole, department: qa, active: true });
  const qmManager = await upsert<User>(userRepo, { username: 'qm.leitung' }, { firstName: 'Maria', lastName: 'Leitung', email: 'qm.leitung@example.internal', username: 'qm.leitung', passwordHash, role: managerRole, department: qa, active: true });
  const itManager = await upsert<User>(userRepo, { username: 'it.leitung' }, { firstName: 'Max', lastName: 'Technik', email: 'it.leitung@example.internal', username: 'it.leitung', passwordHash, role: managerRole, department: it, active: true });
  const qmEmployee = await upsert<User>(userRepo, { username: 'qm.mitarbeiter' }, { firstName: 'Lena', lastName: 'Pruefer', email: 'qm.mitarbeiter@example.internal', username: 'qm.mitarbeiter', passwordHash, role: employeeRole, department: qa, active: true });
  const itEmployee = await upsert<User>(userRepo, { username: 'it.mitarbeiter' }, { firstName: 'Jonas', lastName: 'Support', email: 'it.mitarbeiter@example.internal', username: 'it.mitarbeiter', passwordHash, role: employeeRole, department: it, active: true });

  const typeNames = ['Richtlinie', 'Arbeitsanweisung', 'Formular', 'Vertrag', 'Prozessbeschreibung', 'Anleitung'];
  const types: DocumentType[] = [];
  for (const name of typeNames) {
    types.push(await upsert<DocumentType>(typeRepo, { name }, { name, description: `${name} fuer interne Dokumente`, active: true }));
  }

  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const nextMonth = new Date(now);
  nextMonth.setMonth(nextMonth.getMonth() + 1);

  const doc1 = await upsert<Document>(documentRepo, { title: 'QM-Richtlinie Lieferantenbewertung' }, {
    title: 'QM-Richtlinie Lieferantenbewertung',
    description: 'Regelmaessige Sichtung der Vorgaben zur Bewertung kritischer Lieferanten.',
    documentType: types[0],
    linkUrl: 'https://sharepoint.example.internal/qm/lieferantenbewertung',
    sourceType: DocumentSourceType.SHAREPOINT,
    department: qa,
    createdBy: admin,
    responsibleUser: qmEmployee,
    reviewIntervalType: ReviewIntervalType.QUARTERLY,
    reviewIntervalDays: null,
    nextReviewAt: yesterday,
    multiStageApprovalEnabled: true,
    approvalStages: [
      { stageNumber: 1, roleCode: RoleCode.EMPLOYEE, label: 'Mitarbeitende Sichtung' },
      { stageNumber: 2, roleCode: RoleCode.MANAGER, label: 'Fuehrungskraft Freigabe' },
    ],
    active: true,
    currentStatus: ReviewAssignmentStatus.OPEN,
  });

  const doc2 = await upsert<Document>(documentRepo, { title: 'IT-Notfallhandbuch' }, {
    title: 'IT-Notfallhandbuch',
    description: 'Kontrolle der aktuellen Notfallkontakte und Wiederanlaufplaene.',
    documentType: types[5],
    linkUrl: 'https://wiki.example.internal/it/notfallhandbuch',
    sourceType: DocumentSourceType.WIKI,
    department: it,
    createdBy: itManager,
    responsibleUser: itEmployee,
    reviewIntervalType: ReviewIntervalType.HALF_YEARLY,
    nextReviewAt: nextMonth,
    multiStageApprovalEnabled: false,
    approvalStages: [{ stageNumber: 1, roleCode: RoleCode.EMPLOYEE, label: 'Sichtung' }],
    active: true,
    currentStatus: ReviewAssignmentStatus.APPROVED,
  });

  const cycle = await upsert<ReviewCycle>(cycleRepo, { document: { id: doc2.id }, status: ReviewCycleStatus.COMPLETED }, {
    document: doc2,
    dueAt: now,
    completedAt: now,
    status: ReviewCycleStatus.COMPLETED,
  });
  const assignment = await upsert<ReviewAssignment>(assignmentRepo, { cycle: { id: cycle.id }, user: { id: itEmployee.id } }, {
    cycle,
    user: itEmployee,
    stageNumber: 1,
    status: ReviewAssignmentStatus.APPROVED,
    completedAt: now,
  });
  await upsert<ReviewAction>(actionRepo, { assignment: { id: assignment.id }, actionType: 'freigegeben' }, {
    document: doc2,
    cycle,
    assignment,
    user: itEmployee,
    actionType: 'freigegeben',
    comment: 'Dokument ist aktuell.',
  });

  await upsert<SystemSetting>(settingRepo, { key: 'scheduler.cron' }, { key: 'scheduler.cron', value: '* * * * *', description: 'Pruefintervall des Schedulers' });
  await upsert<SystemSetting>(settingRepo, { key: 'privacy.retention.audit_days' }, { key: 'privacy.retention.audit_days', value: '3650', description: 'Audit-Aufbewahrung in Tagen' });
  await upsert<EmailTemplate>(templateRepo, { key: 'review_due' }, { key: 'review_due', subject: 'Dokument zur Pruefung faellig', body: 'Bitte pruefen Sie das Dokument {{documentTitle}}.', active: true });
  await upsert<EmailTemplate>(templateRepo, { key: 'escalation' }, { key: 'escalation', subject: 'Pruefung eskaliert', body: 'Eine Pruefung wurde eskaliert: {{documentTitle}}.', active: true });

  await notificationRepo.save(notificationRepo.create({
    user: qmEmployee,
    type: 'pruefung_faellig',
    title: 'Neues Dokument zur Pruefung',
    message: `Bitte pruefen Sie "${doc1.title}".`,
    entityType: 'document',
    entityId: doc1.id,
  }));

  await AppDataSource.destroy();
  console.log('Seed-Daten wurden erfolgreich angelegt.');
}

main().catch(async (error) => {
  console.error(error);
  if (AppDataSource.isInitialized) await AppDataSource.destroy();
  process.exit(1);
});
