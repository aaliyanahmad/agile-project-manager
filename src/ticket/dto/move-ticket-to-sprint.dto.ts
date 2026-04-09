import { IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MoveTicketToSprintDto {
  @ApiProperty({ description: 'Sprint UUID to move the ticket into', example: 'uuid-sprint-123' })
  @IsUUID('4')
  @IsNotEmpty()
  sprintId!: string;
}
