import { IsString, MinLength } from 'class-validator';

export class DeactivateDocumentDto {
  @IsString()
  @MinLength(5)
  comment: string;
}
