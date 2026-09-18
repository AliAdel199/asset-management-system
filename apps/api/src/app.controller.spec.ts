import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return system information', () => {
      expect(appController.getSystemInfo()).toEqual({
        name: 'Asset Management System',
        description: 'Government asset management and tracking API',
        version: '0.1.0',
        status: 'ok',
      });
    });
  });
});
