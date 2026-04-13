import { IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateTicketStatusDto {
  @ApiProperty({ description: 'New status ID for the ticket', example: 'b2c3d4e5-6f7a-8b9c-0d1e-234567890abc' })
  @IsUUID('4')
  @IsNotEmpty()
  statusId!: string;
}
