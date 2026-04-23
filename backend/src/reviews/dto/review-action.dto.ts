import { IsOptional, IsString, MinLength } from 'class-validator';
import { ReviewAssignmentStatus } from '../../common/enums/app.enums';

export class ReviewActionDto {
  @IsString()
  status: ReviewAssignmentStatus;

  @IsOptional()
  @IsString()
  @MinLength(1)
  comment?: string;
}
