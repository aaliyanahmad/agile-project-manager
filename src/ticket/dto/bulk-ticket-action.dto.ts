import { IsNotEmpty, IsEnum, IsArray, IsUUID, ValidateNested, IsOptional, ArrayNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TicketPriority } from '../../entities/enums';

export enum BulkActionType {
  ASSIGN = 'ASSIGN',
  PRIORITY = 'PRIORITY',
  MOVE_TO_SPRINT = 'MOVE_TO_SPRINT',
  MOVE_TO_BACKLOG = 'MOVE_TO_BACKLOG',
}

export class BulkActionPayloadDto {
  @ApiPropertyOptional({ description: 'Assignee user UUID (required for ASSIGN action)', example: 'uuid-here' })
  @IsUUID('4')
  @IsOptional()
  assigneeId?: string;

  @ApiPropertyOptional({ description: 'Priority level (required for PRIORITY action)', enum: TicketPriority })
  @IsEnum(TicketPriority)
  @IsOptional()
  priority?: TicketPriority;

  @ApiPropertyOptional({ description: 'Sprint UUID (required for MOVE_TO_SPRINT action)', example: 'uuid-here' })
  @IsUUID('4')
  @IsOptional()
  sprintId?: string;
}

export class BulkTicketActionDto {
  @ApiProperty({ description: 'List of ticket UUIDs to update', type: [String] })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  ticketIds!: string[];

  @ApiProperty({ description: 'Action type to apply to all tickets', enum: BulkActionType })
  @IsEnum(BulkActionType)
  @IsNotEmpty()
  action!: BulkActionType;

  @ApiProperty({ description: 'Payload containing action-specific data' })
  @ValidateNested()
  @Type(() => BulkActionPayloadDto)
  payload!: BulkActionPayloadDto;
}

export class BulkActionResponse {
  @ApiProperty({ description: 'Whether the operation was successful' })
  success!: boolean;

  @ApiProperty({ description: 'Number of tickets updated' })
  updatedCount!: number;

  @ApiPropertyOptional({ description: 'Number of tickets that failed (reserved for future use)' })
  failedCount?: number;

  @ApiPropertyOptional({ description: 'IDs of tickets that failed (reserved for future use)' })
  failedTicketIds?: string[];
}
