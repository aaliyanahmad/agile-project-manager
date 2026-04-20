import { IsNotEmpty, IsString, MinLength, IsEnum, IsOptional, IsUUID, IsArray, ArrayUnique } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TicketPriority } from '../../entities/enums';

export class CreateSubtaskDto {
  @ApiProperty({ description: 'Subtask title', example: 'Write unit tests' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  title!: string;

  @ApiPropertyOptional({ description: 'Subtask description', example: 'Write tests for the new feature.' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Subtask priority', enum: TicketPriority, default: TicketPriority.MEDIUM })
  @IsEnum(TicketPriority)
  @IsOptional()
  priority?: TicketPriority = TicketPriority.MEDIUM;

  @ApiPropertyOptional({ description: 'List of assignee user UUIDs', type: [String] })
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  @IsOptional()
  assigneeIds?: string[];

  @ApiPropertyOptional({ description: 'Status ID for the subtask', example: 'b2c3d4e5-6f7a-8b9c-0d1e-234567890abc' })
  @IsUUID('4')
  @IsOptional()
  statusId?: string;
}
