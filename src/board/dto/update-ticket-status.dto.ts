import { IsNotEmpty, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { StatusCategory } from '../../entities/enums';

export class UpdateTicketStatusDto {
  @ApiProperty({ description: 'New ticket status', enum: StatusCategory, example: 'IN_PROGRESS' })
  @IsEnum(StatusCategory)
  @IsNotEmpty()
  status!: StatusCategory;
}
