import { IsNotEmpty, IsString, MinLength, IsEnum, IsOptional, IsUUID, IsArray, ArrayUnique } from 'class-validator';
import { TicketPriority } from '../../entities/enums';

export class CreateTicketDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  title!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(TicketPriority)
  @IsOptional()
  priority?: TicketPriority = TicketPriority.MEDIUM;

  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  @IsOptional()
  assigneeIds?: string[];
}
