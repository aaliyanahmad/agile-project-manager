import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkspaceMember } from '../../entities/workspace-member.entity';
import { User } from '../../entities/user.entity';

@Injectable()
export class WorkspaceMemberGuard implements CanActivate {
  constructor(
    @InjectRepository(WorkspaceMember)
    private readonly workspaceMemberRepository: Repository<WorkspaceMember>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user: User = request.user;
    const workspaceId = request.params.workspaceId;

    if (!workspaceId || !user) {
      throw new ForbiddenException('Access denied');
    }

    const member = await this.workspaceMemberRepository.findOne({
      where: {
        workspaceId,
        userId: user.id,
      },
    });

    if (!member) {
      throw new ForbiddenException('You are not a member of this workspace');
    }

    return true;
  }
}