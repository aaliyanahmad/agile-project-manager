import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';

@Controller()
@ApiTags('App')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Root health check endpoint' })
  @ApiResponse({ status: 200, description: 'Returns the application welcome message.' })
  getHello(): string {
    return this.appService.getHello();
  }
}
