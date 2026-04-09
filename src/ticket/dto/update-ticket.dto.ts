import { IsOptional, IsString, MinLength, IsEnum, IsUUID, IsArray, ArrayUnique } from 'class-validator';
import { TicketPriority, StatusCategory } from '../../entities/enums';

export class UpdateTicketDto {
  @IsString()
  @MinLength(3)
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(StatusCategory)
  @IsOptional()
  status?: StatusCategory;

  @IsEnum(TicketPriority)
  @IsOptional()
  priority?: TicketPriority;

  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  @IsOptional()
  assigneeIds?: string[];
}
