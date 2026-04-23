import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpsertEmailTemplateDto {
  @IsString()
  key: string;

  @IsString()
  subject: string;

  @IsString()
  body: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
