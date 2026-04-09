import { IsOptional, IsString, MinLength, IsEnum, IsUUID, IsArray, ArrayUnique } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TicketPriority, StatusCategory } from '../../entities/enums';

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

  @ApiPropertyOptional({ description: 'New ticket status', enum: StatusCategory })
  @IsEnum(StatusCategory)
  @IsOptional()
  status?: StatusCategory;

  @ApiPropertyOptional({ description: 'Updated ticket priority', enum: TicketPriority })
  @IsEnum(TicketPriority)
  @IsOptional()
  priority?: TicketPriority;

  @ApiPropertyOptional({ description: 'Updated list of assignee UUIDs', type: [String] })
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  @IsOptional()
  assigneeIds?: string[];
}
