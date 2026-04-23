export enum RoleCode {
  ADMIN = 'admin',
  MANAGER = 'manager',
  EMPLOYEE = 'employee',
}

export enum DocumentSourceType {
  SHAREPOINT = 'sharepoint',
  WIKI = 'wiki',
  FILESERVER = 'dateiserver',
  WEBLINK = 'weblink',
  OTHER = 'sonstiges',
}

export enum ReviewIntervalType {
  MONTHLY = 'monatlich',
  QUARTERLY = 'quartalsweise',
  HALF_YEARLY = 'halbjaehrlich',
  YEARLY = 'jaehrlich',
  CUSTOM_DAYS = 'tage',
}

export enum ReviewCycleStatus {
  OPEN = 'offen',
  IN_REVIEW = 'in_pruefung',
  COMPLETED = 'abgeschlossen',
  OVERDUE = 'ueberfaellig',
}

export enum ReviewAssignmentStatus {
  OPEN = 'offen',
  READ = 'gelesen',
  REVISION_REQUIRED = 'ueberarbeitet_noetig',
  APPROVED = 'freigegeben',
  ESCALATED = 'eskaliert',
  OVERDUE = 'ueberfaellig',
  IN_REVIEW = 'in_pruefung',
  COMPLETED = 'abgeschlossen',
}

export enum ReviewActionType {
  READ = 'gelesen',
  COMMENTED = 'kommentiert',
  REVISION_REQUIRED = 'ueberarbeitung_angefordert',
  APPROVED = 'freigegeben',
  ESCALATED = 'eskaliert',
  REMINDER = 'erinnerung_versendet',
  CREATED = 'erstellt',
}

export enum NotificationType {
  REVIEW_DUE = 'pruefung_faellig',
  REMINDER = 'erinnerung',
  ESCALATION = 'eskalation',
  REVISION_REQUIRED = 'ueberarbeitung_noetig',
  NEXT_STAGE = 'naechste_freigabestufe',
  SYSTEM = 'system',
}

export enum AuditEntityType {
  AUTH = 'auth',
  USER = 'user',
  DEPARTMENT = 'department',
  ROLE = 'role',
  DOCUMENT = 'document',
  DOCUMENT_TYPE = 'document_type',
  REVIEW_CYCLE = 'review_cycle',
  REVIEW_ASSIGNMENT = 'review_assignment',
  REVIEW_ACTION = 'review_action',
  COMMENT = 'comment',
  NOTIFICATION = 'notification',
  SYSTEM_SETTING = 'system_setting',
  EMAIL_TEMPLATE = 'email_template',
}
