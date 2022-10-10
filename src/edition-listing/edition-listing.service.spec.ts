import { Test, TestingModule } from '@nestjs/testing';
import { EditionListingService } from './edition-listing.service';

describe('EditionListingService', () => {
  let service: EditionListingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EditionListingService],
    }).compile();

    service = module.get<EditionListingService>(EditionListingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
