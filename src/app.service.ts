import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return '\n /api use kro swagger api documentation k liye';
  }
}
