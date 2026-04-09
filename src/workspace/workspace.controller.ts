import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { WorkspaceService } from './workspace.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkspaceMemberGuard } from './guards/workspace-member.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../entities/user.entity';

@Controller('workspaces')
@UseGuards(JwtAuthGuard)
export class WorkspaceController {
  constructor(private readonly workspaceService: WorkspaceService) {}

  @Post()
  async createWorkspace(
    @CurrentUser() user: User,
    @Body() dto: CreateWorkspaceDto,
  ) {
    return this.workspaceService.createWorkspace(user.id, dto);
  }

  @Get()
  async getUserWorkspaces(@CurrentUser() user: User) {
    return this.workspaceService.getUserWorkspaces(user.id);
  }

  @Post(':workspaceId/members')
  @UseGuards(WorkspaceMemberGuard)
  async addMember(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: User,
    @Body() dto: AddMemberDto,
  ) {
    return this.workspaceService.addMember(workspaceId, user.id, dto);
  }
}