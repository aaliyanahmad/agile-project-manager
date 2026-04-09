import { IsEnum, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { WorkspaceMemberRole } from '../../entities/enums';

export class AddMemberDto {
  @ApiProperty({ description: 'User UUID to add to the workspace', example: '8c5d76f4-1234-4f98-8af4-1a2b3c4d5e6f' })
  @IsUUID()
  userId: string;

  @ApiProperty({ description: 'Role assigned to the workspace member', enum: WorkspaceMemberRole })
  @IsEnum(WorkspaceMemberRole)
  role: WorkspaceMemberRole;
}