import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getSystemInfo() {
    return {
      name: 'Asset Management System',
      description: 'Government asset management and tracking API',
      version: '0.1.0',
      status: 'ok',
    };
  }
}
