import { IsNotEmpty, IsString, MinLength, IsEnum, IsOptional, IsUUID, IsArray, ArrayUnique, IsISO8601 } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TicketPriority } from '../../entities/enums';

export class CreateTicketDto {
  @ApiProperty({ description: 'Ticket title', example: 'Fix login bug' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  title!: string;

  @ApiPropertyOptional({ description: 'Ticket description', example: 'Users cannot log in when using Google auth.' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Ticket priority', enum: TicketPriority, default: TicketPriority.MEDIUM })
  @IsEnum(TicketPriority)
  @IsOptional()
  priority?: TicketPriority = TicketPriority.MEDIUM;

  @ApiPropertyOptional({ description: 'Due date for the ticket (ISO 8601 format)', example: '2026-04-30T23:59:59Z' })
  @IsISO8601()
  @IsOptional()
  dueDate?: string;

  @ApiPropertyOptional({ description: 'List of assignee user UUIDs', type: [String] })
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  @IsOptional()
  assigneeIds?: string[];
}
