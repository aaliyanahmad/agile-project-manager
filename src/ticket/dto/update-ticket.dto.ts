import { IsOptional, IsString, MinLength, IsEnum, IsUUID, IsArray, ArrayUnique, IsISO8601 } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TicketPriority } from '../../entities/enums';

export class UpdateTicketDto {
  @ApiPropertyOptional({ description: 'Updated ticket title', example: 'Fix logout issue' })
  @IsString()
  @MinLength(3)
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ description: 'Updated ticket description', example: 'Session expires too early.' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'New ticket status ID', example: 'b2c3d4e5-6f7a-8b9c-0d1e-234567890abc' })
  @IsUUID('4')
  @IsOptional()
  statusId?: string;

  @ApiPropertyOptional({ description: 'Updated ticket priority', enum: TicketPriority })
  @IsEnum(TicketPriority)
  @IsOptional()
  priority?: TicketPriority;

  @ApiPropertyOptional({ description: 'Due date for the ticket (ISO 8601 format or null to remove)', example: '2026-04-30T23:59:59Z' })
  @IsISO8601()
  @IsOptional()
  dueDate?: string | null;

  @ApiPropertyOptional({ description: 'Updated list of assignee UUIDs', type: [String] })
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  @IsOptional()
  assigneeIds?: string[];
}
