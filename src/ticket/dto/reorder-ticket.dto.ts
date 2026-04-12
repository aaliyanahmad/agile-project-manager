import { IsNumber, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReorderTicketDto {
  @ApiProperty({
    description: 'New position for the ticket (supports decimal values for gap-based ordering)',
    example: 2.5,
    type: Number,
  })
  @IsNumber()
  @IsNotEmpty()
  newPosition!: number;
}
