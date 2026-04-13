import { IsOptional, IsUUID, IsEnum, IsInt, Min, Max, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TicketPriority, StatusCategory } from '../../entities/enums';

export class GetTicketsQueryDto {
  @ApiProperty({ description: 'Project UUID', example: 'd290f1ee-6c54-4b01-90e6-d701748f0851' })
  @IsUUID('4')
  projectId!: string;

  @ApiPropertyOptional({ description: 'Sprint UUID to filter tickets', example: 'a1b2c3d4-5e6f-7a8b-9c0d-123456789abc' })
  @IsUUID('4')
  @IsOptional()
  sprintId?: string;

  @ApiPropertyOptional({ description: 'Status UUID to filter tickets', example: 'b2c3d4e5-6f7a-8b9c-0d1e-234567890abc' })
  @IsUUID('4')
  @IsOptional()
  statusId?: string;

  @ApiPropertyOptional({ description: 'Status category to filter tickets', enum: StatusCategory, example: 'TODO' })
  @IsEnum(StatusCategory)
  @IsOptional()
  statusCategory?: StatusCategory;

  @ApiPropertyOptional({ description: 'Priority level to filter tickets', enum: TicketPriority, example: 'HIGH' })
  @IsEnum(TicketPriority)
  @IsOptional()
  priority?: TicketPriority;

  @ApiPropertyOptional({ description: 'Assignee UUID to filter tickets', example: 'c3d4e5f6-7a8b-9c0d-1e2f-345678901bcd' })
  @IsUUID('4')
  @IsOptional()
  assigneeId?: string;

  @ApiPropertyOptional({ description: 'Due date from (ISO 8601 format)', example: '2026-04-01T00:00:00Z' })
  @IsDateString()
  @IsOptional()
  dueDateFrom?: string;

  @ApiPropertyOptional({ description: 'Due date to (ISO 8601 format)', example: '2026-04-30T23:59:59Z' })
  @IsDateString()
  @IsOptional()
  dueDateTo?: string;

  @ApiPropertyOptional({ description: 'Page number (starts from 1)', example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page (max 50)', example: 5, default: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 5;

  @ApiPropertyOptional({ description: 'Sort field', enum: ['dueDate', 'priority', 'updatedAt', 'position'], example: 'dueDate' })
  @IsEnum(['dueDate', 'priority', 'updatedAt', 'position'])
  @IsOptional()
  sortBy?: 'dueDate' | 'priority' | 'updatedAt' | 'position';

  @ApiPropertyOptional({ description: 'Sort order', enum: ['ASC', 'DESC'], example: 'DESC' })
  @IsEnum(['ASC', 'DESC'])
  @IsOptional()
  order?: 'ASC' | 'DESC';
}
