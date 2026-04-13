import { IsNotEmpty, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReorderStatusDto {
  @ApiProperty({
    description: 'New position for the status. Supports decimal values for gap-based ordering, allowing insertion between existing statuses without renumbering.',
    example: 2.5,
    type: Number,
    minimum: 0,
    examples: {
      'insert-between': {
        summary: 'Insert between positions 2 and 3',
        value: 2.5
      },
      'move-to-start': {
        summary: 'Move to the beginning',
        value: 0.5
      },
      'move-to-end': {
        summary: 'Move to the end (will be renumbered)',
        value: 999
      }
    }
  })
  @IsNumber()
  @IsNotEmpty()
  newPosition!: number;
}
