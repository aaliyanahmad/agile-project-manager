import { Controller, Get, Query, ValidationPipe } from '@nestjs/common';
import { IsString, IsOptional, IsUUID } from 'class-validator';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiOkResponse,
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import { SearchService, SearchResult } from './search.service';

class SearchQueryDto {
  @ApiProperty({ description: 'Search query string' })
  @IsString()
  q: string;

  @ApiPropertyOptional({ description: 'Optional project ID to filter search results' })
  @IsOptional()
  @IsUUID()
  projectId?: string;
}

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({ summary: 'Global search across tickets' })
  @ApiOkResponse({
    description: 'Search results returned successfully',
    schema: {
      example: {
        tickets: [
          {
            id: 'uuid',
            ticketKey: 'PROJ-1',
            title: 'Fix login bug',
            status: 'TODO',
            project: {
              id: 'uuid',
              name: 'Project A',
            },
          },
        ],
      },
    },
  })
  async search(
    @Query(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    query: SearchQueryDto,
  ): Promise<SearchResult> {
    console.log('SearchController.search called with query:', query);
    const { q, projectId } = query;
    return this.searchService.searchTickets(q, projectId);
  }
}