import { IsEnum, IsUUID } from 'class-validator';
import { WorkspaceMemberRole } from '../../entities/enums';

export class AddMemberDto {
  @IsUUID()
  userId: string;

  @IsEnum(WorkspaceMemberRole)
  role: WorkspaceMemberRole;
}