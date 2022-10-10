import { Test, TestingModule } from '@nestjs/testing';
import { AvnTransactionService } from './avn-transaction.service';

describe('AvnTransactionService', () => {
  let service: AvnTransactionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AvnTransactionService],
    }).compile();

    service = module.get<AvnTransactionService>(AvnTransactionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
