import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { WorkspaceService } from './workspace.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkspaceMemberGuard } from './guards/workspace-member.guard';
import { PaginationDto } from '../common/dto/pagination.dto';
import { User } from '../entities/user.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('workspaces')
@UseGuards(JwtAuthGuard)
@ApiTags('Workspaces')
@ApiBearerAuth()
export class WorkspaceController {
  constructor(private readonly workspaceService: WorkspaceService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new workspace' })
  @ApiResponse({ status: 201, description: 'Workspace created successfully.' })
  @ApiBody({ type: CreateWorkspaceDto })
  async createWorkspace(
    @CurrentUser() user: User,
    @Body() dto: CreateWorkspaceDto,
  ) {
    return this.workspaceService.createWorkspace(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List workspaces for the authenticated user' })
  @ApiResponse({ status: 200, description: 'Workspace list returned successfully.' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (max 5)' })
  async getUserWorkspaces(
    @CurrentUser() user: User,
    @Query() pagination: PaginationDto,
  ) {
    return this.workspaceService.getUserWorkspaces(user.id, pagination);
  }

  @Post(':workspaceId/members')
  @UseGuards(WorkspaceMemberGuard)
  @ApiOperation({ summary: 'Add a user to a workspace' })
  @ApiResponse({ status: 201, description: 'Workspace member added successfully.' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace UUID' })
  @ApiBody({ type: AddMemberDto })
  async addMember(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: User,
    @Body() dto: AddMemberDto,
  ) {
    return this.workspaceService.addMember(workspaceId, user.id, dto);
  }
}