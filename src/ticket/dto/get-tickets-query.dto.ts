import { IsOptional, IsUUID, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TicketStatus } from '../../entities/enums';

export class GetTicketsQueryDto {
  @ApiProperty({ description: 'Project UUID', example: 'd290f1ee-6c54-4b01-90e6-d701748f0851' })
  @IsUUID('4')
  projectId!: string;

  @ApiPropertyOptional({ description: 'Sprint UUID to filter tickets', example: 'a1b2c3d4-5e6f-7a8b-9c0d-123456789abc' })
  @IsUUID('4')
  @IsOptional()
  sprintId?: string;

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
}
