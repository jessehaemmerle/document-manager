import { IsBoolean, IsDateString, IsInt, IsOptional, IsString, IsUrl, IsUUID, Min } from 'class-validator';
import { DocumentSourceType, ReviewIntervalType } from '../../common/enums/app.enums';

export class CreateDocumentDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsUUID()
  documentTypeId: string;

  @IsUrl({ require_tld: false })
  linkUrl: string;

  @IsString()
  sourceType: DocumentSourceType;

  @IsUUID()
  departmentId: string;

  @IsOptional()
  @IsUUID()
  responsibleUserId?: string | null;

  @IsString()
  reviewIntervalType: ReviewIntervalType;

  @IsOptional()
  @IsInt()
  @Min(1)
  reviewIntervalDays?: number | null;

  @IsDateString()
  nextReviewAt: string;

  @IsOptional()
  @IsBoolean()
  multiStageApprovalEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  commentRequiredOnRevision?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  reminderAfterHours?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  escalationAfterHours?: number;
}
