export type RoleCode = 'admin' | 'manager' | 'employee';

export interface Role {
  id: string;
  code: RoleCode;
  name: string;
}

export interface Department {
  id: string;
  name: string;
  description?: string | null;
  active: boolean;
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  role: Role;
  department?: Department | null;
  active: boolean;
}

export interface DocumentType {
  id: string;
  name: string;
  description?: string | null;
  active: boolean;
}

export interface DocumentItem {
  id: string;
  title: string;
  description?: string | null;
  documentType: DocumentType;
  department: Department;
  createdBy: User;
  responsibleUser?: User | null;
  linkUrl: string;
  sourceType: string;
  reviewIntervalType: string;
  reviewIntervalDays?: number | null;
  nextReviewAt?: string | null;
  multiStageApprovalEnabled: boolean;
  active: boolean;
  currentStatus: string;
  approvalStages: Array<{ stageNumber: number; roleCode: string; label: string }>;
}

export interface ReviewCycle {
  id: string;
  dueAt: string;
  startedAt: string;
  completedAt?: string | null;
  status: string;
  assignments?: ReviewAssignment[];
}

export interface ReviewAssignment {
  id: string;
  stageNumber: number;
  status: string;
  assignedAt: string;
  completedAt?: string | null;
  remindedAt?: string | null;
  escalatedAt?: string | null;
  cycle: ReviewCycle & { document: DocumentItem };
  user: User;
}

export interface ReviewAction {
  id: string;
  actionType: string;
  comment?: string | null;
  timestamp: string;
  user: User;
}

export interface CommentItem {
  id: string;
  content: string;
  createdAt: string;
  user: User;
}

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  entityType?: string | null;
  entityId?: string | null;
  read: boolean;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  actionType: string;
  entityType: string;
  entityId: string;
  comment?: string | null;
  createdAt: string;
  user?: User | null;
}

export interface SettingsItem {
  id: string;
  key: string;
  value: string;
  description?: string | null;
}

export interface EmailTemplate {
  id: string;
  key: string;
  subject: string;
  body: string;
  active: boolean;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface DashboardSummary {
  activeDocuments: number;
  inactiveDocuments: number;
  overdueDocuments: number;
  openAssignments: number;
  escalatedAssignments: number;
  completedAssignments: number;
  unreadNotifications: number;
  recentAssignments: ReviewAssignment[];
}
