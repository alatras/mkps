import { Test, TestingModule } from '@nestjs/testing';
import { AvnTransactionController } from './avn-transaction.controller';

describe('AvnTransactionController', () => {
  let controller: AvnTransactionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AvnTransactionController],
    }).compile();

    controller = module.get<AvnTransactionController>(AvnTransactionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
